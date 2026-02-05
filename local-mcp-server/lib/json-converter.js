/**
 * JSON Converter - Unified JSON format conversion utilities
 * 
 * Converts between:
 * - Unified JSON format (used by LLM)
 * - ELK graph format (used by layout engine)
 * - mxGraph script (used by Draw.io)
 */

import { buildLayoutOptions } from './elk-presets.js';

/**
 * Detect shape type from mxGraph style string
 */
function detectShapeType(style) {
    if (!style) return 'rectangle';
    if (style.includes('rhombus')) return 'rhombus';
    if (style.includes('ellipse') && !style.includes('cloud')) return 'ellipse';
    if (style.includes('triangle')) return 'triangle';
    if (style.includes('hexagon')) return 'hexagon';
    if (style.includes('cylinder')) return 'cylinder';
    return 'rectangle';
}

/**
 * Snap anchor to valid connection points based on shape type
 * Returns anchor that lies on the actual shape perimeter
 */
function snapAnchorToShape(x, y, shapeType) {
    switch (shapeType) {
        case 'rhombus': {
            // Diamond vertices: N(0.5,0), E(1,0.5), S(0.5,1), W(0,0.5)
            const vertices = [
                { x: 0.5, y: 0 },
                { x: 1, y: 0.5 },
                { x: 0.5, y: 1 },
                { x: 0, y: 0.5 }
            ];
            let minDist = Infinity;
            let nearest = vertices[0];
            for (const v of vertices) {
                const dist = (x - v.x) ** 2 + (y - v.y) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    nearest = v;
                }
            }
            return nearest;
        }
        
        case 'ellipse': {
            // For ellipse, snap to 4 cardinal points
            const vertices = [
                { x: 0.5, y: 0 },
                { x: 1, y: 0.5 },
                { x: 0.5, y: 1 },
                { x: 0, y: 0.5 }
            ];
            let minDist = Infinity;
            let nearest = vertices[0];
            for (const v of vertices) {
                const dist = (x - v.x) ** 2 + (y - v.y) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    nearest = v;
                }
            }
            return nearest;
        }
        
        default:
            // Rectangle: keep original anchor (ELK handles rectangles well)
            return { x, y };
    }
}

/**
 * Convert unified JSON to ELK graph format
 */
export function jsonToElk(json) {
    const layoutOptions = buildLayoutOptions(json.layout);
    
    const elkGraph = {
        id: 'root',
        layoutOptions,
        children: [],
        edges: []
    };

    for (const node of json.nodes || []) {
        const width = node.width || 120;
        const height = node.height || 60;
        
        const elkNode = {
            id: node.id,
            width: width,
            height: height,
            labels: [{ text: node.label || '' }]
        };

        if (node.fixed && node.x !== undefined && node.y !== undefined) {
            elkNode.x = node.x;
            elkNode.y = node.y;
            elkNode.layoutOptions = {
                'elk.position': `(${node.x}, ${node.y})`
            };
        }

        elkNode._style = node.style;
        elkNode._shape = node.shape;
        elkNode._color = node.color;
        elkNode._shapeType = detectShapeType(node.style);
        elkGraph.children.push(elkNode);
    }

    for (const edge of json.edges || []) {
        const elkEdge = {
            id: edge.id || `e_${edge.source}_${edge.target}`,
            sources: [edge.source],
            targets: [edge.target],
            labels: edge.label ? [{ text: edge.label }] : []
        };

        elkEdge._style = edge.style;
        elkGraph.edges.push(elkEdge);
    }

    return elkGraph;
}

/**
 * Convert ELK layout result back to unified JSON
 * Applies shape-aware anchor snapping for non-rectangular shapes
 */
export function elkToJson(elkResult, originalJson) {
    const result = {
        nodes: [],
        edges: [],
        layout: originalJson.layout || { algorithm: 'layered', direction: 'DOWN' }
    };

    const nodeStyles = new Map();
    const edgeStyles = new Map();
    for (const node of originalJson.nodes || []) {
        nodeStyles.set(node.id, node.style);
    }
    for (const edge of originalJson.edges || []) {
        const edgeId = edge.id || `e_${edge.source}_${edge.target}`;
        edgeStyles.set(edgeId, edge.style);
    }

    const nodeMap = new Map();
    for (const elkNode of elkResult.children || []) {
        const nodeData = {
            id: elkNode.id,
            label: elkNode.labels?.[0]?.text || '',
            x: elkNode.x,
            y: elkNode.y,
            width: elkNode.width,
            height: elkNode.height,
            fixed: true,
            style: elkNode._style || nodeStyles.get(elkNode.id) || '',
            shape: elkNode._shape,
            color: elkNode._color,
            _shapeType: elkNode._shapeType || detectShapeType(elkNode._style || nodeStyles.get(elkNode.id))
        };
        result.nodes.push(nodeData);
        nodeMap.set(elkNode.id, nodeData);
    }

    for (const elkEdge of elkResult.edges || []) {
        const edgeResult = {
            id: elkEdge.id,
            source: elkEdge.sources[0],
            target: elkEdge.targets[0],
            label: elkEdge.labels?.[0]?.text || '',
            style: elkEdge._style || edgeStyles.get(elkEdge.id) || ''
        };

        if (elkEdge.sections && elkEdge.sections.length > 0) {
            const section = elkEdge.sections[0];
            
            const sourceNode = nodeMap.get(edgeResult.source);
            const targetNode = nodeMap.get(edgeResult.target);
            
            if (sourceNode && section.startPoint) {
                let exitX = (section.startPoint.x - sourceNode.x) / sourceNode.width;
                let exitY = (section.startPoint.y - sourceNode.y) / sourceNode.height;
                
                // Snap to shape perimeter for non-rectangular shapes
                const snapped = snapAnchorToShape(exitX, exitY, sourceNode._shapeType);
                edgeResult.exitX = snapped.x;
                edgeResult.exitY = snapped.y;
            }
            
            if (targetNode && section.endPoint) {
                let entryX = (section.endPoint.x - targetNode.x) / targetNode.width;
                let entryY = (section.endPoint.y - targetNode.y) / targetNode.height;
                
                // Snap to shape perimeter for non-rectangular shapes
                const snapped = snapAnchorToShape(entryX, entryY, targetNode._shapeType);
                edgeResult.entryX = snapped.x;
                edgeResult.entryY = snapped.y;
            }
            
            if (section.bendPoints && section.bendPoints.length > 0) {
                edgeResult.points = section.bendPoints;
            }
        }

        result.edges.push(edgeResult);
    }

    return result;
}

