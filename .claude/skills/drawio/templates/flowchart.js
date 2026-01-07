/**
 * Generic Flowchart Template
 * Shows a decision-based process flow
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
    edge: 'edgeStyle=orthogonalEdgeStyle;rounded=1;',
    edgeYes: 'edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#82b366;',
    edgeNo: 'edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#b85450;dashed=1;'
};

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

    // Edges
    graph.insertEdge(parent, null, '', start, input, STYLE.edge);
    graph.insertEdge(parent, null, '', input, process1, STYLE.edge);
    graph.insertEdge(parent, null, '', process1, decision, STYLE.edge);
    graph.insertEdge(parent, null, 'Yes', decision, process2, STYLE.edgeYes);
    graph.insertEdge(parent, null, '', process2, output, STYLE.edge);
    graph.insertEdge(parent, null, '', output, end, STYLE.edge);
    graph.insertEdge(parent, null, 'No', decision, error, STYLE.edgeNo);
    graph.insertEdge(parent, null, '', error, input, STYLE.edgeNo);

} finally {
    model.endUpdate();
}

graph.fit();
