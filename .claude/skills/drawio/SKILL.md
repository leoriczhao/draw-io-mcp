---
name: drawio
description: Draw diagrams in Draw.io (flowcharts, architecture, mind maps, UML, etc). Use when user asks to draw, create diagrams, visualize flows, or design architecture.
---

# Draw.io Diagramming

## When to Use
- User asks to "draw", "create diagram", "visualize"
- Flowcharts, architecture diagrams, mind maps, UML, ER diagrams
- Any visual representation of structure or process

## Workflow

**Always start by checking current canvas state before drawing:**

```javascript
// Step 1: Check current state
AI_HLP.getCanvasInfo()
// Returns: { currentPageIndex, currentPageName, cellCount, pages: [{index, name, isCurrent}] }

// Step 2: Decide page strategy
// - New diagram on new page → AI_HLP.addPage("Page Name")
// - Modify existing page → AI_HLP.switchPage("Page Name") or switchPage(index)
// - Add to current page → skip, just draw

// Step 3: Draw
AI_HLP.drawBatch({ nodes: [...], edges: [...], layout: "hierarchical" })
```

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

**Note:** Layout only affects newly created elements, existing elements on canvas are preserved.

---

## Page Management

### Query Current State
```javascript
AI_HLP.getCanvasInfo()
// Returns:
// {
//   currentPageIndex: 0,
//   currentPageName: "Page-1",
//   cellCount: 5,
//   pages: [
//     { index: 0, name: "Page-1", isCurrent: true },
//     { index: 1, name: "Architecture", isCurrent: false }
//   ]
// }
```

### Create New Page
```javascript
AI_HLP.addPage("My Diagram")  // Creates and switches to new page with name
```

### Switch Page
```javascript
AI_HLP.switchPage("Page Name")  // By name
AI_HLP.switchPage(0)            // By index
```

### When to Create New Page
- User explicitly asks for a new diagram
- Drawing unrelated content to existing pages
- User says "draw X" without specifying where

### When to Use Existing Page
- User says "add to...", "modify...", "update..."
- User references existing page by name
- Adding related content to existing diagram

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

## All Functions

| Function | Description |
|----------|-------------|
| `AI_HLP.getCanvasInfo()` | Get current page info and all pages list |
| `AI_HLP.getAllCells()` | Get all elements on current page |
| `AI_HLP.getSelection()` | Get selected elements |
| `AI_HLP.drawBatch({...})` | Batch create nodes and edges |
| `AI_HLP.clear()` | Clear current page |
| `AI_HLP.autoLayout(type)` | Re-layout existing elements |
| `AI_HLP.addPage(name)` | Create and switch to new page |
| `AI_HLP.switchPage(name/index)` | Switch to existing page |
| `AI_HLP.renamePage(name)` | Rename current page |
| `AI_HLP.exportSvg()` | Export as SVG |
| `AI_HLP.fit()` | Fit view to content |
