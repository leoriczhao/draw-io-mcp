#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer } from 'ws';
import http from 'http';
import { layoutWithConstraints } from './lib/elk-layout.js';
import { validateJson, jsonToMxScript } from './lib/json-converter.js';

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
    version: '4.0.0'
});

server.tool(
    'execute_script',
    'Execute JavaScript in Draw.io. IMPORTANT: Load the "drawio" skill first to get correct API usage.',
    {
        script: z.string().describe('JavaScript code to execute. AI_HLP provides read-only helpers like getAllCells(), getSelection(), exportSvg(), getXml(). Use native mxGraph APIs for drawing.')
    },
    async ({ script }) => {
        const result = await sendCommand('execute_script', { script });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'get_diagram',
    'Get current diagram as unified JSON format. Returns nodes with positions and edges with connections. All nodes are marked fixed:true.',
    {},
    async () => {
        const result = await sendCommand('get_diagram_json', {});
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'update_diagram',
    'Update diagram with unified JSON format. Nodes with fixed:false get automatic layout via ELK. Edges are automatically routed.',
    {
        diagram: z.string().describe('JSON string with nodes, edges, and layout options. Nodes: {id, label, x?, y?, width?, height?, fixed, style?}. Edges: {id?, source, target, label?, style?}. Layout: {algorithm?, direction?, nodeSpacing?, layerSpacing?}'),
        clearCanvas: z.boolean().optional().describe('Whether to clear existing content before applying. Default: true')
    },
    async ({ diagram, clearCanvas = true }) => {
        try {
            const json = JSON.parse(diagram);
            
            const validation = validateJson(json);
            if (!validation.valid) {
                return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Validation failed: ' + validation.errors.join(', ') }) }] };
            }

            const layoutedDiagram = await layoutWithConstraints(json);
            
            const result = await sendCommand('apply_diagram_json', { 
                diagram: layoutedDiagram,
                clearCanvas 
            });
            
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (e) {
            return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: e.message }) }] };
        }
    }
);

// ============ Start ============
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Draw.io Controller v4 (WebSocket + ELK Layout) ready');
}

main().catch((err) => {
    console.error('[MCP] Fatal error:', err);
    process.exit(1);
});
