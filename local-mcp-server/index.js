#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// ============ State ============
const commandQueue = [];           // FIFO command queue
const pendingResults = new Map();  // commandId -> { resolve, reject, timeout }
let activeSessionId = null;        // Current active tab

const COMMAND_TIMEOUT = 10000;     // 10 seconds
const HTTP_PORT = 3000;

// ============ HTTP Server (for browser plugin) ============
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', queueLength: commandQueue.length });
});

// Plugin polls for commands
app.get('/poll', (req, res) => {
    if (commandQueue.length > 0) {
        const cmd = commandQueue.shift();
        console.error(`[Poll] ${cmd.action} (${cmd.id})`);
        res.json(cmd);
    } else {
        res.json(null);
    }
});

// Plugin returns execution result
app.post('/result', (req, res) => {
    const { commandId, success, error, ...data } = req.body;
    console.error(`[Result] ${commandId}: ${success ? 'OK' : 'FAIL'}`);

    const pending = pendingResults.get(commandId);
    if (pending) {
        clearTimeout(pending.timeout);
        if (success) {
            pending.resolve({ success: true, ...data });
        } else {
            pending.resolve({ success: false, error: error || 'Unknown error' });
        }
        pendingResults.delete(commandId);
    }

    res.json({ received: true });
});

// Focus handler - track which tab is active
app.post('/focus', (req, res) => {
    const { sessionId, filename } = req.body;
    activeSessionId = sessionId;
    console.error(`[Focus] ${filename || 'unknown'}`);
    res.json({ ok: true });
});

// Start HTTP server - bind to 0.0.0.0 for WSL/Docker access
app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.error(`[HTTP] Listening on 0.0.0.0:${HTTP_PORT}`);
});

// ============ Command Execution Helper ============
function enqueueCommand(action, params) {
    return new Promise((resolve, reject) => {
        const commandId = uuidv4();
        const cmd = { id: commandId, action, ...params };

        // Set timeout
        const timeout = setTimeout(() => {
            pendingResults.delete(commandId);
            console.error(`[Timeout] ${action} (${commandId})`);
            resolve({ success: false, error: 'Command timeout - is Draw.io plugin running?' });
        }, COMMAND_TIMEOUT);

        pendingResults.set(commandId, { resolve, reject, timeout });
        commandQueue.push(cmd);

        console.error(`[Queue] ${action} (${commandId})`);
    });
}

// ============ MCP Server ============
const server = new McpServer({
    name: 'drawio-controller',
    version: '1.0.0'
});

// Tool: add_rect
server.tool(
    'add_rect',
    {
        x: { type: 'number', description: 'X position' },
        y: { type: 'number', description: 'Y position' },
        width: { type: 'number', description: 'Width of the rectangle' },
        height: { type: 'number', description: 'Height of the rectangle' },
        label: { type: 'string', description: 'Text label inside the rectangle' },
        style: { type: 'string', description: 'mxGraph style string (optional)' }
    },
    async ({ x, y, width, height, label, style }) => {
        const result = await enqueueCommand('add_rect', { x, y, width, height, label, style: style || '' });
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
        };
    }
);

// Tool: add_edge
server.tool(
    'add_edge',
    {
        sourceId: { type: 'string', description: 'ID of the source cell' },
        targetId: { type: 'string', description: 'ID of the target cell' },
        label: { type: 'string', description: 'Edge label (optional)' }
    },
    async ({ sourceId, targetId, label }) => {
        const result = await enqueueCommand('add_edge', { sourceId, targetId, label: label || '' });
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
        };
    }
);

// Tool: set_style
server.tool(
    'set_style',
    {
        cellId: { type: 'string', description: 'ID of the cell to modify' },
        key: { type: 'string', description: 'Style property name (e.g., fillColor, strokeColor)' },
        value: { type: 'string', description: 'Style property value' }
    },
    async ({ cellId, key, value }) => {
        const result = await enqueueCommand('set_style', { cellId, key, value });
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
        };
    }
);

// Tool: get_selection
server.tool(
    'get_selection',
    {},
    async () => {
        const result = await enqueueCommand('get_selection', {});
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
        };
    }
);

// Tool: execute_raw_script
server.tool(
    'execute_raw_script',
    {
        script: { type: 'string', description: 'JavaScript code to execute. The "graph" variable is available.' }
    },
    async ({ script }) => {
        const result = await enqueueCommand('execute_raw_script', { script });
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
        };
    }
);

// Tool: clear_diagram
server.tool(
    'clear_diagram',
    {},
    async () => {
        const result = await enqueueCommand('clear_diagram', {});
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
        };
    }
);

// Tool: get_all_cells
server.tool(
    'get_all_cells',
    {},
    async () => {
        const result = await enqueueCommand('get_all_cells', {});
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }]
        };
    }
);

// ============ Start MCP Server ============
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[MCP] Draw.io Controller ready');
}

main().catch(console.error);
