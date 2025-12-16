/**
 * Draw.io MCP Executor Plugin
 *
 * This plugin connects Draw.io to the MCP Controller server,
 * enabling Claude to directly manipulate the canvas via mxGraph API.
 *
 * Usage: Add ?mcp=http://localhost:3000 to specify MCP server address
 */
Draw.loadPlugin(function(ui) {
    'use strict';

    // Prevent multiple instances
    if (window._mcpPluginLoaded) {
        console.log('[MCP Plugin] Already loaded, skipping duplicate');
        return;
    }
    window._mcpPluginLoaded = true;

    // Read MCP server address from URL parameter, default to localhost:3000
    const urlParams = new URLSearchParams(window.location.search);
    const MCP_SERVER = urlParams.get('mcp') || 'http://localhost:3000';
    const POLL_INTERVAL = 500;

    // 直接使用 ui.editor.graph,不要缓存
    function getGraph() {
        return ui.editor.graph;
    }

    // Expose for debugging
    window._mcp = {
        get ui() { return ui; },
        get editor() { return ui.editor; },
        get graph() { return getGraph(); }
    };
    console.log('[MCP Plugin] Exposed window._mcp for debugging');

    // Generate unique session ID for this tab
    const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
    let currentFilename = 'Untitled';

    // ============ Status Bar UI ============
    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;

    const statusDot = document.createElement('span');
    statusDot.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ff4444;
        display: inline-block;
    `;

    const statusText = document.createElement('span');
    statusText.textContent = 'MCP: Disconnected';

    statusContainer.appendChild(statusDot);
    statusContainer.appendChild(statusText);
    document.body.appendChild(statusContainer);

    function updateStatus(connected, message) {
        statusDot.style.background = connected ? '#44ff44' : '#ff4444';
        if (message) {
            statusText.textContent = message;
        } else if (connected) {
            statusText.textContent = `MCP: ${currentFilename}`;
        } else {
            statusText.textContent = 'MCP: Disconnected';
        }
    }

    // ============ Command Executor ============
    function executeCommand(cmd) {
        // 每次都动态获取 graph
        const graph = getGraph();
        const model = graph.getModel();

        if (cmd.action === 'execute_raw_script') {
            if (!cmd.script) {
                console.error('[MCP Plugin] execute_raw_script: missing script, cmd:', JSON.stringify(cmd));
                return { success: false, error: 'Missing script parameter' };
            }
            try {
                const fn = new Function('graph', 'ui', 'editor', 'model', cmd.script);
                const scriptResult = fn(graph, ui, ui.editor, model);
                graph.refresh();
                return { success: true, result: scriptResult };
            } catch (e) {
                console.error('[MCP Plugin] Script error:', e);
                return { success: false, error: `Script error: ${e.message}` };
            }
        }

        if (cmd.action === 'get_selection') {
            const cells = graph.getSelectionCells();
            const result = cells.map(c => ({
                id: c.id,
                value: c.value || '',
                isVertex: c.vertex || false,
                isEdge: c.edge || false
            }));
            return { success: true, cells: result };
        }

        if (cmd.action === 'get_all_cells') {
            const parent = graph.getDefaultParent();
            const cells = graph.getChildCells(parent, true, true);
            const result = cells.map(c => ({
                id: c.id,
                value: c.value || '',
                isVertex: c.vertex || false,
                isEdge: c.edge || false,
                geometry: c.geometry ? {
                    x: c.geometry.x,
                    y: c.geometry.y,
                    width: c.geometry.width,
                    height: c.geometry.height
                } : null
            }));
            return { success: true, cells: result };
        }

        // Commands that need transaction wrapping
        model.beginUpdate();
        try {
            switch (cmd.action) {
                case 'add_rect': {
                    const parent = graph.getDefaultParent();
                    const cell = graph.insertVertex(
                        parent, null, cmd.label || '',
                        cmd.x || 0, cmd.y || 0,
                        cmd.width || 120, cmd.height || 60,
                        cmd.style || ''
                    );
                    return { success: true, id: cell.id };
                }

                case 'add_edge': {
                    const parent = graph.getDefaultParent();
                    const source = model.getCell(cmd.sourceId);
                    const target = model.getCell(cmd.targetId);
                    if (!source) return { success: false, error: `Source not found: ${cmd.sourceId}` };
                    if (!target) return { success: false, error: `Target not found: ${cmd.targetId}` };
                    const edge = graph.insertEdge(parent, null, cmd.label || '', source, target);
                    return { success: true, id: edge.id };
                }

                case 'set_style': {
                    const cell = model.getCell(cmd.cellId);
                    if (!cell) return { success: false, error: `Cell not found: ${cmd.cellId}` };
                    graph.setCellStyles(cmd.key, cmd.value, [cell]);
                    return { success: true };
                }

                case 'clear_diagram': {
                    const parent = graph.getDefaultParent();
                    const cells = graph.getChildCells(parent, true, true);
                    graph.removeCells(cells);
                    return { success: true, removed: cells.length };
                }

                default:
                    return { success: false, error: `Unknown action: ${cmd.action}` };
            }
        } catch (e) {
            return { success: false, error: e.message };
        } finally {
            model.endUpdate();
        }
    }

    // Expose executeCommand for debugging
    window._mcp.executeCommand = executeCommand;

    // ============ Polling Loop ============
    let isConnected = false;
    let consecutiveErrors = 0;

    async function poll() {
        try {
            const response = await fetch(`${MCP_SERVER}/poll`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const cmd = await response.json();

            if (!isConnected) {
                isConnected = true;
                updateStatus(true);
                console.log('[MCP Plugin] Connected to server');
            }
            consecutiveErrors = 0;

            if (cmd && cmd.action) {
                console.log(`[MCP Plugin] Executing: ${cmd.action}`, cmd);
                const result = window._mcp.executeCommand(cmd);
                await fetch(`${MCP_SERVER}/result`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commandId: cmd.id, ...result })
                });
                console.log(`[MCP Plugin] Result:`, result);
            }
        } catch (e) {
            consecutiveErrors++;
            if (consecutiveErrors >= 3 && isConnected) {
                isConnected = false;
                updateStatus(false, 'Disconnected');
                console.log('[MCP Plugin] Lost connection to server');
            }
        }
    }

    // Start polling
    setInterval(poll, POLL_INTERVAL);

    // ============ Focus Tracking ============
    function getFilename() {
        try {
            return ui.editor.getOrCreateFilename ? ui.editor.getOrCreateFilename() : 'Untitled';
        } catch (e) {
            return 'Untitled';
        }
    }

    function sendFocus() {
        currentFilename = getFilename();
        if (isConnected) {
            updateStatus(true);
        }
        fetch(`${MCP_SERVER}/focus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, filename: currentFilename })
        }).catch(() => {});
    }

    // Update filename periodically and on focus
    window.addEventListener('focus', sendFocus);
    setInterval(() => {
        const newFilename = getFilename();
        if (newFilename !== currentFilename) {
            currentFilename = newFilename;
            if (isConnected) updateStatus(true);
        }
    }, 2000);
    setTimeout(sendFocus, 1000);

    console.log('[MCP Plugin] Draw.io MCP Executor loaded');
    console.log('[MCP Plugin] Session ID:', sessionId);
    console.log('[MCP Plugin] MCP Server:', MCP_SERVER);
});
