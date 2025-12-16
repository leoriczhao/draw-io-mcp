#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// ============ State ============
const commandQueue = [];
const pendingResults = new Map();
let activeSessionId = null;

const COMMAND_TIMEOUT = 10000;
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
        const cmd = commandQueue.shift();
        console.error(`[Poll] ${cmd.action} (${cmd.id})`);
        res.json(cmd);
    } else {
        res.json(null);
    }
});

app.post('/result', (req, res) => {
    const { commandId, success, error, ...data } = req.body;
    console.error(`[Result] ${commandId}: ${success ? 'OK' : 'FAIL'}`);
    const pending = pendingResults.get(commandId);
    if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(success ? { success: true, ...data } : { success: false, error: error || 'Unknown error' });
        pendingResults.delete(commandId);
    }
    res.json({ received: true });
});

app.post('/focus', (req, res) => {
    const { sessionId, filename } = req.body;
    activeSessionId = sessionId;
    console.error(`[Focus] ${filename || 'unknown'}`);
    res.json({ ok: true });
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.error(`[HTTP] Listening on 0.0.0.0:${HTTP_PORT}`);
});

// ============ Command Helper ============
function enqueueCommand(action, params) {
    return new Promise((resolve) => {
        const commandId = uuidv4();
        const cmd = { id: commandId, action, ...params };
        const timeout = setTimeout(() => {
            pendingResults.delete(commandId);
            console.error(`[Timeout] ${action} (${commandId})`);
            resolve({ success: false, error: 'Command timeout - is Draw.io plugin running?' });
        }, COMMAND_TIMEOUT);
        pendingResults.set(commandId, { resolve, timeout });
        commandQueue.push(cmd);
        console.error(`[Queue] ${action} (${commandId})`);
    });
}

// ============ MCP Server ============
const server = new McpServer({
    name: 'drawio-controller',
    version: '1.0.0'
});

server.tool(
    'add_rect',
    'Add a rectangle to the Draw.io canvas',
    {
        type: 'object',
        properties: {
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            width: { type: 'number', description: 'Width' },
            height: { type: 'number', description: 'Height' },
            label: { type: 'string', description: 'Text label' },
            style: { type: 'string', description: 'mxGraph style string' }
        },
        required: ['x', 'y', 'width', 'height', 'label']
    },
    async ({ x, y, width, height, label, style }) => {
        const result = await enqueueCommand('add_rect', { x, y, width, height, label, style: style || '' });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'add_edge',
    'Add an edge between two cells',
    {
        type: 'object',
        properties: {
            sourceId: { type: 'string', description: 'Source cell ID' },
            targetId: { type: 'string', description: 'Target cell ID' },
            label: { type: 'string', description: 'Edge label' }
        },
        required: ['sourceId', 'targetId']
    },
    async ({ sourceId, targetId, label }) => {
        const result = await enqueueCommand('add_edge', { sourceId, targetId, label: label || '' });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'set_style',
    'Modify cell style',
    {
        type: 'object',
        properties: {
            cellId: { type: 'string', description: 'Cell ID' },
            key: { type: 'string', description: 'Style property name' },
            value: { type: 'string', description: 'Style value' }
        },
        required: ['cellId', 'key', 'value']
    },
    async ({ cellId, key, value }) => {
        const result = await enqueueCommand('set_style', { cellId, key, value });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'get_selection',
    'Get selected cells',
    { type: 'object', properties: {} },
    async () => {
        const result = await enqueueCommand('get_selection', {});
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'execute_raw_script',
    'Execute JavaScript in Draw.io context',
    {
        type: 'object',
        properties: {
            script: { type: 'string', description: 'JavaScript code. Variable "graph" is available.' }
        },
        required: ['script']
    },
    async (params) => {
        console.error('[DEBUG execute_raw_script] params:', JSON.stringify(params));
        const script = params.script;
        const result = await enqueueCommand('execute_raw_script', { script });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'clear_diagram',
    'Clear all cells',
    { type: 'object', properties: {} },
    async () => {
        const result = await enqueueCommand('clear_diagram', {});
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'get_all_cells',
    'Get all cells in diagram',
    { type: 'object', properties: {} },
    async () => {
        const result = await enqueueCommand('get_all_cells', {});
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

// ============ Start ============
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Draw.io Controller ready');
}

main().catch((err) => {
    console.error('[MCP] Fatal error:', err);
    process.exit(1);
});
