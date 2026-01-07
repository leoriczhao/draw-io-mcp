/**
 * RPC Data Flow Template
 * Shows client-server communication with serialization/deserialization
 */

const graph = ui.editor.graph;
const parent = graph.getDefaultParent();
const model = graph.getModel();

// Style constants
const STYLE = {
    base: 'whiteSpace=wrap;html=1;',
    client: 'fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;',
    server: 'fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;',
    process: 'fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;',
    data: 'fillColor=#f5f5f5;strokeColor=#666666;rounded=1;',
    edge: 'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;',
    edgeDashed: 'edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1;'
};

model.beginUpdate();
try {
    // Client side
    const client = graph.insertVertex(parent, null, 'Client App', 40, 100, 100, 50,
        STYLE.base + STYLE.client);
    const stub = graph.insertVertex(parent, null, 'Client Stub', 180, 100, 100, 50,
        STYLE.base + STYLE.process);
    const serialize = graph.insertVertex(parent, null, 'Serialize', 320, 100, 100, 50,
        STYLE.base + STYLE.data);

    // Network
    const network = graph.insertVertex(parent, null, 'Network', 460, 100, 80, 50,
        STYLE.base + 'fillColor=#e1d5e7;strokeColor=#9673a6;rounded=1;');

    // Server side
    const deserialize = graph.insertVertex(parent, null, 'Deserialize', 580, 100, 100, 50,
        STYLE.base + STYLE.data);
    const skeleton = graph.insertVertex(parent, null, 'Server Stub', 720, 100, 100, 50,
        STYLE.base + STYLE.process);
    const server = graph.insertVertex(parent, null, 'Server Impl', 860, 100, 100, 50,
        STYLE.base + STYLE.server);

    // Request flow (top)
    graph.insertEdge(parent, null, 'call', client, stub, STYLE.edge);
    graph.insertEdge(parent, null, 'encode', stub, serialize, STYLE.edge);
    graph.insertEdge(parent, null, 'send', serialize, network, STYLE.edge);
    graph.insertEdge(parent, null, 'recv', network, deserialize, STYLE.edge);
    graph.insertEdge(parent, null, 'decode', deserialize, skeleton, STYLE.edge);
    graph.insertEdge(parent, null, 'invoke', skeleton, server, STYLE.edge);

} finally {
    model.endUpdate();
}

graph.fit();
