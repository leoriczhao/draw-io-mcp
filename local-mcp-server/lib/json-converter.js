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
 * Convert unified JSON to ELK graph format
 * @param {Object} json - Unified JSON diagram
 * @returns {Object} ELK graph format
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
 * @param {Object} elkResult - ELK layout result
 * @param {Object} originalJson - Original unified JSON (for style preservation)
 * @returns {Object} Unified JSON with computed positions
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
            style: elkNode._style || nodeStyles.get(elkNode.id) || ''
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
                edgeResult.exitX = (section.startPoint.x - sourceNode.x) / sourceNode.width;
                edgeResult.exitY = (section.startPoint.y - sourceNode.y) / sourceNode.height;
            }
            if (targetNode && section.endPoint) {
                edgeResult.entryX = (section.endPoint.x - targetNode.x) / targetNode.width;
                edgeResult.entryY = (section.endPoint.y - targetNode.y) / targetNode.height;
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
