---
name: drawio
description: "REQUIRED: Invoke this skill FIRST before using execute_script tool. Draw diagrams in Draw.io (flowcharts, architecture, mind maps, UML, etc). Use when user asks to draw, create diagrams, visualize flows, or design architecture."
allowed-tools:
  - mcp__drawio-controller__execute_script
---

# Draw.io Diagramming Skill

## When to Use
- User asks to "draw", "create diagram", "visualize", "架构图", "流程图"
- Flowcharts, architecture diagrams, mind maps, UML, ER diagrams
- Any visual representation of structure or process

## Critical Guidelines

### Use Native mxGraph API, NOT AI_HLP
The `AI_HLP` wrapper has layout issues. Always use native mxGraph API directly:

```javascript
const graph = ui.editor.graph;
const parent = graph.getDefaultParent();
const model = graph.getModel();

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

### Manual Positioning Over Auto-Layout
Position nodes manually with explicit x/y coordinates. Auto-layout often produces poor results.

## Core Patterns

### Create a Vertex
```javascript
graph.insertVertex(parent, 'unique_id', 'Label Text', x, y, width, height,
    'whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;');
```

### Create an Edge
```javascript
graph.insertEdge(parent, null, 'edge label', sourceVertex, targetVertex,
    'edgeStyle=orthogonalEdgeStyle;rounded=1;');
```

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
