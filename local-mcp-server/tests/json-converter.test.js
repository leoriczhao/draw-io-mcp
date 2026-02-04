import { describe, it, expect } from 'vitest';
import { jsonToElk, elkToJson, jsonToMxScript, validateJson } from '../lib/json-converter.js';

describe('json-converter', () => {
    describe('jsonToElk', () => {
        it('converts nodes to ELK format', () => {
            const json = {
                nodes: [
                    { id: 'n1', label: 'Node 1', x: 100, y: 50, width: 120, height: 60, fixed: true }
                ],
                edges: [],
                layout: { direction: 'DOWN' }
            };

            const elk = jsonToElk(json);

            expect(elk.id).toBe('root');
            expect(elk.children).toHaveLength(1);
            expect(elk.children[0].id).toBe('n1');
            expect(elk.children[0].width).toBe(120);
            expect(elk.children[0].height).toBe(60);
            expect(elk.children[0].layoutOptions['elk.position']).toBe('(100, 50)');
        });

        it('converts edges to ELK format', () => {
            const json = {
                nodes: [
                    { id: 'n1', label: 'A', fixed: false },
                    { id: 'n2', label: 'B', fixed: false }
                ],
                edges: [
                    { source: 'n1', target: 'n2', label: 'connects' }
                ]
            };

            const elk = jsonToElk(json);

            expect(elk.edges).toHaveLength(1);
            expect(elk.edges[0].sources).toEqual(['n1']);
            expect(elk.edges[0].targets).toEqual(['n2']);
            expect(elk.edges[0].labels[0].text).toBe('connects');
        });

        it('sets layout options from JSON', () => {
            const json = {
                nodes: [],
                edges: [],
                layout: {
                    direction: 'RIGHT',
                    nodeSpacing: 30,
                    layerSpacing: 100
                }
            };

            const elk = jsonToElk(json);

            expect(elk.layoutOptions['elk.direction']).toBe('RIGHT');
            expect(elk.layoutOptions['elk.spacing.nodeNode']).toBe('30');
            expect(elk.layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers']).toBe('100');
        });
    });

    describe('elkToJson', () => {
        it('converts ELK result back to JSON with positions', () => {
            const elkResult = {
                children: [
                    { id: 'n1', x: 50, y: 100, width: 120, height: 60, labels: [{ text: 'Node' }] }
                ],
                edges: [
                    { 
                        id: 'e1', 
                        sources: ['n1'], 
                        targets: ['n2'],
                        sections: [{ startPoint: { x: 0, y: 0 }, endPoint: { x: 100, y: 100 } }]
                    }
                ]
            };

            const original = {
                nodes: [{ id: 'n1', style: 'fillColor=#dae8fc;' }],
                edges: [{ id: 'e1', source: 'n1', target: 'n2', style: 'dashed=1;' }],
                layout: { direction: 'DOWN' }
            };

            const json = elkToJson(elkResult, original);

            expect(json.nodes[0].x).toBe(50);
            expect(json.nodes[0].y).toBe(100);
            expect(json.nodes[0].fixed).toBe(true);
            expect(json.nodes[0].style).toBe('fillColor=#dae8fc;');
            expect(json.edges[0].style).toBe('dashed=1;');
        });
    });

    describe('jsonToMxScript', () => {
        it('generates valid mxGraph script', () => {
            const json = {
                nodes: [
                    { id: 'n1', label: 'Test', x: 100, y: 50, width: 120, height: 60, style: 'rounded=1;' }
                ],
                edges: [
                    { id: 'e1', source: 'n1', target: 'n2', label: 'flow' }
                ]
            };

            const script = jsonToMxScript(json);

            expect(script).toContain('graph.insertVertex');
            expect(script).toContain("'n1'");
            expect(script).toContain("'Test'");
            expect(script).toContain('100, 50, 120, 60');
            expect(script).toContain('graph.insertEdge');
            expect(script).toContain("nodes['n1']");
        });

        it('escapes special characters in labels', () => {
            const json = {
                nodes: [
                    { id: 'n1', label: "It's a \"test\"", x: 0, y: 0, width: 100, height: 50 }
                ],
                edges: []
            };

            const script = jsonToMxScript(json);

            expect(script).toContain("\\'");
            expect(script).not.toContain("It's");
        });
    });

    describe('validateJson', () => {
        it('validates correct JSON', () => {
            const json = {
                nodes: [
                    { id: 'n1', fixed: false },
                    { id: 'n2', x: 100, y: 50, fixed: true }
                ],
                edges: [
                    { source: 'n1', target: 'n2' }
                ]
            };

            const result = validateJson(json);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('detects missing node id', () => {
            const json = {
                nodes: [{ fixed: false }],
                edges: []
            };

            const result = validateJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('nodes[0] missing id');
        });

        it('detects fixed node without position', () => {
            const json = {
                nodes: [{ id: 'n1', fixed: true }],
                edges: []
            };

            const result = validateJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('fixed but missing'))).toBe(true);
        });

        it('detects edge with invalid source', () => {
            const json = {
                nodes: [{ id: 'n1', fixed: false }],
                edges: [{ source: 'invalid', target: 'n1' }]
            };

            const result = validateJson(json);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("source 'invalid' not found"))).toBe(true);
        });
    });
});
