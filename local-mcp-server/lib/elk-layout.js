import ELK from 'elkjs';
import { jsonToElk, elkToJson } from './json-converter.js';

const elk = new ELK();

export async function layoutDiagram(diagram) {
    const hasUnfixedNodes = (diagram.nodes || []).some(n => !n.fixed);
    
    if (!hasUnfixedNodes && diagram.layout?.algorithm !== 'layered') {
        return diagram;
    }

    const elkGraph = jsonToElk(diagram);
    
    if (hasUnfixedNodes) {
        elkGraph.layoutOptions['elk.algorithm'] = 'layered';
    } else {
        elkGraph.layoutOptions['elk.algorithm'] = 'fixed';
    }

    const layoutedGraph = await elk.layout(elkGraph);
    
    return elkToJson(layoutedGraph, diagram);
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
    const result = {
        nodes: diagram.nodes.map(n => ({ ...n, fixed: true })),
        edges: diagram.edges.map(e => ({ ...e })),
        layout: diagram.layout
    };
    
    return result;
}

export { elk };
