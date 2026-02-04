---
name: drawio
description: "REQUIRED: Invoke this skill FIRST before using Draw.io tools. Draw diagrams in Draw.io (flowcharts, architecture, mind maps, UML, etc). Use when user asks to draw, create diagrams, visualize flows, or design architecture."
allowed-tools:
  - mcp__drawio-controller__execute_script
  - mcp__drawio-controller__get_diagram
  - mcp__drawio-controller__update_diagram
  - mcp__drawio-controller__get_pages
  - mcp__drawio-controller__create_page
  - mcp__drawio-controller__select_page
  - mcp__drawio-controller__rename_page
---

# Draw.io Diagramming Skill

## When to Use
- User asks to "draw", "create diagram", "visualize", "架构图", "流程图"
- Flowcharts, architecture diagrams, mind maps, UML, ER diagrams
- Any visual representation of structure or process

## Available Tools

### Page Management Tools

Before drawing, manage pages to organize your diagrams:

| Tool | Description |
|------|-------------|
| `get_pages` | List all pages with index, name, and current status |
| `create_page` | Create new page and switch to it |
| `select_page` | Switch to page by index or name |
| `rename_page` | Rename current page |

**Workflow**: Always create a new page before drawing a new diagram to avoid overwriting existing content.

```
1. create_page({ name: "Architecture Diagram" })
2. update_diagram({ ... })
```

### 1. `update_diagram` (RECOMMENDED for new diagrams)
Use unified JSON format with automatic ELK layout. Best for:
- Creating new diagrams with automatic layout
- Adding nodes to existing diagrams
- Automatic edge routing (no manual coordinates needed)

```javascript
// Example: Create a simple flowchart
{
  "nodes": [
    { "id": "start", "label": "Start", "width": 80, "height": 40, "fixed": false },
    { "id": "process", "label": "Process", "width": 120, "height": 60, "fixed": false },
    { "id": "end", "label": "End", "width": 80, "height": 40, "fixed": false }
  ],
  "edges": [
    { "source": "start", "target": "process" },
    { "source": "process", "target": "end" }
  ],
  "layout": {
    "direction": "DOWN",
    "nodeSpacing": 50,
    "layerSpacing": 80
  }
}
```

**Key Features:**
- `fixed: false` → ELK computes optimal position
- `fixed: true` → Node keeps its x/y position
- Edges are automatically routed to avoid crossings

### 2. `get_diagram` (Read current diagram)
Returns the current diagram as unified JSON. All nodes are marked `fixed: true`.

Use this to:
- Understand current diagram structure
- Modify existing diagrams (read → modify → update)

### 3. `execute_script` (Advanced: Direct mxGraph API)
For fine-grained control when JSON format is insufficient.

## Workflow Patterns

### Pattern A: Create New Diagram (Recommended)
```
1. Define nodes and edges in JSON
2. Set all nodes to fixed: false
3. Call update_diagram
4. ELK handles layout automatically
```

### Pattern B: Modify Existing Diagram
```
1. Call get_diagram to read current state
2. Modify the JSON (add/remove/change nodes/edges)
3. Keep existing nodes as fixed: true
4. Set new nodes as fixed: false
5. Call update_diagram
```

### Pattern C: Precise Control (Advanced)
```
1. Use execute_script with native mxGraph API
2. Manually specify all coordinates
3. See "Native mxGraph API" section below
```

## JSON Schema Reference

### Node
```javascript
{
  "id": "unique_id",        // Required: unique identifier
  "label": "Display Text",  // Optional: node label
  "x": 100,                 // Optional: x position (required if fixed: true)
  "y": 200,                 // Optional: y position (required if fixed: true)
  "width": 120,             // Optional: default 120
  "height": 60,             // Optional: default 60
  "fixed": false,           // Required: true=keep position, false=auto-layout
  "style": "rounded=1;..."  // Optional: mxGraph style string
}
```

### Edge
```javascript
{
  "id": "edge_id",          // Optional: auto-generated if not provided
  "source": "node_id",      // Required: source node id
  "target": "node_id",      // Required: target node id
  "label": "Edge Label",    // Optional: edge label
  "style": "dashed=1;..."   // Optional: mxGraph style string
}
```

