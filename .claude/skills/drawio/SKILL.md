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

## Tools

### Platform Tools
| Tool | Description | Parameters |
|------|-------------|------------|
| `get_pages` | List all pages | - |
| `create_page` | Create new page and switch to it | `name` (optional) |
| `select_page` | Switch to existing page | `index` or `name` |

### Drawing Tools
| Tool | Description | Parameters |
|------|-------------|------------|
| `update_diagram` | Create/update diagram with auto-layout | `diagram` (JSON), `clearCanvas` |
| `get_diagram` | Read current diagram as JSON | - |
| `execute_script` | Execute native mxGraph script | `script` (JS code) |

## Standard Workflow

**New diagram:**
```
1. create_page({ name: "Diagram Name" })
2. update_diagram({ ... })
```

**Modify existing:**
```
1. select_page({ name: "Target Page" })
2. get_diagram()
3. update_diagram({ ... })
```

## JSON Format

### Basic Example
```javascript
{
  "nodes": [
    { "id": "start", "label": "Start", "shape": "rounded", "color": "success", "fixed": false },
    { "id": "process", "label": "Process", "color": "primary", "fixed": false },
    { "id": "decision", "label": "OK?", "shape": "diamond", "color": "warning", "fixed": false },
    { "id": "end", "label": "End", "shape": "rounded", "color": "success", "fixed": false }
  ],
  "edges": [
    { "source": "start", "target": "process" },
    { "source": "process", "target": "decision" },
    { "source": "decision", "target": "end", "label": "Yes" }
  ],
  "layout": {
    "preset": "flowchart",
    "direction": "DOWN"
  }
}
```

### Node Properties
| Property | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Unique identifier |
| `label` | No | Display text (supports `\n` for newlines) |
| `width` | No | Width in pixels (default: 120) |
| `height` | No | Height in pixels (default: 60) |
| `fixed` | Yes | `false` = auto-layout, `true` = keep x/y position |
| `shape` | No | Shape type (see below) |
| `color` | No | Color preset: `primary`, `success`, `warning`, `error`, `purple`, `gray` |
| `style` | No | Custom mxGraph style (overrides shape/color) |

### Shape Types
| Shape | Description | Use Case |
|-------|-------------|----------|
| `rectangle` | Rectangle (default) | General |
| `rounded` | Rounded rectangle | Start/End |
| `diamond` | Diamond | Decision |
| `ellipse` | Ellipse | States |
| `parallelogram` | Parallelogram | Input/Output |
| `cylinder` | Cylinder | Database |
| `document` | Document | Documents |
| `cloud` | Cloud | Cloud services |
| `umlActor` | Stick figure | Actor |

See `reference/shapes.md` for full shape library.

### Edge Properties
| Property | Required | Description |
|----------|----------|-------------|
| `source` | Yes | Source node id |
| `target` | Yes | Target node id |
| `label` | No | Edge label |
| `style` | No | mxGraph style string |

### Layout Presets

| Preset | Best For | Direction |
|--------|----------|-----------|
| `flowchart` | Process flows, decision trees | DOWN |
| `architecture` | System architecture, components | DOWN |
| `workflow` | Pipelines, data flows | RIGHT |
| `tree` | Hierarchies, org charts | DOWN |
| `mindmap` | Mind maps, brainstorming | RIGHT |
| `compact` | Dense diagrams | DOWN |
| `spread` | Presentation, readability | DOWN |

### Layout Options
```javascript
{
  "preset": "flowchart",      // Layout preset
  "direction": "DOWN",        // DOWN, UP, LEFT, RIGHT
  "nodeSpacing": 50,          // Pixels between nodes
  "layerSpacing": 80,         // Pixels between layers
  "edgeRouting": "ORTHOGONAL", // ORTHOGONAL or SPLINES
  "elkOptions": {}            // Advanced: raw ELK options override
}
```

### Advanced ELK Options
Override any ELK option via `elkOptions`:
```javascript
{
  "layout": {
    "preset": "flowchart",
    "elkOptions": {
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.favorStraightEdges": "true",
      "elk.layered.thoroughness": "20"
    }
  }
}
```

Common ELK options:
| Option | Values | Description |
|--------|--------|-------------|
| `elk.edgeRouting` | `ORTHOGONAL`, `SPLINES`, `POLYLINE` | Edge routing style |
| `elk.layered.thoroughness` | `1-100` | Layout quality (higher = slower) |
| `elk.layered.nodePlacement.favorStraightEdges` | `true/false` | Prefer straight edges |
| `elk.spacing.edgeNode` | pixels | Space between edges and nodes |
| `elk.spacing.edgeEdge` | pixels | Space between parallel edges |

## Style Reference

### Node Styles
| Type | Style |
|------|-------|
| Primary (blue) | `fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;` |
| Success (green) | `fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;` |
| Warning (yellow) | `fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;` |
| Error (red) | `fillColor=#f8cecc;strokeColor=#b85450;rounded=1;` |
| Neutral (gray) | `fillColor=#f5f5f5;strokeColor=#666666;rounded=1;` |
| Purple | `fillColor=#e1d5e7;strokeColor=#9673a6;rounded=1;` |

### Shape Styles
| Shape | Style |
|-------|-------|
| Rectangle | `rounded=0;` |
| Rounded Rect | `rounded=1;` |
| Diamond | `shape=rhombus;` |
| Ellipse | `ellipse;` |
| Cylinder (DB) | `shape=cylinder3;` |

### Edge Styles
| Type | Style |
|------|-------|
| Solid | (default) |
| Dashed | `dashed=1;` |

## Shape-Aware Edge Routing

ELK automatically snaps edge anchors to valid connection points:
- **Rectangle**: Any point on boundary
- **Diamond (rhombus)**: 4 vertices only (top, right, bottom, left)
- **Ellipse**: 4 cardinal points

No manual anchor configuration needed.
