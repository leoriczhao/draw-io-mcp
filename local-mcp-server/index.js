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
        res.json(cmd);
    } else {
        res.json(null);
    }
});

app.post('/result', (req, res) => {
    const { commandId, success, error, ...data } = req.body;
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
    version: '1.0.0'
});

server.tool(
    'add_rect',
    'Add a rectangle shape to the canvas. Returns the cell ID for later reference (e.g., connecting edges).',
    {
        x: z.number().describe('X coordinate (pixels from left)'),
        y: z.number().describe('Y coordinate (pixels from top)'),
        width: z.number().describe('Width in pixels'),
        height: z.number().describe('Height in pixels'),
        label: z.string().describe('Text displayed inside the rectangle'),
        style: z.string().optional().describe('mxGraph style string, e.g. "rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf"')
    },
    async ({ x, y, width, height, label, style }) => {
        const result = await enqueueCommand('add_rect', { x, y, width, height, label, style: style || '' });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'add_edge',
    'Connect two shapes with an arrow/line. Use cell IDs returned from add_rect.',
    {
        sourceId: z.string().describe('ID of the source cell (where arrow starts)'),
        targetId: z.string().describe('ID of the target cell (where arrow points)'),
        label: z.string().optional().describe('Text label on the edge')
    },
    async ({ sourceId, targetId, label }) => {
        const result = await enqueueCommand('add_edge', { sourceId, targetId, label: label || '' });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'set_style',
    'Modify visual style of an existing cell (color, border, etc.)',
    {
        cellId: z.string().describe('ID of the cell to modify'),
        key: z.string().describe('Style property: fillColor, strokeColor, fontColor, fontSize, rounded, etc.'),
        value: z.string().describe('Property value, e.g. "#ff0000" for colors, "1" for boolean')
    },
    async ({ cellId, key, value }) => {
        const result = await enqueueCommand('set_style', { cellId, key, value });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'get_selection',
    'Get currently selected cells in the diagram. Useful for inspecting user selection.',
    {},
    async () => {
        const result = await enqueueCommand('get_selection', {});
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'execute_raw_script',
    `Execute JavaScript code directly in Draw.io browser context.
Available variables:
- graph: mxGraph instance (bindGraphProperties, insertVertex, insertEdge, getSelectionCells, etc.)
- model: mxGraphModel (getCell, beginUpdate/endUpdate, etc.)
- ui: EditorUi (showDialog, sidebar, menus, etc.)
- editor: Editor instance

Example: "graph.insertVertex(graph.getDefaultParent(), null, 'Hello', 100, 100, 80, 40)"
Return value of the script will be included in the response.`,
    {
        script: z.string().describe('JavaScript code to execute. Last expression value is returned.')
    },
    async ({ script }) => {
        const result = await enqueueCommand('execute_raw_script', { script });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'clear_diagram',
    'Remove all shapes and edges from the canvas. Use with caution.',
    {},
    async () => {
        const result = await enqueueCommand('clear_diagram', {});
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);

server.tool(
    'get_all_cells',
    'Get list of all cells (shapes and edges) in the diagram with their properties.',
    {},
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
