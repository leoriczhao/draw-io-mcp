/**
 * JSON Converter - Unified JSON format conversion utilities
 * 
 * Converts between:
 * - Unified JSON format (used by LLM)
 * - ELK graph format (used by layout engine)
 * - mxGraph script (used by Draw.io)
 */

function anchorToPortPosition(anchor, nodeWidth, nodeHeight) {
    return {
        x: (anchor.x || 0.5) * nodeWidth,
        y: (anchor.y || 0.5) * nodeHeight
    };
}

function anchorToSide(anchor) {
    const x = anchor.x ?? 0.5;
    const y = anchor.y ?? 0.5;
    if (y === 0) return 'NORTH';
    if (y === 1) return 'SOUTH';
    if (x === 0) return 'WEST';
    if (x === 1) return 'EAST';
    if (y < 0.5) return 'NORTH';
    if (y > 0.5) return 'SOUTH';
    if (x < 0.5) return 'WEST';
    return 'EAST';
}

/**
 * Convert unified JSON to ELK graph format
 * @param {Object} json - Unified JSON diagram
 * @returns {Object} ELK graph format
 */
export function jsonToElk(json) {
    const elkGraph = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': json.layout?.algorithm === 'fixed' ? 'fixed' : 'layered',
            'elk.direction': json.layout?.direction || 'DOWN',
            'elk.spacing.nodeNode': String(json.layout?.nodeSpacing || 50),
            'elk.layered.spacing.nodeNodeBetweenLayers': String(json.layout?.layerSpacing || 80),
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
        },
        children: [],
        edges: []
    };

    const nodeMap = new Map();
    for (const node of json.nodes || []) {
        nodeMap.set(node.id, node);
    }

    const nodePorts = new Map();

    for (const edge of json.edges || []) {
        if (edge.sourceAnchor) {
            const sourceNode = nodeMap.get(edge.source);
            if (sourceNode) {
                const portId = `${edge.source}_port_${edge.sourceAnchor.x}_${edge.sourceAnchor.y}`;
                if (!nodePorts.has(edge.source)) nodePorts.set(edge.source, []);
                const ports = nodePorts.get(edge.source);
                if (!ports.find(p => p.id === portId)) {
                    const pos = anchorToPortPosition(edge.sourceAnchor, sourceNode.width || 120, sourceNode.height || 60);
                    ports.push({
                        id: portId,
                        x: pos.x,
                        y: pos.y,
                        width: 1,
                        height: 1,
                        properties: { 'port.side': anchorToSide(edge.sourceAnchor) }
                    });
                }
            }
        }
        if (edge.targetAnchor) {
            const targetNode = nodeMap.get(edge.target);
            if (targetNode) {
                const portId = `${edge.target}_port_${edge.targetAnchor.x}_${edge.targetAnchor.y}`;
                if (!nodePorts.has(edge.target)) nodePorts.set(edge.target, []);
                const ports = nodePorts.get(edge.target);
                if (!ports.find(p => p.id === portId)) {
                    const pos = anchorToPortPosition(edge.targetAnchor, targetNode.width || 120, targetNode.height || 60);
                    ports.push({
                        id: portId,
                        x: pos.x,
                        y: pos.y,
                        width: 1,
                        height: 1,
                        properties: { 'port.side': anchorToSide(edge.targetAnchor) }
                    });
                }
            }
        }
    }

    for (const node of json.nodes || []) {
        const elkNode = {
            id: node.id,
            width: node.width || 120,
            height: node.height || 60,
            labels: [{ text: node.label || '' }]
        };

        if (node.fixed && node.x !== undefined && node.y !== undefined) {
            elkNode.x = node.x;
            elkNode.y = node.y;
            elkNode.layoutOptions = {
                'elk.position': `(${node.x}, ${node.y})`
            };
        }

        if (nodePorts.has(node.id)) {
            elkNode.ports = nodePorts.get(node.id);
            elkNode.layoutOptions = elkNode.layoutOptions || {};
            elkNode.layoutOptions['elk.portConstraints'] = 'FIXED_POS';
        }

        elkNode._style = node.style;
        elkGraph.children.push(elkNode);
    }

    for (const edge of json.edges || []) {
        const edgeId = edge.id || `e_${edge.source}_${edge.target}`;
        
        let sourceId = edge.source;
        let targetId = edge.target;
        
        if (edge.sourceAnchor) {
            sourceId = `${edge.source}_port_${edge.sourceAnchor.x}_${edge.sourceAnchor.y}`;
        }
        if (edge.targetAnchor) {
            targetId = `${edge.target}_port_${edge.targetAnchor.x}_${edge.targetAnchor.y}`;
        }

        const elkEdge = {
            id: edgeId,
            sources: [sourceId],
            targets: [targetId],
            labels: edge.label ? [{ text: edge.label }] : []
        };

        elkEdge._style = edge.style;
        elkEdge._sourceAnchor = edge.sourceAnchor;
        elkEdge._targetAnchor = edge.targetAnchor;
        elkEdge._originalSource = edge.source;
        elkEdge._originalTarget = edge.target;

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
    const edgeData = new Map();
    for (const node of originalJson.nodes || []) {
        nodeStyles.set(node.id, node.style);
    }
    for (const edge of originalJson.edges || []) {
        const edgeId = edge.id || `e_${edge.source}_${edge.target}`;
        edgeData.set(edgeId, {
            style: edge.style,
            sourceAnchor: edge.sourceAnchor,
            targetAnchor: edge.targetAnchor
        });
    }

    for (const elkNode of elkResult.children || []) {
        result.nodes.push({
            id: elkNode.id,
            label: elkNode.labels?.[0]?.text || '',
            x: elkNode.x,
            y: elkNode.y,
            width: elkNode.width,
            height: elkNode.height,
            fixed: true,
            style: elkNode._style || nodeStyles.get(elkNode.id) || ''
        });
    }

    for (const elkEdge of elkResult.edges || []) {
        const originalSource = elkEdge._originalSource || elkEdge.sources[0];
        const originalTarget = elkEdge._originalTarget || elkEdge.targets[0];
        const origData = edgeData.get(elkEdge.id) || {};

        const edgeResult = {
            id: elkEdge.id,
            source: originalSource,
            target: originalTarget,
            label: elkEdge.labels?.[0]?.text || '',
            style: elkEdge._style || origData.style || ''
        };

        if (origData.sourceAnchor) {
            edgeResult.exitX = origData.sourceAnchor.x;
            edgeResult.exitY = origData.sourceAnchor.y;
        }
        if (origData.targetAnchor) {
            edgeResult.entryX = origData.targetAnchor.x;
            edgeResult.entryY = origData.targetAnchor.y;
        }

        if (elkEdge.sections && elkEdge.sections.length > 0) {
            const section = elkEdge.sections[0];
            edgeResult.points = [];
            
            if (section.startPoint) {
                edgeResult.startPoint = section.startPoint;
            }
            if (section.bendPoints) {
                edgeResult.points = section.bendPoints;
            }
            if (section.endPoint) {
                edgeResult.endPoint = section.endPoint;
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
        const style = edge.style || 'edgeStyle=orthogonalEdgeStyle;rounded=1;';
        const label = escapeString(edge.label || '');
        
        lines.push(`    const edge_${edge.id} = graph.insertEdge(parent, '${edge.id}', '${label}', nodes['${edge.source}'], nodes['${edge.target}'], '${style}');`);
        
        // Add routing points if available
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
