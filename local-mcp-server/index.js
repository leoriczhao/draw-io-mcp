#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import http from 'http';

// ============ State ============
const pendingResults = new Map();
let activeClient = null;  // Current WebSocket client

const COMMAND_TIMEOUT = 30000;
const HTTP_PORT = 3000;

// ============ HTTP + WebSocket Server ============
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        wsConnected: activeClient !== null,
        pendingCommands: pendingResults.size
    });
});

// Keep HTTP endpoints for backward compatibility
app.get('/poll', (req, res) => res.json(null));
app.post('/result', (req, res) => res.json({ received: true }));
app.post('/focus', (req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);

// ============ WebSocket Server ============
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
    console.error('[MCP] WebSocket client connected');
    activeClient = ws;

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'result' && msg.commandId) {
                const pending = pendingResults.get(msg.commandId);
                if (pending) {
                    clearTimeout(pending.timeout);
                    pending.resolve(msg.result);
                    pendingResults.delete(msg.commandId);
                }
            }
        } catch (e) {
            console.error('[MCP] Failed to parse WebSocket message:', e);
        }
    });

    ws.on('close', () => {
        console.error('[MCP] WebSocket client disconnected');
        if (activeClient === ws) {
            activeClient = null;
        }
    });

    ws.on('error', (err) => {
        console.error('[MCP] WebSocket error:', err.message);
    });
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.error(`[MCP] Server on port ${HTTP_PORT} (HTTP + WebSocket)`);
});

// ============ Command Helper ============
function sendCommand(action, params) {
    return new Promise((resolve) => {
        if (!activeClient || activeClient.readyState !== 1) {
            resolve({ success: false, error: 'No WebSocket client connected - is Draw.io open?' });
            return;
        }

        const commandId = uuidv4();
        const cmd = { id: commandId, action, ...params };

        const timeout = setTimeout(() => {
            pendingResults.delete(commandId);
            resolve({ success: false, error: 'Command timeout' });
        }, COMMAND_TIMEOUT);

        pendingResults.set(commandId, { resolve, timeout });

        try {
            activeClient.send(JSON.stringify(cmd));
        } catch (e) {
            clearTimeout(timeout);
            pendingResults.delete(commandId);
            resolve({ success: false, error: 'Failed to send command: ' + e.message });
        }
    });
}

// ============ MCP Server ============
const server = new McpServer({
    name: 'drawio-controller',
    version: '3.0.0'
});

server.tool(
    'execute_script',
    'Execute JavaScript in Draw.io browser context. Use AI_HLP.drawBatch() for batch diagram creation.',
    {
        script: z.string().describe('JavaScript code to execute. AI_HLP object is available with drawBatch(), clear(), autoLayout(), etc.')
    },
    async ({ script }) => {
        const result = await sendCommand('execute_script', { script });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

// ============ Start ============
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Draw.io Controller v3 (WebSocket) ready');
}

main().catch((err) => {
    console.error('[MCP] Fatal error:', err);
    process.exit(1);
});
