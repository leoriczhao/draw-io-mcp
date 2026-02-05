import ELK from 'elkjs';
import { jsonToElk, elkToJson } from './json-converter.js';

const elk = new ELK();

export async function layoutDiagram(diagram) {
    const hasUnfixedNodes = (diagram.nodes || []).some(n => !n.fixed);
    
    if (hasUnfixedNodes) {
        const elkGraph = jsonToElk(diagram);
        elkGraph.layoutOptions['elk.algorithm'] = 'layered';
        const layoutedGraph = await elk.layout(elkGraph);
        return elkToJson(layoutedGraph, diagram);
    }
    
    return computeFixedLayout(diagram);
}

function computeFixedLayout(diagram) {
    const nodeMap = new Map();
    for (const node of diagram.nodes || []) {
        nodeMap.set(node.id, node);
    }
    
    const edges = (diagram.edges || []).map(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        
        if (!source || !target) {
            return { ...edge };
        }
        
        const anchors = computeAnchors(source, target);
        return {
            ...edge,
            id: edge.id || `e_${edge.source}_${edge.target}`,
            exitX: anchors.exitX,
            exitY: anchors.exitY,
            entryX: anchors.entryX,
            entryY: anchors.entryY
        };
    });
    
    return {
        nodes: diagram.nodes.map(n => ({ ...n, fixed: true })),
        edges,
        layout: diagram.layout
    };
}

function computeAnchors(source, target) {
    const sx = source.x + (source.width || 120) / 2;
    const sy = source.y + (source.height || 60) / 2;
    const tx = target.x + (target.width || 120) / 2;
    const ty = target.y + (target.height || 60) / 2;
    
    const dx = tx - sx;
    const dy = ty - sy;
    
    let exitX, exitY, entryX, entryY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
            exitX = 1; exitY = 0.5;
            entryX = 0; entryY = 0.5;
        } else {
            exitX = 0; exitY = 0.5;
            entryX = 1; entryY = 0.5;
        }
    } else {
        if (dy > 0) {
            exitX = 0.5; exitY = 1;
            entryX = 0.5; entryY = 0;
        } else {
            exitX = 0.5; exitY = 0;
            entryX = 0.5; entryY = 1;
        }
    }
    
    return { exitX, exitY, entryX, entryY };
}

export async function layoutWithConstraints(diagram) {
    const fixedNodes = (diagram.nodes || []).filter(n => n.fixed);
    const unfixedNodes = (diagram.nodes || []).filter(n => !n.fixed);
    
    if (unfixedNodes.length === 0) {
        return layoutEdgesOnly(diagram);
    }

    const elkGraph = jsonToElk(diagram);
    
    for (const child of elkGraph.children) {
        const originalNode = diagram.nodes.find(n => n.id === child.id);
        if (originalNode?.fixed) {
            child.layoutOptions = child.layoutOptions || {};
            child.layoutOptions['elk.position'] = `(${originalNode.x}, ${originalNode.y})`;
        }
    }

    elkGraph.layoutOptions['elk.algorithm'] = 'layered';
    elkGraph.layoutOptions['elk.layered.nodePlacement.strategy'] = 'NETWORK_SIMPLEX';

    const layoutedGraph = await elk.layout(elkGraph);
    
    return elkToJson(layoutedGraph, diagram);
}

async function layoutEdgesOnly(diagram) {
    return computeFixedLayout(diagram);
}

export { elk };
