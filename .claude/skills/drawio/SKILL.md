---
name: drawio
description: Draw diagrams in Draw.io (flowcharts, architecture, mind maps, UML, etc). Use when user asks to draw, create diagrams, visualize flows, or design architecture.
---

# Draw.io Diagramming

## When to Use
- User asks to "draw", "create diagram", "visualize"
- Flowcharts, architecture diagrams, mind maps, UML, ER diagrams
- Any visual representation of structure or process

## How to Draw

Use the `execute_script` tool with `AI_HLP.drawBatch()` function.

### Core Function

```javascript
AI_HLP.drawBatch({
  nodes: [
    { id: "unique_id", label: "Display Text", shape: "shape_type", style: "style_string" }
  ],
  edges: [
    { source: "from_id", target: "to_id", label: "edge_text" }
  ],
  layout: "hierarchical"
})
```

### Shape Options
| Shape | Use Case |
|-------|----------|
| `rect` | Default rectangle |
| `rounded` | Rounded rectangle |
| `ellipse` | Start/End nodes, circles |
| `rhombus` | Decision nodes |
| `cylinder` | Database |
| `actor` | User/Person |
| `parallelogram` | Input/Output |
| `note` | Comments |
| `cloud` | Cloud services |

### Style Properties
- `fillColor=#hex` - Background color
- `strokeColor=#hex` - Border color
- `fontColor=#hex` - Text color
- `fontSize=14` - Font size
- `dashed=1` - Dashed line
- `rounded=1` - Rounded corners

### Layout Types
- `hierarchical` - Top-to-bottom flow (flowcharts)
- `tree` - Tree structure (org charts, mind maps)
- `organic` - Force-directed (relationship graphs)
- `circle` - Circular arrangement

---

## Examples

### Flowchart
```javascript
AI_HLP.drawBatch({
  nodes: [
    {id:"start", label:"Start", shape:"ellipse", style:"fillColor=#d5e8d4"},
    {id:"process", label:"Process Data"},
    {id:"decision", label:"Success?", shape:"rhombus", style:"fillColor=#fff2cc"},
    {id:"end", label:"End", shape:"ellipse", style:"fillColor=#f8cecc"}
  ],
  edges: [
    {source:"start", target:"process"},
    {source:"process", target:"decision"},
    {source:"decision", target:"end", label:"Yes"},
    {source:"decision", target:"process", label:"No", style:"dashed=1"}
  ],
  layout: "hierarchical"
})
```

### Architecture Diagram
```javascript
AI_HLP.drawBatch({
  nodes: [
    {id:"user", label:"User", shape:"actor"},
    {id:"web", label:"Web Server", style:"fillColor=#dae8fc"},
    {id:"api", label:"API Gateway", style:"fillColor=#dae8fc"},
    {id:"db", label:"Database", shape:"cylinder", style:"fillColor=#e1d5e7"}
  ],
  edges: [
    {source:"user", target:"web"},
    {source:"web", target:"api"},
    {source:"api", target:"db"}
  ],
  layout: "hierarchical"
})
```

### Mind Map
```javascript
AI_HLP.drawBatch({
  nodes: [
    {id:"root", label:"Main Topic", style:"fillColor=#f5f5f5;fontSize=16"},
    {id:"b1", label:"Branch 1"},
    {id:"b2", label:"Branch 2"},
    {id:"b1_1", label:"Sub 1.1"},
    {id:"b1_2", label:"Sub 1.2"}
  ],
  edges: [
    {source:"root", target:"b1"},
    {source:"root", target:"b2"},
    {source:"b1", target:"b1_1"},
    {source:"b1", target:"b1_2"}
  ],
  layout: "tree"
})
```

---

## Other Functions

| Function | Description |
|----------|-------------|
| `AI_HLP.clear()` | Clear canvas |
| `AI_HLP.autoLayout(type)` | Re-layout existing elements |
| `AI_HLP.getCanvasInfo()` | Get canvas info |
| `AI_HLP.getAllCells()` | Get all elements |
| `AI_HLP.getSelection()` | Get selected elements |
| `AI_HLP.addPage(name)` | Add new page |
| `AI_HLP.switchPage(index)` | Switch page |
| `AI_HLP.exportSvg()` | Export as SVG |
| `AI_HLP.fit()` | Fit view to content |
