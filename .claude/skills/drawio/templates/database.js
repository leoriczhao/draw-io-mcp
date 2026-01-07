/**
 * Database Schema Template
 * Shows entity-relationship diagram with tables and relationships
 */

const graph = ui.editor.graph;
const parent = graph.getDefaultParent();
const model = graph.getModel();

// Style constants
const STYLE = {
    base: 'whiteSpace=wrap;html=1;',
    table: 'fillColor=#f5f5f5;strokeColor=#666666;rounded=0;align=left;spacingLeft=8;',
    tableHeader: 'fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=0;fontStyle=1;',
    pk: 'fillColor=#fff2cc;strokeColor=#d6b656;rounded=0;align=left;spacingLeft=8;',
    fk: 'fillColor=#d5e8d4;strokeColor=#82b366;rounded=0;align=left;spacingLeft=8;',
    edge: 'edgeStyle=entityRelationEdgeStyle;rounded=1;endArrow=ERone;startArrow=ERmany;'
};

model.beginUpdate();
try {
    // Users table
    const usersHeader = graph.insertVertex(parent, null, 'users', 40, 40, 150, 30, STYLE.base + STYLE.tableHeader);
    const usersId = graph.insertVertex(parent, null, 'id: INT (PK)', 40, 70, 150, 25, STYLE.base + STYLE.pk);
    const usersName = graph.insertVertex(parent, null, 'name: VARCHAR', 40, 95, 150, 25, STYLE.base + STYLE.table);
    const usersEmail = graph.insertVertex(parent, null, 'email: VARCHAR', 40, 120, 150, 25, STYLE.base + STYLE.table);
    const usersCreated = graph.insertVertex(parent, null, 'created_at: TIMESTAMP', 40, 145, 150, 25, STYLE.base + STYLE.table);

    // Orders table
    const ordersHeader = graph.insertVertex(parent, null, 'orders', 280, 40, 150, 30, STYLE.base + STYLE.tableHeader);
    const ordersId = graph.insertVertex(parent, null, 'id: INT (PK)', 280, 70, 150, 25, STYLE.base + STYLE.pk);
    const ordersUserId = graph.insertVertex(parent, null, 'user_id: INT (FK)', 280, 95, 150, 25, STYLE.base + STYLE.fk);
    const ordersTotal = graph.insertVertex(parent, null, 'total: DECIMAL', 280, 120, 150, 25, STYLE.base + STYLE.table);
    const ordersStatus = graph.insertVertex(parent, null, 'status: ENUM', 280, 145, 150, 25, STYLE.base + STYLE.table);

    // Order Items table
    const itemsHeader = graph.insertVertex(parent, null, 'order_items', 520, 40, 150, 30, STYLE.base + STYLE.tableHeader);
    const itemsId = graph.insertVertex(parent, null, 'id: INT (PK)', 520, 70, 150, 25, STYLE.base + STYLE.pk);
    const itemsOrderId = graph.insertVertex(parent, null, 'order_id: INT (FK)', 520, 95, 150, 25, STYLE.base + STYLE.fk);
    const itemsProductId = graph.insertVertex(parent, null, 'product_id: INT (FK)', 520, 120, 150, 25, STYLE.base + STYLE.fk);
    const itemsQty = graph.insertVertex(parent, null, 'quantity: INT', 520, 145, 150, 25, STYLE.base + STYLE.table);

    // Products table
    const productsHeader = graph.insertVertex(parent, null, 'products', 520, 220, 150, 30, STYLE.base + STYLE.tableHeader);
    const productsId = graph.insertVertex(parent, null, 'id: INT (PK)', 520, 250, 150, 25, STYLE.base + STYLE.pk);
    const productsName = graph.insertVertex(parent, null, 'name: VARCHAR', 520, 275, 150, 25, STYLE.base + STYLE.table);
    const productsPrice = graph.insertVertex(parent, null, 'price: DECIMAL', 520, 300, 150, 25, STYLE.base + STYLE.table);

    // Relationships
    graph.insertEdge(parent, null, '1:N', usersId, ordersUserId, STYLE.edge);
    graph.insertEdge(parent, null, '1:N', ordersId, itemsOrderId, STYLE.edge);
    graph.insertEdge(parent, null, 'N:1', itemsProductId, productsId, STYLE.edge);

} finally {
    model.endUpdate();
}

graph.fit();
