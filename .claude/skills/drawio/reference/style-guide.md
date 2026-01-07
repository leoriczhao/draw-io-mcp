# Draw.io Style Guide

## Color Palettes

### Semantic Colors
| Purpose | Fill | Stroke | Usage |
|---------|------|--------|-------|
| Primary | `#dae8fc` | `#6c8ebf` | Main elements, clients, UI |
| Success | `#d5e8d4` | `#82b366` | Success states, servers, start |
| Warning | `#fff2cc` | `#d6b656` | Decisions, gateways, processing |
| Error | `#f8cecc` | `#b85450` | Errors, end states, alerts |
| Neutral | `#f5f5f5` | `#666666` | Data, storage, secondary |
| Purple | `#e1d5e7` | `#9673a6` | Infrastructure, cache, special |
| Orange | `#ffe6cc` | `#d79b00` | Queues, async, events |

### Example
```javascript
const style = 'whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;';
```

## Shape Styles

### Base Style (REQUIRED)
Always include this for proper anchor points:
```
whiteSpace=wrap;html=1;
```

### Shape Definitions
| Shape | Style |
|-------|-------|
| Rectangle | `rounded=0;` |
| Rounded Rect | `rounded=1;` |
| Ellipse | `ellipse;` |
| Diamond | `rhombus;` |
| Parallelogram | `shape=parallelogram;` |
| Cylinder | `shape=cylinder3;boundedLbl=1;` |
| Actor | `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;` |
| Note | `shape=note;` |
| Cloud | `ellipse;shape=cloud;` |

## Edge Styles

### Standard Edge
```javascript
'edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;'
```

### Dashed Edge
```javascript
'edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1;'
```

### ER Diagram Edge
```javascript
'edgeStyle=entityRelationEdgeStyle;rounded=1;endArrow=ERone;startArrow=ERmany;'
```

### Arrow Styles
| Arrow | Style |
|-------|-------|
| None | `endArrow=none;` |
| Classic | `endArrow=classic;` |
| Block | `endArrow=block;` |
| Open | `endArrow=open;` |
| Diamond | `endArrow=diamond;` |
| ER One | `endArrow=ERone;` |
| ER Many | `endArrow=ERmany;` |

## Typography

### Font Size
```javascript
'fontSize=14;'  // Default
'fontSize=16;'  // Headers
'fontSize=12;'  // Small text
```

### Font Style
```javascript
'fontStyle=0;'  // Normal
'fontStyle=1;'  // Bold
'fontStyle=2;'  // Italic
'fontStyle=3;'  // Bold + Italic
```

### Alignment
```javascript
'align=center;'  // Horizontal: left, center, right
'verticalAlign=middle;'  // Vertical: top, middle, bottom
```

## Recommended Dimensions

| Element Type | Width | Height |
|--------------|-------|--------|
| Standard node | 120 | 60 |
| Small node | 80 | 40 |
| Wide node | 150 | 50 |
| Decision | 100 | 60 |
| Start/End | 80 | 40 |
| Database | 70 | 50 |

## Spacing Guidelines

- Horizontal gap between nodes: 40-60px
- Vertical gap between nodes: 40-80px
- Group margin: 20px
- Edge label offset from center: auto

## Complete Style Example

```javascript
const STYLE = {
    base: 'whiteSpace=wrap;html=1;',
    primary: 'fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;',
    success: 'fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;',
    warning: 'fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;',
    error: 'fillColor=#f8cecc;strokeColor=#b85450;rounded=1;',
    neutral: 'fillColor=#f5f5f5;strokeColor=#666666;rounded=1;',
    database: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;fillColor=#f5f5f5;strokeColor=#666666;',
    edge: 'edgeStyle=orthogonalEdgeStyle;rounded=1;',
    edgeDashed: 'edgeStyle=orthogonalEdgeStyle;rounded=1;dashed=1;'
};

// Usage
graph.insertVertex(parent, null, 'Label', x, y, 120, 60, STYLE.base + STYLE.primary);
```
