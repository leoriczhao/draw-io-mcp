#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// ============ State ============
const commandQueue = [];
const pendingResults = new Map();

const COMMAND_TIMEOUT = 30000;  // 30s for batch operations
const HTTP_PORT = 3000;

// ============ HTTP Server ============
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', queueLength: commandQueue.length });
});

app.get('/poll', (req, res) => {
    if (commandQueue.length > 0) {
        res.json(commandQueue.shift());
    } else {
        res.json(null);
    }
});

app.post('/result', (req, res) => {
    const { commandId, ...result } = req.body;
    const pending = pendingResults.get(commandId);
    if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(result);
        pendingResults.delete(commandId);
    }
    res.json({ received: true });
});

app.post('/focus', (req, res) => {
    res.json({ ok: true });
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.error(`[MCP] HTTP server on port ${HTTP_PORT}`);
});

// ============ Command Helper ============
function enqueueCommand(action, params) {
    return new Promise((resolve) => {
        const commandId = uuidv4();
        const cmd = { id: commandId, action, ...params };
        const timeout = setTimeout(() => {
            pendingResults.delete(commandId);
            resolve({ success: false, error: 'Command timeout - is Draw.io plugin running?' });
        }, COMMAND_TIMEOUT);
        pendingResults.set(commandId, { resolve, timeout });
        commandQueue.push(cmd);
    });
}

// ============ MCP Server ============
const server = new McpServer({
    name: 'drawio-controller',
    version: '2.0.0'
});

// Single tool: execute_script
server.tool(
    'execute_script',
    'Execute JavaScript in Draw.io browser context. Use AI_HLP.drawBatch() for batch diagram creation.',
    {
        script: z.string().describe('JavaScript code to execute. AI_HLP object is available with drawBatch(), clear(), autoLayout(), etc.')
    },
    async ({ script }) => {
        const result = await enqueueCommand('execute_script', { script });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

// ============ Start ============
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Draw.io Controller v2 ready');
}

main().catch((err) => {
    console.error('[MCP] Fatal error:', err);
    process.exit(1);
});