/**
 * Generate mxGraph script from unified JSON
 * @param {Object} json - Unified JSON with positions
 * @param {Object} options - Options for script generation
 * @returns {string} JavaScript code for mxGraph
 */
export function jsonToMxScript(json, options = {}) {
    const { clearCanvas = true } = options;
    
    const lines = [];
    lines.push('const parent = graph.getDefaultParent();');
    lines.push('');
    lines.push('model.beginUpdate();');
    lines.push('try {');
    
    // Clear canvas if requested
    if (clearCanvas) {
        lines.push('    // Clear existing content');
        lines.push('    const existingCells = graph.getChildCells(parent, true, true);');
        lines.push('    if (existingCells.length > 0) {');
        lines.push('        graph.removeCells(existingCells);');
        lines.push('    }');
        lines.push('');
    }

    // Create node ID mapping for edge references
    lines.push('    // Create nodes');
    lines.push('    const nodes = {};');
    
    for (const node of json.nodes || []) {
        const style = node.style || 'whiteSpace=wrap;html=1;rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;';
        const label = escapeString(node.label || '');
        lines.push(`    nodes['${node.id}'] = graph.insertVertex(parent, '${node.id}', '${label}', ${node.x}, ${node.y}, ${node.width}, ${node.height}, '${style}');`);
    }

    lines.push('');
    lines.push('    // Create edges');
    
    for (const edge of json.edges || []) {
        let style = edge.style || 'edgeStyle=orthogonalEdgeStyle;rounded=1;';
        const label = escapeString(edge.label || '');
        
        if (edge.exitX !== undefined) style += `exitX=${edge.exitX};`;
        if (edge.exitY !== undefined) style += `exitY=${edge.exitY};`;
        if (edge.entryX !== undefined) style += `entryX=${edge.entryX};`;
        if (edge.entryY !== undefined) style += `entryY=${edge.entryY};`;
        
        lines.push(`    const edge_${edge.id} = graph.insertEdge(parent, '${edge.id}', '${label}', nodes['${edge.source}'], nodes['${edge.target}'], '${style}');`);
        
        if (edge.points && edge.points.length > 0) {
            const pointsStr = edge.points.map(p => `new mxPoint(${p.x}, ${p.y})`).join(', ');
            lines.push(`    edge_${edge.id}.geometry.points = [${pointsStr}];`);
        }
    }

    lines.push('} finally {');
    lines.push('    model.endUpdate();');
    lines.push('}');
    lines.push('');
    lines.push("'Diagram applied successfully';");

    return lines.join('\n');
}

/**
 * Escape string for JavaScript
 */
function escapeString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}

/**
 * Validate unified JSON format
 * @param {Object} json - JSON to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateJson(json) {
    const errors = [];

    if (!json || typeof json !== 'object') {
        errors.push('JSON must be an object');
        return { valid: false, errors };
    }

    if (!Array.isArray(json.nodes)) {
        errors.push('nodes must be an array');
    } else {
        for (let i = 0; i < json.nodes.length; i++) {
            const node = json.nodes[i];
            if (!node.id) errors.push(`nodes[${i}] missing id`);
            if (node.fixed && (node.x === undefined || node.y === undefined)) {
                errors.push(`nodes[${i}] is fixed but missing x or y`);
            }
        }
    }

    if (!Array.isArray(json.edges)) {
        errors.push('edges must be an array');
    } else {
        const nodeIds = new Set((json.nodes || []).map(n => n.id));
        for (let i = 0; i < json.edges.length; i++) {
            const edge = json.edges[i];
            if (!edge.source) errors.push(`edges[${i}] missing source`);
            if (!edge.target) errors.push(`edges[${i}] missing target`);
            if (edge.source && !nodeIds.has(edge.source)) {
                errors.push(`edges[${i}] source '${edge.source}' not found in nodes`);
            }
            if (edge.target && !nodeIds.has(edge.target)) {
                errors.push(`edges[${i}] target '${edge.target}' not found in nodes`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}
