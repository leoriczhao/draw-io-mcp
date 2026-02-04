/**
 * ELK Layout Presets
 * 
 * Pre-configured layout options for different diagram types.
 * Based on production configurations from Dify, Reaflow, LogicFlow, etc.
 */

const BASE_OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
    'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
    'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
    'elk.separateConnectedComponents': 'true',
    'elk.layered.thoroughness': '10'
};

export const PRESETS = {
    flowchart: {
        ...BASE_OPTIONS,
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '50',
        'elk.layered.spacing.nodeNodeBetweenLayers': '80',
        'elk.spacing.edgeNode': '30',
        'elk.spacing.edgeEdge': '20',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.nodePlacement.favorStraightEdges': 'true',
        'elk.spacing.componentComponent': '80'
    },

    architecture: {
        ...BASE_OPTIONS,
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '80',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.edgeNode': '50',
        'elk.spacing.edgeEdge': '30',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.nodePlacement.favorStraightEdges': 'true',
        'elk.spacing.componentComponent': '100',
        'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH'
    },

    workflow: {
        ...BASE_OPTIONS,
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '60',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.spacing.edgeNode': '40',
        'elk.spacing.edgeEdge': '25',
        'elk.edgeRouting': 'SPLINES',
        'elk.layered.edgeRouting.splines.mode': 'CONSERVATIVE',
        'elk.layered.nodePlacement.favorStraightEdges': 'true',
        'elk.spacing.componentComponent': '100',
        'elk.layered.thoroughness': '15'
    },

    tree: {
        'elk.algorithm': 'mrtree',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '40',
        'elk.mrtree.searchOrder': 'DFS',
        'elk.separateConnectedComponents': 'true',
        'elk.spacing.componentComponent': '60'
    },

    mindmap: {
        'elk.algorithm': 'mrtree',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '30',
        'elk.mrtree.searchOrder': 'DFS',
        'elk.separateConnectedComponents': 'false'
    },

    compact: {
        ...BASE_OPTIONS,
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '30',
        'elk.layered.spacing.nodeNodeBetweenLayers': '50',
        'elk.spacing.edgeNode': '10',
        'elk.spacing.edgeEdge': '10',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
        'elk.spacing.componentComponent': '50'
    },

    spread: {
        ...BASE_OPTIONS,
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '100',
        'elk.layered.spacing.nodeNodeBetweenLayers': '150',
        'elk.spacing.edgeNode': '60',
        'elk.spacing.edgeEdge': '40',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.nodePlacement.favorStraightEdges': 'true',
        'elk.spacing.componentComponent': '150'
    }
};

export const DEFAULT_PRESET = 'flowchart';

export function getPreset(name) {
    return PRESETS[name] || PRESETS[DEFAULT_PRESET];
}

export function buildLayoutOptions(layout = {}) {
    const presetName = layout.preset || DEFAULT_PRESET;
    const preset = getPreset(presetName);
    
    const options = { ...preset };
    
    if (layout.direction) {
        options['elk.direction'] = layout.direction;
    }
    if (layout.nodeSpacing !== undefined) {
        options['elk.spacing.nodeNode'] = String(layout.nodeSpacing);
    }
    if (layout.layerSpacing !== undefined) {
        options['elk.layered.spacing.nodeNodeBetweenLayers'] = String(layout.layerSpacing);
    }
    if (layout.edgeRouting) {
        options['elk.edgeRouting'] = layout.edgeRouting;
    }
    if (layout.algorithm) {
        options['elk.algorithm'] = layout.algorithm;
    }
    
    if (layout.elkOptions) {
        Object.assign(options, layout.elkOptions);
    }
    
    return options;
}
