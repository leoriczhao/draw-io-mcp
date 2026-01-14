import { describe, it, expect, beforeEach, vi } from 'vitest';

function createMockMxGraph() {
    const cells = [];
    return {
        getDefaultParent() {
            return { id: 'parent-1' };
        },
        getChildCells(parent, vertices, edges) {
            return cells;
        },
        getSelectionCells() {
            return [];
        },
        getSvg() {
            const parser = new (require('xmldom').DOMParser)();
            return parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'text/xml').documentElement;
        },
        getModel() {
            return {
                beginUpdate() {},
                endUpdate() {}
            };
        },
        insertVertex: vi.fn((parent, id, label, x, y, w, h, style) => ({
            id: id || 'v-' + Math.random(),
            value: label,
            vertex: true,
            geometry: { x, y, width: w, height: h }
        })),
        insertEdge: vi.fn((parent, id, label, source, target, style) => ({
            id: id || 'e-' + Math.random(),
            value: label,
            vertex: false,
            source,
            target
        })),
        _cells: cells,
        _addCell(cell) {
            cells.push(cell);
        }
    };
}

function createMockUi(graph) {
    const currentPage = { getName: () => 'Page-1' };
    const pages = [currentPage];
    return {
        editor: {
            graph,
            getGraphXml() {
                return { xml: '<mxGraphModel></mxGraphModel>' };
            },
            getOrCreateFilename() {
                return 'test-diagram.drawio';
            }
        },
        pages,
        currentPage
    };
}

function createAIHelper(graph, ui) {
    return {
        getCanvasInfo() {
            const parent = graph.getDefaultParent();
            const cells = graph.getChildCells(parent, true, true);
            return {
                pageCount: ui.pages ? ui.pages.length : 1,
                currentPageIndex: ui.pages ? ui.pages.indexOf(ui.currentPage) : 0,
                currentPageName: ui.currentPage ? ui.currentPage.getName() : 'Page-1',
                cellCount: cells.length
            };
        },

        getAllCells() {
            const parent = graph.getDefaultParent();
            const cells = graph.getChildCells(parent, true, true);
            return cells.map(c => ({
                id: c.id,
                label: c.value || '',
                type: c.vertex ? 'vertex' : 'edge',
                geometry: c.geometry ? {
                    x: c.geometry.x,
                    y: c.geometry.y,
                    w: c.geometry.width,
                    h: c.geometry.height
                } : null
            }));
        },

        getSelection() {
            const cells = graph.getSelectionCells();
            return cells.map(c => ({
                id: c.id,
                label: c.value || '',
                type: c.vertex ? 'vertex' : 'edge'
            }));
        },

        getXml() {
            return '<mxGraphModel></mxGraphModel>';
        }
    };
}

function createCommandExecutor(graph, ui, model, AI_HLP) {
    return function executeCommand(cmd) {
        if (cmd.action === 'execute_script' || cmd.action === 'execute_raw_script') {
            if (!cmd.script) {
                return { success: false, error: 'Missing script parameter' };
            }
            try {
                const fn = new Function('graph', 'ui', 'editor', 'model', 'AI_HLP', cmd.script);
                const result = fn(graph, ui, ui.editor, model, AI_HLP);
                return { success: true, result };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
        return { success: false, error: `Unknown action: ${cmd.action}` };
    };
}

describe('AI_HLP', () => {
    let graph;
    let ui;
    let AI_HLP;

    beforeEach(() => {
        graph = createMockMxGraph();
        ui = createMockUi(graph);
        AI_HLP = createAIHelper(graph, ui);
    });

    describe('getCanvasInfo', () => {
        it('returns canvas information', () => {
            const info = AI_HLP.getCanvasInfo();

            expect(info).toEqual({
                pageCount: 1,
                currentPageIndex: 0,
                currentPageName: 'Page-1',
                cellCount: 0
            });
        });

        it('returns correct cell count', () => {
            graph._addCell({ id: '1', vertex: true, value: 'Node1' });
            graph._addCell({ id: '2', vertex: true, value: 'Node2' });

            const info = AI_HLP.getCanvasInfo();
            expect(info.cellCount).toBe(2);
        });
    });

    describe('getAllCells', () => {
        it('returns empty array when no cells', () => {
            expect(AI_HLP.getAllCells()).toEqual([]);
        });

        it('returns formatted cell information', () => {
            graph._addCell({
                id: 'cell-1',
                vertex: true,
                value: 'Test Node',
                geometry: { x: 100, y: 200, width: 120, height: 60 }
            });

            const cells = AI_HLP.getAllCells();

            expect(cells).toEqual([{
                id: 'cell-1',
                label: 'Test Node',
                type: 'vertex',
                geometry: { x: 100, y: 200, w: 120, h: 60 }
            }]);
        });

        it('identifies edges correctly', () => {
            graph._addCell({
                id: 'edge-1',
                vertex: false,
                value: '',
                geometry: null
            });

            const cells = AI_HLP.getAllCells();
            expect(cells[0].type).toBe('edge');
        });
    });

    describe('getSelection', () => {
        it('returns empty array when nothing selected', () => {
            expect(AI_HLP.getSelection()).toEqual([]);
        });
    });

    describe('getXml', () => {
        it('returns XML string', () => {
            const xml = AI_HLP.getXml();
            expect(typeof xml).toBe('string');
            expect(xml).toContain('mxGraphModel');
        });
    });
});

describe('executeCommand', () => {
    let graph;
    let ui;
    let model;
    let AI_HLP;
    let executeCommand;

    beforeEach(() => {
        graph = createMockMxGraph();
        ui = createMockUi(graph);
        model = graph.getModel();
        AI_HLP = createAIHelper(graph, ui);
        executeCommand = createCommandExecutor(graph, ui, model, AI_HLP);
    });

    describe('execute_script action', () => {
        it('returns error when script is missing', () => {
            const result = executeCommand({ action: 'execute_script' });
            expect(result).toEqual({
                success: false,
                error: 'Missing script parameter'
            });
        });

        it('executes simple script and returns result', () => {
            const result = executeCommand({
                action: 'execute_script',
                script: 'return 1 + 2'
            });

            expect(result).toEqual({ success: true, result: 3 });
        });

        it('provides graph context to script', () => {
            const result = executeCommand({
                action: 'execute_script',
                script: 'return graph.getDefaultParent().id'
            });

            expect(result).toEqual({ success: true, result: 'parent-1' });
        });

        it('provides AI_HLP to script', () => {
            const result = executeCommand({
                action: 'execute_script',
                script: 'return AI_HLP.getCanvasInfo().pageCount'
            });

            expect(result).toEqual({ success: true, result: 1 });
        });

        it('handles script errors gracefully', () => {
            const result = executeCommand({
                action: 'execute_script',
                script: 'throw new Error("Test error")'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
        });

        it('handles syntax errors', () => {
            const result = executeCommand({
                action: 'execute_script',
                script: 'this is not valid javascript {'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('execute_raw_script action', () => {
        it('works the same as execute_script', () => {
            const result = executeCommand({
                action: 'execute_raw_script',
                script: 'return "hello"'
            });

            expect(result).toEqual({ success: true, result: 'hello' });
        });
    });

    describe('unknown action', () => {
        it('returns error for unknown action', () => {
            const result = executeCommand({ action: 'unknown_action' });

            expect(result).toEqual({
                success: false,
                error: 'Unknown action: unknown_action'
            });
        });
    });
});
