/**
 * Generic Flowchart Template
 * Shows a decision-based process flow with manual edge routing to avoid crossings
 */

const graph = ui.editor.graph;
const parent = graph.getDefaultParent();
const model = graph.getModel();

// Style constants
const STYLE = {
    base: 'whiteSpace=wrap;html=1;',
    start: 'ellipse;fillColor=#d5e8d4;strokeColor=#82b366;',
    end: 'ellipse;fillColor=#f8cecc;strokeColor=#b85450;',
    process: 'fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;',
    decision: 'rhombus;fillColor=#fff2cc;strokeColor=#d6b656;',
    io: 'shape=parallelogram;fillColor=#e1d5e7;strokeColor=#9673a6;',
    edgeVertical: 'exitX=0.5;exitY=1;entryX=0.5;entryY=0;',
    edgeHorizontal: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;',
    edgeYes: 'exitX=0.5;exitY=1;entryX=0.5;entryY=0;strokeColor=#82b366;',
    edgeNo: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;strokeColor=#b85450;dashed=1;'
};

// Helper to create edge with routing points
function createEdge(parent, label, source, target, style, points) {
    const edge = graph.insertEdge(parent, null, label, source, target, style);
    if (points && points.length > 0) {
        edge.geometry.points = points.map(p => new mxGeometry(p.x, p.y));
    }
    return edge;
}

model.beginUpdate();
try {
    // Start
    const start = graph.insertVertex(parent, null, 'Start', 200, 20, 80, 40, STYLE.base + STYLE.start);

    // Input
    const input = graph.insertVertex(parent, null, 'Get Input', 180, 100, 120, 50, STYLE.base + STYLE.io);

    // Process
    const process1 = graph.insertVertex(parent, null, 'Process Data', 180, 190, 120, 50, STYLE.base + STYLE.process);

    // Decision
    const decision = graph.insertVertex(parent, null, 'Valid?', 190, 280, 100, 60, STYLE.base + STYLE.decision);

    // Branch - Yes
    const process2 = graph.insertVertex(parent, null, 'Save Result', 180, 390, 120, 50, STYLE.base + STYLE.process);
    const output = graph.insertVertex(parent, null, 'Show Output', 180, 480, 120, 50, STYLE.base + STYLE.io);
    const end = graph.insertVertex(parent, null, 'End', 200, 570, 80, 40, STYLE.base + STYLE.end);

    // Branch - No
    const error = graph.insertVertex(parent, null, 'Show Error', 380, 300, 120, 50, STYLE.base + STYLE.process);

    // Edges - vertical flow (straight lines, no points needed)
    createEdge(parent, '', start, input, STYLE.edgeVertical, null);
    createEdge(parent, '', input, process1, STYLE.edgeVertical, null);
    createEdge(parent, '', process1, decision, STYLE.edgeVertical, null);
    createEdge(parent, 'Yes', decision, process2, STYLE.edgeYes, null);
    createEdge(parent, '', process2, output, STYLE.edgeVertical, null);
    createEdge(parent, '', output, end, STYLE.edgeVertical, null);

    // Edges - "No" branch with routing points to avoid crossing
    // Decision -> Error (right)
    createEdge(parent, 'No', decision, error, STYLE.edgeNo, null);
    // Error -> Input (loop back) - route around decision to avoid crossing
    createEdge(parent, '', error, input, STYLE.edgeNo, [
        { x: 320, y: 325 },  // Above error
        { x: 320, y: 125 }   // Above input
    ]);

} finally {
    model.endUpdate();
}

graph.fit();
