/**
 * Draw.io MCP Executor Plugin v2
 *
 * Batch-processing architecture with AI_HLP standard library.
 * Usage: Add ?mcp=http://localhost:3000 to specify MCP server address
 */
Draw.loadPlugin(function(ui) {
    'use strict';

    if (window._mcpPluginLoaded) return;
    window._mcpPluginLoaded = true;

    const urlParams = new URLSearchParams(window.location.search);
    const MCP_SERVER = urlParams.get('mcp') || 'http://localhost:3000';
    const POLL_INTERVAL = 500;

    function getGraph() { return ui.editor.graph; }

    // ============ AI_HLP Standard Library ============
    const SHAPE_STYLES = {
        rect: '',
        rounded: 'rounded=1',
        ellipse: 'ellipse',
        rhombus: 'rhombus',
        parallelogram: 'shape=parallelogram',
        cylinder: 'shape=cylinder3;whiteSpace=wrap;boundedLbl=1',
        actor: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top',
        note: 'shape=note',
        cloud: 'ellipse;shape=cloud'
    };

    window.AI_HLP = {
        // ========== Core Drawing ==========
        drawBatch: function(data) {
            const graph = getGraph();
            const parent = graph.getDefaultParent();
            const model = graph.getModel();
            const cellMap = {};
            let edgesCreated = 0;

            model.beginUpdate();
            try {
                // Create nodes
                (data.nodes || []).forEach(n => {
                    const shapeStyle = SHAPE_STYLES[n.shape] || SHAPE_STYLES.rect;
                    const style = shapeStyle + (n.style ? ';' + n.style : '');
                    const cell = graph.insertVertex(
                        parent, n.id, n.label || '',
                        n.x || 0, n.y || 0,
                        n.w || 120, n.h || 60,
                        style
                    );
                    cellMap[n.id] = cell;
                });

                // Create edges
                (data.edges || []).forEach(e => {
                    const src = cellMap[e.source];
                    const tgt = cellMap[e.target];
                    if (src && tgt) {
                        graph.insertEdge(parent, null, e.label || '', src, tgt, e.style || '');
                        edgesCreated++;
                    }
                });

                // Auto layout - only for newly created cells
                if (data.layout) {
                    const newCells = Object.values(cellMap);
                    this.autoLayout(data.layout, null, newCells);
                }
            } finally {
                model.endUpdate();
            }

            graph.fit();
            return { nodesCreated: Object.keys(cellMap).length, edgesCreated };
        },

        clear: function() {
            const graph = getGraph();
            const parent = graph.getDefaultParent();
            const model = graph.getModel();
            model.beginUpdate();
            try {
                const cells = graph.getChildCells(parent, true, true);
                graph.removeCells(cells);
            } finally {
                model.endUpdate();
            }
            return { success: true };
        },

        // ========== Layout ==========
        autoLayout: function(type, options, targetCells) {
            const graph = getGraph();
            const parent = graph.getDefaultParent();
            let layout;

            switch (type) {
                case 'tree':
                    layout = new mxCompactTreeLayout(graph, false);
                    layout.edgeRouting = false;
                    layout.levelDistance = 30;
                    break;
                case 'organic':
                    layout = new mxFastOrganicLayout(graph);
                    layout.forceConstant = 80;
                    break;
                case 'circle':
                    layout = new mxCircleLayout(graph);
                    break;
                case 'radial':
                    layout = new mxRadialTreeLayout(graph);
                    break;
                case 'hierarchical':
                default:
                    layout = new mxHierarchicalLayout(graph);
                    if (options?.direction) {
                        const dirs = { north: 1, south: 2, east: 3, west: 4 };
                        layout.orientation = dirs[options.direction] || 1;
                    }
                    break;
            }

            if (options?.spacing) layout.intraCellSpacing = options.spacing;

            // If targetCells provided, only layout those cells
            if (targetCells && targetCells.length > 0) {
                const targetSet = new Set(targetCells.map(c => c.id));
                const originalIsVertexIgnored = layout.isVertexIgnored.bind(layout);
                layout.isVertexIgnored = function(vertex) {
                    if (originalIsVertexIgnored(vertex)) return true;
                    return !targetSet.has(vertex.id);
                };
            }

            graph.getModel().beginUpdate();
            try {
                layout.execute(parent);
            } finally {
                graph.getModel().endUpdate();
            }
            return { success: true, type };
        },

        // ========== Query ==========
        getCanvasInfo: function() {
            const graph = getGraph();
            const parent = graph.getDefaultParent();
            const cells = graph.getChildCells(parent, true, true);
            return {
                currentPageIndex: ui.pages ? ui.pages.indexOf(ui.currentPage) : 0,
                currentPageName: ui.currentPage ? ui.currentPage.getName() : 'Page-1',
                cellCount: cells.length,
                pages: ui.pages ? ui.pages.map((p, i) => ({
                    index: i,
                    name: p.getName(),
                    isCurrent: p === ui.currentPage
                })) : [{ index: 0, name: 'Page-1', isCurrent: true }]
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

        // ========== Page Operations ==========
        addPage: function(name) {
            if (ui.insertPage) {
                const page = ui.insertPage();
                if (name) {
                    // Use RenamePage command to immediately update UI
                    ui.editor.graph.model.execute(new RenamePage(ui, page, name));
                }
                return { success: true, pageIndex: ui.pages.indexOf(page) };
            }
            return { success: false, error: 'Multi-page not supported' };
        },

        switchPage: function(indexOrName) {
            if (!ui.pages) return { success: false, error: 'Multi-page not supported' };
            let page;
            if (typeof indexOrName === 'number') {
                page = ui.pages[indexOrName];
            } else {
                page = ui.pages.find(p => p.getName() === indexOrName);
            }
            if (page) {
                ui.selectPage(page);
                return { success: true };
            }
            return { success: false, error: 'Page not found' };
        },

        renamePage: function(name) {
            if (ui.currentPage && ui.renamePage) {
                ui.renamePage(ui.currentPage, name);
                return { success: true };
            }
            return { success: false, error: 'Cannot rename page' };
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
        },

        // ========== View Control ==========
        fit: function() {
            getGraph().fit();
            return { success: true };
        },

        center: function() {
            getGraph().center();
            return { success: true };
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

    // ============ Polling ============
    let consecutiveErrors = 0;

    async function poll() {
        try {
            const res = await fetch(`${MCP_SERVER}/poll`);
            if (!res.ok) throw new Error();
            const cmd = await res.json();

            if (!isConnected) {
                isConnected = true;
                updateStatus(true);
            }
            consecutiveErrors = 0;

            if (cmd?.action) {
                const result = executeCommand(cmd);
                await fetch(`${MCP_SERVER}/result`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commandId: cmd.id, ...result })
                });
            }
        } catch (e) {
            if (++consecutiveErrors >= 3 && isConnected) {
                isConnected = false;
                updateStatus(false);
            }
        }
    }

    setInterval(poll, POLL_INTERVAL);

    // ============ Focus Tracking ============
    function sendFocus() {
        try { currentFilename = ui.editor.getOrCreateFilename() || 'Untitled'; } catch(e) {}
        if (isConnected) updateStatus(true);
        fetch(`${MCP_SERVER}/focus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: currentFilename })
        }).catch(() => {});
    }

    window.addEventListener('focus', sendFocus);
    setTimeout(sendFocus, 1000);

    console.log('[MCP Plugin v2] Loaded with AI_HLP library');
});
