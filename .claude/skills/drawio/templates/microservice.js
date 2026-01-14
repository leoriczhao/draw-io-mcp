/**
 * Microservice Architecture Template
 * Shows typical microservice components with direct horizontal connections
 * No auto-routing to avoid edge crossings
 */

const graph = ui.editor.graph;
const parent = graph.getDefaultParent();
const model = graph.getModel();

// Style constants
const STYLE = {
    base: 'whiteSpace=wrap;html=1;',
    client: 'fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;',
    gateway: 'fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;',
    service: 'fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;',
    database: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;fillColor=#f5f5f5;strokeColor=#666666;',
    cache: 'fillColor=#e1d5e7;strokeColor=#9673a6;rounded=1;',
    queue: 'fillColor=#ffe6cc;strokeColor=#d79b00;rounded=1;',
    edge: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;',
    edgeDashed: 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;dashed=1;'
};

model.beginUpdate();
try {
    // Clients
    const web = graph.insertVertex(parent, null, 'Web App', 40, 40, 80, 40, STYLE.base + STYLE.client);
    const mobile = graph.insertVertex(parent, null, 'Mobile', 40, 100, 80, 40, STYLE.base + STYLE.client);

    // API Gateway
    const gateway = graph.insertVertex(parent, null, 'API Gateway', 180, 60, 100, 60, STYLE.base + STYLE.gateway);

    // Services
    const userSvc = graph.insertVertex(parent, null, 'User Service', 340, 20, 100, 50, STYLE.base + STYLE.service);
    const orderSvc = graph.insertVertex(parent, null, 'Order Service', 340, 90, 100, 50, STYLE.base + STYLE.service);
    const productSvc = graph.insertVertex(parent, null, 'Product Service', 340, 160, 100, 50, STYLE.base + STYLE.service);

    // Data stores
    const userDb = graph.insertVertex(parent, null, 'User DB', 500, 20, 70, 50, STYLE.database);
    const orderDb = graph.insertVertex(parent, null, 'Order DB', 500, 90, 70, 50, STYLE.database);
    const productDb = graph.insertVertex(parent, null, 'Product DB', 500, 160, 70, 50, STYLE.database);

    // Shared infrastructure
    const cache = graph.insertVertex(parent, null, 'Redis Cache', 620, 60, 80, 40, STYLE.base + STYLE.cache);
    const mq = graph.insertVertex(parent, null, 'Message Queue', 620, 120, 80, 40, STYLE.base + STYLE.queue);

    // Edges - clients to gateway (straight lines)
    graph.insertEdge(parent, null, '', web, gateway, STYLE.edge);
    graph.insertEdge(parent, null, '', mobile, gateway, STYLE.edge);

    // Edges - gateway to services (straight lines)
    graph.insertEdge(parent, null, '', gateway, userSvc, STYLE.edge);
    graph.insertEdge(parent, null, '', gateway, orderSvc, STYLE.edge);
    graph.insertEdge(parent, null, '', gateway, productSvc, STYLE.edge);

    // Edges - services to data (straight lines)
    graph.insertEdge(parent, null, '', userSvc, userDb, STYLE.edge);
    graph.insertEdge(parent, null, '', orderSvc, orderDb, STYLE.edge);
    graph.insertEdge(parent, null, '', productSvc, productDb, STYLE.edge);

    // Edges - shared infra (dashed)
    graph.insertEdge(parent, null, '', userSvc, cache, STYLE.edgeDashed);
    graph.insertEdge(parent, null, '', orderSvc, mq, STYLE.edgeDashed);

} finally {
    model.endUpdate();
}

graph.fit();