### Layout Options
```javascript
{
  "algorithm": "layered",   // "layered" (auto) or "fixed" (manual)
  "direction": "DOWN",      // "DOWN", "UP", "LEFT", "RIGHT"
  "nodeSpacing": 50,        // Pixels between nodes in same layer
  "layerSpacing": 80        // Pixels between layers
}
```

## Style Reference

### Common Node Styles
```
Primary:   fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;
Success:   fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;
Warning:   fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;
Error:     fillColor=#f8cecc;strokeColor=#b85450;rounded=1;
Database:  shape=cylinder3;fillColor=#f5f5f5;strokeColor=#666666;
```

### Common Edge Styles
```
Standard:  edgeStyle=orthogonalEdgeStyle;rounded=1;
Dashed:    edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1;
```

---

## Native mxGraph API (Advanced)

For cases where JSON format is insufficient, use `execute_script` with native API:

```javascript
const parent = graph.getDefaultParent();

model.beginUpdate();
try {
    // Create vertices and edges here
} finally {
    model.endUpdate();
}
```

### Required Style Base
All shapes MUST include this base style for proper anchor points:
```
whiteSpace=wrap;html=1;
```

## Core Patterns

### Create a Vertex
```javascript
graph.insertVertex(parent, 'unique_id', 'Label Text', x, y, width, height,
    'whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;');
```

### Create an Edge with Proper Port Constraints and Routing Points

**CRITICAL**: Always specify exitX/exitY/entryX/entryY. For diagrams with many crossing edges, manually set routing points to avoid intersections.

```javascript
// Helper function to determine edge style (no auto routing)
function getEdgeStyle(source, target) {
    const s = source.geometry;
    const t = target.geometry;
    const dx = t.x - (s.x + s.width);
    const dy = t.y - (s.y + s.height);
    
    if (Math.abs(dx) > Math.abs(dy)) {
        return 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;';
    } else {
        return 'exitX=0.5;exitY=1;entryX=0.5;entryY=0;';
    }
}

// Create edge with routing points to avoid crossings
function createEdge(parent, label, source, target, points) {
    const edge = graph.insertEdge(parent, null, label, source, target, getEdgeStyle(source, target));
    if (points && points.length > 0) {
        edge.geometry.points = points.map(p => new mxGeometry(p.x, p.y));
    }
    return edge;
}

// Usage - simple horizontal edge (no points)
createEdge(parent, '', source, target, null);

// Usage - edge with 2 intermediate points to route around nodes
createEdge(parent, 'label', source, target, [
    { x: 300, y: 80 },   // First turn
    { x: 300, y: 200 }   // Second turn
]);
```

**Routing Best Practices to Avoid Crossings:**
1. **Horizontal diagrams**: Route edges above/below nodes using Y-offsets
   - Above: `source.y - 30`
   - Below: `source.y + source.geometry.height + 30`

2. **Vertical diagrams**: Route edges left/right of nodes using X-offsets
   - Left: `source.x - 30`
   - Right: `source.x + source.geometry.width + 30`

3. **Group edges**: Use consistent offset channels for related edges

4. **Calculate midpoints**: For clean L-shapes, use intermediate point at intersection of exit and entry lines

**Edge Style Quick Reference:**
| Direction | exitX | exitY | entryX | entryY |
|-----------|-------|-------|--------|--------|
| Left to Right | 1 | 0.5 | 0 | 0.5 |
| Right to Left | 0 | 0.5 | 1 | 0.5 |
| Top to Bottom | 0.5 | 1 | 0.5 | 0 |
| Bottom to Top | 0.5 | 0 | 0.5 | 1 |

### Page Management (Dialog-Free)
```javascript
// Create new page without dialog
const page = ui.insertPage();
ui.editor.graph.model.execute(new RenamePage(ui, page, 'Page Name'));

// Switch to existing page
const existing = ui.pages.find(p => p.getName() === 'Page Name');
if (existing) ui.selectPage(existing);
```

## Templates

See `templates/` directory for ready-to-use diagram templates:
- `rpc-flow.js` - RPC data flow with serialization
- `microservice.js` - Microservice architecture
- `database.js` - Database schema diagrams
- `flowchart.js` - Generic flowchart

## Style Reference

See `reference/style-guide.md` for:
- Color palettes
- Shape styles
- Edge styles
- Typography
