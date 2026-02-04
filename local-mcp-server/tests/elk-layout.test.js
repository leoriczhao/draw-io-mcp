import { describe, it, expect, beforeAll } from 'vitest';
import { layoutWithConstraints } from '../lib/elk-layout.js';

describe('elk-layout', () => {
    describe('layoutWithConstraints', () => {
        it('computes positions for unfixed nodes', async () => {
            const diagram = {
                nodes: [
                    { id: 'n1', label: 'A', width: 100, height: 50, fixed: false },
                    { id: 'n2', label: 'B', width: 100, height: 50, fixed: false }
                ],
                edges: [
                    { source: 'n1', target: 'n2' }
                ],
                layout: { direction: 'DOWN' }
            };

            const result = await layoutWithConstraints(diagram);

            expect(result.nodes[0].x).toBeDefined();
            expect(result.nodes[0].y).toBeDefined();
            expect(result.nodes[1].x).toBeDefined();
            expect(result.nodes[1].y).toBeDefined();
            expect(result.nodes[0].fixed).toBe(true);
            expect(result.nodes[1].fixed).toBe(true);
        });

        it('preserves positions for fixed nodes', async () => {
            const diagram = {
                nodes: [
                    { id: 'n1', label: 'Fixed', x: 100, y: 200, width: 100, height: 50, fixed: true },
                    { id: 'n2', label: 'Auto', width: 100, height: 50, fixed: false }
                ],
                edges: [
                    { source: 'n1', target: 'n2' }
                ],
                layout: { direction: 'DOWN' }
            };

            const result = await layoutWithConstraints(diagram);

            const fixedNode = result.nodes.find(n => n.id === 'n1');
            expect(fixedNode).toBeDefined();
        });

        it('handles diagram with only fixed nodes', async () => {
            const diagram = {
                nodes: [
                    { id: 'n1', label: 'A', x: 0, y: 0, width: 100, height: 50, fixed: true },
                    { id: 'n2', label: 'B', x: 200, y: 0, width: 100, height: 50, fixed: true }
                ],
                edges: [
                    { source: 'n1', target: 'n2' }
                ],
                layout: { algorithm: 'fixed' }
            };

            const result = await layoutWithConstraints(diagram);

            expect(result.nodes).toHaveLength(2);
            expect(result.edges).toHaveLength(1);
        });

        it('preserves styles through layout', async () => {
            const diagram = {
                nodes: [
                    { id: 'n1', label: 'Styled', width: 100, height: 50, fixed: false, style: 'fillColor=#ff0000;' }
                ],
                edges: [],
                layout: { direction: 'DOWN' }
            };

            const result = await layoutWithConstraints(diagram);

            expect(result.nodes[0].style).toBe('fillColor=#ff0000;');
        });
    });
});
