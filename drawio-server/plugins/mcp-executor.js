/**
 * Draw.io MCP Executor Plugin v3
 *
 * WebSocket-based architecture with read-only AI_HLP helpers.
 * Usage: Add ?mcp=http://localhost:3000 to specify MCP server address
 */
Draw.loadPlugin(function(ui) {
    'use strict';

    if (window._mcpPluginLoaded) return;
    window._mcpPluginLoaded = true;

    const urlParams = new URLSearchParams(window.location.search);
    const MCP_SERVER = urlParams.get('mcp') || 'http://localhost:3000';
    const WS_URL = MCP_SERVER.replace(/^http/, 'ws');
    const RECONNECT_INTERVAL = 3000;

    function getGraph() { return ui.editor.graph; }

    // ============ AI_HLP Read-Only Helpers ============
    window.AI_HLP = {
        // ========== Query ==========
        getCanvasInfo: function() {
            const graph = getGraph();
            const parent = graph.getDefaultParent();
            const cells = graph.getChildCells(parent, true, true);
            return {
                pageCount: ui.pages ? ui.pages.length : 1,
                currentPageIndex: ui.pages ? ui.pages.indexOf(ui.currentPage) : 0,
                currentPageName: ui.currentPage ? ui.currentPage.getName() : 'Page-1',
                cellCount: cells.length
            };
        },

        getAllCells: function() {
            const graph = getGraph();
            const parent = graph.getDefaultParent();
            const cells = graph.getChildCells(parent, true, true);
            return cells.map(c => ({
                id: c.id,
                label: c.value || '',
                type: c.vertex ? 'vertex' : 'edge',
                geometry: c.geometry ? {
                    x: c.geometry.x, y: c.geometry.y,
                    w: c.geometry.width, h: c.geometry.height
                } : null
            }));
        },

        getSelection: function() {
            const cells = getGraph().getSelectionCells();
            return cells.map(c => ({
                id: c.id,
                label: c.value || '',
                type: c.vertex ? 'vertex' : 'edge'
            }));
        },

        // ========== Export ==========
        exportSvg: function() {
            const graph = getGraph();
            const svgRoot = graph.getSvg();
            const serializer = new XMLSerializer();
            return serializer.serializeToString(svgRoot);
        },

        exportPng: function(scale) {
            // Note: Full PNG export requires async operations
            // This returns SVG data URI as fallback
            const svg = this.exportSvg();
            return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        },

        getXml: function() {
            return mxUtils.getXml(ui.editor.getGraphXml());
        }
    };

    // ============ Command Executor (Simplified) ============
    function executeCommand(cmd) {
        const graph = getGraph();
        const model = graph.getModel();

        // Only handle execute_script now
        if (cmd.action === 'execute_script' || cmd.action === 'execute_raw_script') {
            if (!cmd.script) {
                return { success: false, error: 'Missing script parameter' };
            }
            try {
                const fn = new Function('graph', 'ui', 'editor', 'model', 'AI_HLP', cmd.script);
                const result = fn(graph, ui, ui.editor, model, window.AI_HLP);
                return { success: true, result };
            } catch (e) {
                console.error('[MCP Plugin] Script error:', e);
                return { success: false, error: e.message };
            }
        }

        return { success: false, error: `Unknown action: ${cmd.action}` };
    }

    // Expose for debugging
    window._mcp = {
        get ui() { return ui; },
        get graph() { return getGraph(); },
        executeCommand
    };

    // ============ Status Bar ============
    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = `
        position: fixed; top: 10px; right: 10px;
        background: rgba(0,0,0,0.8); color: white;
        padding: 8px 12px; border-radius: 6px;
        font: 12px -apple-system, sans-serif;
        z-index: 9999; display: flex; align-items: center; gap: 8px;
    `;
    const statusDot = document.createElement('span');
    statusDot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:#ff4444';
    const statusText = document.createElement('span');
    statusText.textContent = 'MCP: Disconnected';
    statusContainer.append(statusDot, statusText);
    document.body.appendChild(statusContainer);

    let isConnected = false;
    let currentFilename = 'Untitled';

    function updateStatus(connected) {
        statusDot.style.background = connected ? '#44ff44' : '#ff4444';
        statusText.textContent = connected ? `MCP: ${currentFilename}` : 'MCP: Disconnected';
    }

    // ============ WebSocket Connection ============
    let ws = null;
    let reconnectTimer = null;

    function connect() {
        if (ws && ws.readyState === WebSocket.OPEN) return;

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            console.error('[MCP Plugin] WebSocket creation failed:', e);
            scheduleReconnect();
            return;
        }

        ws.onopen = () => {
            console.log('[MCP Plugin] WebSocket connected');
            isConnected = true;
            updateStatus(true);
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const cmd = JSON.parse(event.data);
                if (cmd?.action) {
                    const result = executeCommand(cmd);
                    ws.send(JSON.stringify({
                        type: 'result',
                        commandId: cmd.id,
                        result: result
                    }));
                }
            } catch (e) {
                console.error('[MCP Plugin] Message handling error:', e);
            }
        };

        ws.onclose = () => {
            console.log('[MCP Plugin] WebSocket disconnected');
            isConnected = false;
            updateStatus(false);
            ws = null;
            scheduleReconnect();
        };

        ws.onerror = (err) => {
            console.error('[MCP Plugin] WebSocket error');
            // onclose will be called after onerror
        };
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, RECONNECT_INTERVAL);
    }

    // Start connection
    connect();

    // ============ Focus Tracking ============
    function updateFilename() {
        try { currentFilename = ui.editor.getOrCreateFilename() || 'Untitled'; } catch(e) {}
        if (isConnected) updateStatus(true);
    }

    window.addEventListener('focus', updateFilename);
    setTimeout(updateFilename, 1000);

    console.log('[MCP Plugin v3] Loaded with WebSocket + AI_HLP read-only helpers');
});
