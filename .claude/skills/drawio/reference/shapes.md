# Draw.io Shape Reference

## Quick Reference

Use the `shape` field in node JSON to specify shape type:

```json
{
  "id": "decision",
  "label": "Is Valid?",
  "shape": "diamond",
  "width": 120,
  "height": 80
}
```

## Basic Shapes

| Shape | Description | Use Case |
|-------|-------------|----------|
| `rectangle` | Standard rectangle (default) | General purpose |
| `rounded` | Rounded rectangle | Start/End, buttons |
| `ellipse` | Ellipse/Circle | States, events |
| `diamond` | Diamond/Rhombus | Decision points |
| `triangle` | Triangle | Direction indicators |
| `hexagon` | Hexagon | Preparation steps |
| `parallelogram` | Parallelogram | Input/Output |
| `trapezoid` | Trapezoid | Manual operations |

## Flowchart Shapes

| Shape | Description | Use Case |
|-------|-------------|----------|
| `process` | Process box | Standard process |
| `document` | Document shape | Documents, reports |
| `manualInput` | Manual input | User input |
| `dataStorage` | Data storage | Files, storage |
| `delay` | Delay symbol | Wait/delay |
| `display` | Display | Output display |
| `internalStorage` | Internal storage | Memory |
| `loopLimit` | Loop limit | Loop boundaries |
| `offPageConnector` | Off-page connector | Page references |

## Database & Storage

| Shape | Description | Use Case |
|-------|-------------|----------|
| `cylinder` | Cylinder (3D) | Database |
| `cylinder2` | Cylinder variant | Database |
| `cylinder3` | Cylinder variant | Database |
| `datastore` | Datastore | Data storage |
| `cube` | 3D Cube | Data cube |

## UML Shapes

| Shape | Description | Use Case |
|-------|-------------|----------|
| `umlActor` | Stick figure | Actor |
| `umlState` | State box | State |
| `umlLifeline` | Lifeline | Sequence diagrams |
| `umlFrame` | Frame | Package/Component |
| `umlBoundary` | Boundary | System boundary |
| `umlEntity` | Entity | Entity |
| `umlControl` | Control | Controller |

## Containers & Groups

| Shape | Description | Use Case |
|-------|-------------|----------|
| `swimlane` | Swimlane | Process lanes |
| `folder` | Folder | Grouping |
| `card` | Card | Card layout |
| `note` | Note/Sticky | Comments |

## Arrows & Connectors

| Shape | Description | Use Case |
|-------|-------------|----------|
| `arrow` | Arrow | Direction |
| `doubleArrow` | Double arrow | Bidirectional |
| `flexArrow` | Flexible arrow | Custom arrows |
| `callout` | Callout | Annotations |

## Cloud & Network

| Shape | Description | Use Case |
|-------|-------------|----------|
| `cloud` | Cloud | Cloud services |
| `actor` | Person icon | Users |

## Special Shapes

| Shape | Description | Use Case |
|-------|-------------|----------|
| `step` | Step shape | Process steps |
| `plus` | Plus sign | Add/expand |
| `cross` | Cross | Delete/close |
| `startState` | Filled circle | Start state |
| `endState` | Double circle | End state |

---

## Extended Shape Libraries

For specialized diagrams, use the full mxGraph shape name in the `style` field:

### AWS Icons
```json
{ "style": "shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;" }
```

### Azure Icons
```json
{ "style": "shape=mxgraph.azure2.compute.Virtual_Machine;" }
```

### GCP Icons
```json
{ "style": "shape=mxgraph.gcp2.compute_engine;" }
```

### Kubernetes
```json
{ "style": "shape=mxgraph.kubernetes.icon;" }
```

### BPMN
```json
{ "style": "shape=mxgraph.bpmn.event;outline=standard;symbol=general;" }
```

---

## Color Presets

Combine shapes with color presets:

| Preset | Fill | Stroke | Use Case |
|--------|------|--------|----------|
| `primary` | #dae8fc | #6c8ebf | Default, info |
| `success` | #d5e8d4 | #82b366 | Success, start |
| `warning` | #fff2cc | #d6b656 | Warning, decision |
| `error` | #f8cecc | #b85450 | Error, stop |
| `purple` | #e1d5e7 | #9673a6 | Special |
| `gray` | #f5f5f5 | #666666 | Neutral |

Example:
```json
{
  "id": "start",
  "label": "Start",
  "shape": "rounded",
  "color": "success"
}
```

---

## Examples

### Flowchart
```json
{
  "nodes": [
    { "id": "start", "label": "Start", "shape": "rounded", "color": "success" },
    { "id": "input", "label": "Input Data", "shape": "parallelogram" },
    { "id": "check", "label": "Valid?", "shape": "diamond", "color": "warning" },
    { "id": "process", "label": "Process", "shape": "rectangle" },
    { "id": "end", "label": "End", "shape": "rounded", "color": "purple" }
  ]
}
```

### Database Diagram
```json
{
  "nodes": [
    { "id": "app", "label": "Application", "shape": "rectangle" },
    { "id": "db", "label": "Database", "shape": "cylinder" },
    { "id": "cache", "label": "Cache", "shape": "cylinder2" }
  ]
}
```

### UML Use Case
```json
{
  "nodes": [
    { "id": "user", "label": "User", "shape": "umlActor" },
    { "id": "system", "label": "System", "shape": "umlBoundary" },
    { "id": "login", "label": "Login", "shape": "ellipse" }
  ]
}
```
