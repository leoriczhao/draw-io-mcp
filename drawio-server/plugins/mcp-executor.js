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
        },

        // ========== Unified JSON Format ==========
        /**
         * Get diagram as unified JSON format
         * All nodes are marked as fixed: true (preserving current positions)
         */
        getDiagramJson: function() {
            const graph = getGraph();
            const parent = graph.getDefaultParent();
            const cells = graph.getChildCells(parent, true, true);
            
            const nodes = [];
            const edges = [];
            
            function fromHtmlLabel(text) {
                if (!text) return '';
                return String(text).replace(/<br\s*\/?>/gi, '\n');
            }
            
            for (const cell of cells) {
                if (cell.vertex) {
                    nodes.push({
                        id: cell.id,
                        label: fromHtmlLabel(cell.value),
                        x: cell.geometry ? cell.geometry.x : 0,
                        y: cell.geometry ? cell.geometry.y : 0,
                        width: cell.geometry ? cell.geometry.width : 120,
                        height: cell.geometry ? cell.geometry.height : 60,
                        fixed: true,
                        style: cell.style || ''
                    });
                } else if (cell.edge) {
                    edges.push({
                        id: cell.id,
                        source: cell.source ? cell.source.id : null,
                        target: cell.target ? cell.target.id : null,
                        label: fromHtmlLabel(cell.value),
                        style: cell.style || ''
                    });
                }
            }
            
            return {
                nodes,
                edges,
                layout: {
                    algorithm: 'layered',
                    direction: 'DOWN',
                    nodeSpacing: 50,
                    layerSpacing: 80
                }
            };
        },

        // ========== Page Management ==========
        getPages: function() {
            if (!ui.pages) return [{ index: 0, name: 'Page-1', current: true }];
            return ui.pages.map((page, index) => ({
                index,
                name: page.getName(),
                current: page === ui.currentPage
            }));
        },

        getCurrentPage: function() {
            return {
                index: ui.pages ? ui.pages.indexOf(ui.currentPage) : 0,
                name: ui.currentPage ? ui.currentPage.getName() : 'Page-1'
            };
        }
    };

    // ============ Command Executor ============
    function executeCommand(cmd) {
        const graph = getGraph();
        const model = graph.getModel();

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

        if (cmd.action === 'get_diagram_json') {
            try {
                const result = window.AI_HLP.getDiagramJson();
                return { success: true, result };
            } catch (e) {
                console.error('[MCP Plugin] getDiagramJson error:', e);
                return { success: false, error: e.message };
            }
        }

        if (cmd.action === 'apply_diagram_json') {
            if (!cmd.diagram) {
                return { success: false, error: 'Missing diagram parameter' };
            }
            try {
                const diagram = typeof cmd.diagram === 'string' ? JSON.parse(cmd.diagram) : cmd.diagram;
                const parent = graph.getDefaultParent();
                
                model.beginUpdate();
                try {
                    if (cmd.clearCanvas !== false) {
                        const existingCells = graph.getChildCells(parent, true, true);
                        if (existingCells.length > 0) {
                            graph.removeCells(existingCells);
                        }
                    }

                    const nodeMap = {};
                    
                    // Helper to convert all newline variants to <br>
                    function toHtmlLabel(text) {
                        if (!text) return '';
                        return String(text)
                            .replace(/\\\\n/g, '<br>')  // \\n (double escaped)
                            .replace(/\\n/g, '<br>')   // \n (escaped)
                            .replace(/\n/g, '<br>');   // actual newline
                    }

                    // Shape name to mxGraph style mapping (with perimeter for proper edge connection)
                    const SHAPE_STYLES = {
                        // Basic
                        'rectangle': '',
                        'rounded': 'rounded=1;',
                        'ellipse': 'shape=ellipse;perimeter=ellipsePerimeter;',
                        'diamond': 'shape=rhombus;perimeter=rhombusPerimeter;',
                        'triangle': 'shape=triangle;perimeter=trianglePerimeter;',
                        'hexagon': 'shape=hexagon;perimeter=hexagonPerimeter;',
                        'parallelogram': 'shape=parallelogram;perimeter=parallelogramPerimeter;',
                        'trapezoid': 'shape=trapezoid;perimeter=trapezoidPerimeter;',
                        // Flowchart
                        'process': 'shape=process;',
                        'document': 'shape=document;',
                        'manualInput': 'shape=manualInput;',
                        'dataStorage': 'shape=dataStorage;',
                        'delay': 'shape=delay;',
                        'display': 'shape=display;',
                        'internalStorage': 'shape=internalStorage;',
                        'loopLimit': 'shape=loopLimit;',
                        'offPageConnector': 'shape=offPageConnector;',
                        // Database
                        'cylinder': 'shape=cylinder;',
                        'cylinder2': 'shape=cylinder2;',
                        'cylinder3': 'shape=cylinder3;',
                        'datastore': 'shape=datastore;',
                        'cube': 'shape=cube;',
                        // UML
                        'umlActor': 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;',
                        'umlState': 'shape=umlState;',
                        'umlLifeline': 'shape=umlLifeline;perimeter=lifelinePerimeter;',
                        'umlFrame': 'shape=umlFrame;',
                        'umlBoundary': 'shape=umlBoundary;',
                        'umlEntity': 'shape=umlEntity;',
                        'umlControl': 'shape=umlControl;',
                        // Containers
                        'swimlane': 'shape=swimlane;',
                        'folder': 'shape=folder;',
                        'card': 'shape=card;',
                        'note': 'shape=note;',
                        // Special
                        'cloud': 'shape=cloud;',
                        'actor': 'shape=actor;',
                        'step': 'shape=step;perimeter=stepPerimeter;',
                        'plus': 'shape=plus;',
                        'cross': 'shape=cross;',
                        'startState': 'shape=startState;perimeter=ellipsePerimeter;',
                        'endState': 'shape=endState;perimeter=ellipsePerimeter;'
                    };

                    // Color presets
                    const COLOR_PRESETS = {
                        'primary': 'fillColor=#dae8fc;strokeColor=#6c8ebf;',
                        'success': 'fillColor=#d5e8d4;strokeColor=#82b366;',
                        'warning': 'fillColor=#fff2cc;strokeColor=#d6b656;',
                        'error': 'fillColor=#f8cecc;strokeColor=#b85450;',
                        'purple': 'fillColor=#e1d5e7;strokeColor=#9673a6;',
                        'gray': 'fillColor=#f5f5f5;strokeColor=#666666;'
                    };

                    function buildNodeStyle(node) {
                        let style = 'whiteSpace=wrap;html=1;';
                        
                        // Add shape style
                        if (node.shape && SHAPE_STYLES[node.shape]) {
                            style += SHAPE_STYLES[node.shape];
                        } else if (!node.style) {
                            style += 'rounded=1;';
                        }
                        
                        // Add color preset
                        if (node.color && COLOR_PRESETS[node.color]) {
                            style += COLOR_PRESETS[node.color];
                        } else if (!node.style) {
                            style += 'fillColor=#dae8fc;strokeColor=#6c8ebf;';
                        }
                        
                        // Override with custom style if provided
                        if (node.style) {
                            style += node.style;
                        }
                        
                        return style;
                    }

                    for (const node of diagram.nodes || []) {
                        const style = buildNodeStyle(node);
                        const label = toHtmlLabel(node.label);
                        const vertex = graph.insertVertex(
                            parent, node.id, label,
                            node.x, node.y, node.width || 120, node.height || 60,
                            style
                        );
                        nodeMap[node.id] = vertex;
                    }

                    for (const edge of diagram.edges || []) {
                        const source = nodeMap[edge.source];
                        const target = nodeMap[edge.target];
                        if (source && target) {
                            const hasPoints = edge.points && edge.points.length > 0;
                            
                            let baseStyle = hasPoints 
                                ? 'edgeStyle=orthogonalEdgeStyle;rounded=0;'
                                : 'rounded=0;';
                            
                            if (edge.exitX !== undefined) baseStyle += 'exitX=' + edge.exitX + ';';
                            if (edge.exitY !== undefined) baseStyle += 'exitY=' + edge.exitY + ';';
                            if (edge.entryX !== undefined) baseStyle += 'entryX=' + edge.entryX + ';';
                            if (edge.entryY !== undefined) baseStyle += 'entryY=' + edge.entryY + ';';
                            
                            const style = edge.style || baseStyle;
                            const label = toHtmlLabel(edge.label);
                            const edgeCell = graph.insertEdge(
                                parent, edge.id, label,
                                source, target, style
                            );
                            
                            if (hasPoints) {
                                edgeCell.geometry.points = edge.points.map(p => new mxPoint(p.x, p.y));
                            }
                        }
                    }
                } finally {
                    model.endUpdate();
                }
                
                return { success: true, result: 'Diagram applied successfully' };
            } catch (e) {
                console.error('[MCP Plugin] applyDiagramJson error:', e);
                return { success: false, error: e.message };
            }
        }

        if (cmd.action === 'get_pages') {
            try {
                const result = window.AI_HLP.getPages();
                return { success: true, result };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        if (cmd.action === 'create_page') {
            try {
                const pageName = cmd.name || 'New Page';
                const page = ui.insertPage();
                if (page && pageName) {
                    ui.editor.graph.model.execute(new RenamePage(ui, page, pageName));
                }
                return { success: true, result: { name: pageName, index: ui.pages.indexOf(page) } };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        if (cmd.action === 'select_page') {
            try {
                let page = null;
                if (typeof cmd.index === 'number' && ui.pages && ui.pages[cmd.index]) {
                    page = ui.pages[cmd.index];
                } else if (cmd.name && ui.pages) {
                    page = ui.pages.find(p => p.getName() === cmd.name);
                }
                if (page) {
                    ui.selectPage(page);
                    return { success: true, result: { name: page.getName(), index: ui.pages.indexOf(page) } };
                }
                return { success: false, error: 'Page not found' };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }

        if (cmd.action === 'rename_page') {
            try {
                const page = ui.currentPage;
                if (page && cmd.name) {
                    ui.editor.graph.model.execute(new RenamePage(ui, page, cmd.name));
                    return { success: true, result: { name: cmd.name } };
                }
                return { success: false, error: 'No current page or missing name' };
            } catch (e) {
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
