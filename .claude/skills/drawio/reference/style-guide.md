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

## Shape Styles

| Shape | Style |
|-------|-------|
| Rectangle | `rounded=0;` |
| Rounded Rect | `rounded=1;` |
| Ellipse | `ellipse;` |
| Diamond | `shape=rhombus;` |
| Parallelogram | `shape=parallelogram;` |
| Cylinder | `shape=cylinder3;` |
| Actor | `shape=umlActor;` |
| Note | `shape=note;` |
| Cloud | `ellipse;shape=cloud;` |

## Edge Styles

| Type | Style |
|------|-------|
| Solid | (default) |
| Dashed | `dashed=1;` |
| No arrow | `endArrow=none;` |
| ER One | `endArrow=ERone;` |
| ER Many | `endArrow=ERmany;` |

## Typography

| Property | Values |
|----------|--------|
| Font size | `fontSize=12;` `fontSize=14;` `fontSize=16;` |
| Bold | `fontStyle=1;` |
| Italic | `fontStyle=2;` |
| Bold+Italic | `fontStyle=3;` |

## Recommended Dimensions

| Element Type | Width | Height |
|--------------|-------|--------|
| Standard node | 120 | 60 |
| Small node | 80 | 40 |
| Wide node | 150 | 50 |
| Decision | 100 | 60 |
| Start/End | 80 | 40 |
| Database | 80 | 50 |

## Complete Style Strings

```
Primary:   fillColor=#dae8fc;strokeColor=#6c8ebf;rounded=1;
Success:   fillColor=#d5e8d4;strokeColor=#82b366;rounded=1;
Warning:   fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;
Error:     fillColor=#f8cecc;strokeColor=#b85450;rounded=1;
Neutral:   fillColor=#f5f5f5;strokeColor=#666666;rounded=1;
Purple:    fillColor=#e1d5e7;strokeColor=#9673a6;rounded=1;
Orange:    fillColor=#ffe6cc;strokeColor=#d79b00;rounded=1;
Database:  shape=cylinder3;fillColor=#f5f5f5;strokeColor=#666666;
Diamond:   shape=rhombus;fillColor=#fff2cc;strokeColor=#d6b656;
```
