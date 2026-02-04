# ELK Edge Perimeter Fix - Implementation Plan

## TL;DR

> **Quick Summary**: Fix edge connection issues where ELK-calculated edge points connect to bounding boxes instead of actual shape perimeters for non-rectangular shapes (rhombus/diamond). The solution uses **Approach B (Hybrid)**: disable mxGraph's perimeter projection with `exitPerimeter=0;entryPerimeter=0;` and use shape-aware snapping in json-converter.js.
> 
> **Deliverables**:
> - Modified `json-converter.js` with shape-aware anchor calculation and perimeter bypass
> - Modified `mcp-executor.js` to apply perimeter bypass styles
> - Comprehensive test coverage for all shape types
> - Visual verification via Playwright
> 
> **Estimated Effort**: Medium (4-6 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 3 → Task 5

---

## Context

### Original Request
Fix the fundamental incompatibility between ELK's edge output (absolute pixel coordinates) and mxGraph's edge connection system (perimeter-based). Edges must connect to actual shape perimeters for ALL shapes, especially rhombus/diamond vertices.

### Interview Summary
**Key Discussions**:
- ELK outputs `startPoint/endPoint` as absolute coordinates on node boundaries
- Current conversion to `exitX/exitY` (0-1 scale) works for rectangles
- mxGraph's default `exitPerimeter=1` projects points to shape perimeter
- For rhombus shapes, this causes edges to connect to bounding box corners instead of diamond vertices

**Research Findings**:
- **mxGraph Perimeter System**: `exitPerimeter=0` bypasses perimeter projection entirely, using exact coordinates
- **RhombusPerimeter function**: Exists in mxGraph but only works when perimeter projection is enabled
- **Production solutions** (Sprotty, Reaflow, JointJS): Use ELK coordinates directly without anchor conversion
- **Current code**: Has `snapToRhombusVertex()` but perimeter projection overrides it

### Root Cause Analysis
```
Current Flow (BROKEN for non-rectangles):
1. ELK outputs startPoint at diamond vertex (e.g., top: center-x, top-y)
2. json-converter calculates exitX=0.5, exitY=0 (correct!)
3. snapToRhombusVertex snaps to (0.5, 0) (correct!)
4. mcp-executor applies style with exitX=0.5;exitY=0;
5. mxGraph sees exitPerimeter=1 (default) → projects (0.5, 0) through RhombusPerimeter
6. RhombusPerimeter calculates intersection from CENTER to (0.5, 0) → returns DIFFERENT point
7. Edge connects to wrong location on diamond
```

**The Fix**: Set `exitPerimeter=0;entryPerimeter=0;` to use our pre-calculated coordinates directly.

---

## Work Objectives

### Core Objective
Ensure edges connect to correct perimeter points for ALL shapes by bypassing mxGraph's perimeter projection and using shape-aware coordinate calculation.

### Concrete Deliverables
- `local-mcp-server/lib/json-converter.js` - Enhanced with perimeter bypass and multi-shape support
- `drawio-server/plugins/mcp-executor.js` - Apply perimeter bypass styles
- `local-mcp-server/tests/json-converter.test.js` - New test cases for shape-aware snapping
- Visual verification screenshots in `.sisyphus/evidence/`

### Definition of Done
- [ ] Edges connect to rhombus vertices (top/bottom/left/right), not bounding box corners
- [ ] Edges connect to ellipse perimeters, not bounding box edges
- [ ] Rectangular shapes continue to work correctly
- [ ] All existing tests pass
- [ ] New shape-specific tests pass
- [ ] Visual verification via Playwright confirms correct rendering

### Must Have
- `exitPerimeter=0;entryPerimeter=0;` applied to all ELK-routed edges
- Shape detection for: rectangle, rhombus, ellipse
- Vertex snapping for rhombus shapes
- Perimeter point calculation for ellipse shapes

### Must NOT Have (Guardrails)
- Do NOT modify ELK library itself
- Do NOT break existing rectangle edge routing
- Do NOT add complex perimeter calculations that duplicate mxGraph internals
- Do NOT change the unified JSON format schema
- Do NOT add new dependencies

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL verification is executed by the agent using tools (Playwright, Bash).

### Test Decision
- **Infrastructure exists**: YES (vitest configured)
- **Automated tests**: YES (Tests-after approach)
- **Framework**: vitest

### Agent-Executed QA Scenarios (MANDATORY)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| Unit tests | Bash (npm test) | Run vitest, assert pass |
| Visual rendering | Playwright | Navigate to Draw.io, apply diagram, screenshot, verify edge positions |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Add shape detection utilities to json-converter.js
└── Task 2: Add ellipse perimeter calculation to json-converter.js

Wave 2 (After Wave 1):
├── Task 3: Integrate perimeter bypass in elkToJson
└── Task 4: Update mcp-executor.js edge styling

Wave 3 (After Wave 2):
└── Task 5: Add comprehensive tests

Wave 4 (After Wave 3):
└── Task 6: Visual verification with Playwright
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | 5, 6 | 4 |
| 4 | None | 6 | 3 |
| 5 | 3 | 6 | None |
| 6 | 3, 4, 5 | None | None (final) |

---

## TODOs

- [ ] 1. Add Shape Detection Utilities

  **What to do**:
  - Add `isEllipseShape(style)` function to detect ellipse/circle shapes
  - Refactor `isRhombusShape(style)` to be more robust (handle more style variations)
  - Add `getShapeType(style)` utility that returns 'rectangle' | 'rhombus' | 'ellipse' | 'unknown'
  - Handle style variations: `shape=ellipse`, `ellipse`, `shape=rhombus`, `rhombus`

  **Must NOT do**:
  - Do not add detection for shapes we don't handle (triangle, hexagon, etc.)
  - Do not modify the function signatures of existing exports

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused utility functions with clear patterns to follow
  - **Skills**: []
    - No special skills needed - straightforward JavaScript
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI work, just utility functions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `local-mcp-server/lib/json-converter.js:70-73` - Existing `isRhombusShape()` pattern to extend

  **Style Variations to Handle**:
  - Rhombus: `rhombus`, `shape=rhombus`, `mxgraph.basic.diamond`
  - Ellipse: `ellipse`, `shape=ellipse`, `shape=ellipse;`

  **Acceptance Criteria**:

  - [ ] `isEllipseShape('shape=ellipse;fillColor=#fff;')` returns `true`
  - [ ] `isEllipseShape('ellipse;rounded=1;')` returns `true`
  - [ ] `isRhombusShape('shape=rhombus;')` returns `true`
  - [ ] `getShapeType('rounded=1;fillColor=#dae8fc;')` returns `'rectangle'`
  - [ ] `getShapeType('shape=rhombus;')` returns `'rhombus'`
  - [ ] `getShapeType('ellipse;')` returns `'ellipse'`

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Shape detection unit tests pass
    Tool: Bash
    Preconditions: In local-mcp-server directory
    Steps:
      1. cd local-mcp-server && npm test -- --grep "shape detection"
      2. Assert: All tests pass (exit code 0)
    Expected Result: Shape detection functions work correctly
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(json-converter): add shape detection utilities for ellipse and improved rhombus detection`
  - Files: `local-mcp-server/lib/json-converter.js`
  - Pre-commit: `npm test`

---

- [ ] 2. Add Ellipse Perimeter Point Calculation

  **What to do**:
  - Add `snapToEllipsePerimeter(x, y)` function
  - Calculate the point on ellipse perimeter closest to the given normalized coordinate
  - Use parametric ellipse equation: `x = 0.5 + 0.5*cos(θ)`, `y = 0.5 + 0.5*sin(θ)`
  - Find θ that minimizes distance to input point

  **Must NOT do**:
  - Do not implement complex iterative algorithms - use direct angle calculation
  - Do not handle rotated ellipses (not supported by ELK anyway)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single mathematical function with clear formula
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `ultrabrain`: Overkill for simple trigonometry

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `local-mcp-server/lib/json-converter.js:82-102` - Existing `snapToRhombusVertex()` pattern

  **Mathematical Reference**:
  - Ellipse perimeter point: Given point (px, py) relative to center (0.5, 0.5), calculate angle θ = atan2(py - 0.5, px - 0.5), then perimeter point is (0.5 + 0.5*cos(θ), 0.5 + 0.5*sin(θ))

  **Acceptance Criteria**:

  - [ ] `snapToEllipsePerimeter(0.5, 0)` returns approximately `{x: 0.5, y: 0}` (top)
  - [ ] `snapToEllipsePerimeter(1, 0.5)` returns approximately `{x: 1, y: 0.5}` (right)
  - [ ] `snapToEllipsePerimeter(0.75, 0.25)` returns point ON the ellipse perimeter
  - [ ] Function handles edge cases (center point defaults to top)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Ellipse perimeter calculation tests pass
    Tool: Bash
    Preconditions: In local-mcp-server directory
    Steps:
      1. cd local-mcp-server && npm test -- --grep "ellipse perimeter"
      2. Assert: All tests pass (exit code 0)
    Expected Result: Ellipse snapping works correctly
    Evidence: Test output captured
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `feat(json-converter): add ellipse perimeter point calculation`
  - Files: `local-mcp-server/lib/json-converter.js`
  - Pre-commit: `npm test`

---

- [ ] 3. Integrate Perimeter Bypass in elkToJson

  **What to do**:
  - Modify `elkToJson()` to add `exitPerimeter` and `entryPerimeter` flags to edge results
  - Apply shape-specific snapping based on source/target node shapes:
    - Rectangle: Use raw ELK coordinates (already correct)
    - Rhombus: Use existing `snapToRhombusVertex()`
    - Ellipse: Use new `snapToEllipsePerimeter()`
  - Set `edgeResult.exitPerimeter = 0` and `edgeResult.entryPerimeter = 0` for ALL edges

  **Must NOT do**:
  - Do not change the edge result schema beyond adding the perimeter flags
  - Do not modify node processing logic
  - Do not break existing bend point handling

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Integration work combining utilities from Tasks 1 & 2
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - None applicable

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `local-mcp-server/lib/json-converter.js:152-190` - Current edge processing in `elkToJson()`
  - `local-mcp-server/lib/json-converter.js:162-167` - Existing rhombus snapping integration

  **Key Code Location**:
  - Lines 158-171: Source point calculation (add ellipse handling + exitPerimeter)
  - Lines 172-185: Target point calculation (add ellipse handling + entryPerimeter)

  **Acceptance Criteria**:

  - [ ] `elkToJson()` returns edges with `exitPerimeter: 0` property
  - [ ] `elkToJson()` returns edges with `entryPerimeter: 0` property
  - [ ] Rhombus source nodes have `exitX/exitY` snapped to vertices
  - [ ] Ellipse source nodes have `exitX/exitY` on ellipse perimeter
  - [ ] Rectangle nodes use raw ELK coordinates unchanged
  - [ ] All existing `elkToJson` tests still pass

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: elkToJson produces correct edge properties
    Tool: Bash
    Preconditions: In local-mcp-server directory
    Steps:
      1. cd local-mcp-server && npm test -- --grep "elkToJson"
      2. Assert: All tests pass (exit code 0)
      3. Assert: Output includes tests for exitPerimeter/entryPerimeter
    Expected Result: Edge conversion includes perimeter bypass flags
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(json-converter): integrate perimeter bypass and multi-shape snapping in elkToJson`
  - Files: `local-mcp-server/lib/json-converter.js`
  - Pre-commit: `npm test`

---

- [ ] 4. Update mcp-executor.js Edge Styling

  **What to do**:
  - Modify edge style building in `apply_diagram_json` action (lines 217-239)
  - Add `exitPerimeter` and `entryPerimeter` to the style string when present in edge data
  - Ensure these are applied BEFORE any custom edge.style override

  **Must NOT do**:
  - Do not change WebSocket handling or other actions
  - Do not modify node creation logic
  - Do not break existing edge.style override behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused change to existing code pattern
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not UI design work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 6
  - **Blocked By**: None (but logically depends on Task 3 for testing)

  **References**:

  **Pattern References**:
  - `drawio-server/plugins/mcp-executor.js:224-227` - Existing pattern for adding exitX/exitY to style

  **Key Code Location**:
  - Lines 224-227: Add similar pattern for exitPerimeter/entryPerimeter

  **Code Change**:
  ```javascript
  // After line 227, add:
  if (edge.exitPerimeter !== undefined) baseStyle += 'exitPerimeter=' + edge.exitPerimeter + ';';
  if (edge.entryPerimeter !== undefined) baseStyle += 'entryPerimeter=' + edge.entryPerimeter + ';';
  ```

  **Acceptance Criteria**:

  - [ ] Edge style includes `exitPerimeter=0;` when edge.exitPerimeter is 0
  - [ ] Edge style includes `entryPerimeter=0;` when edge.entryPerimeter is 0
  - [ ] Existing edge styling (exitX, exitY, etc.) still works
  - [ ] Custom edge.style still overrides baseStyle

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Plugin applies perimeter bypass styles
    Tool: Bash
    Preconditions: Plugin tests exist
    Steps:
      1. cd local-mcp-server && npm test -- --grep "plugin" || echo "Plugin tests may be in different location"
      2. Verify code change is syntactically correct
    Expected Result: Style building includes perimeter properties
    Evidence: Test output or code review
  ```

  **Commit**: YES
  - Message: `feat(mcp-executor): apply exitPerimeter/entryPerimeter styles from edge data`
  - Files: `drawio-server/plugins/mcp-executor.js`
  - Pre-commit: `npm test`

---

- [ ] 5. Add Comprehensive Test Coverage

  **What to do**:
  - Add test cases for shape detection utilities
  - Add test cases for ellipse perimeter calculation
  - Add test cases for elkToJson with different shape combinations
  - Test edge cases: missing styles, unknown shapes, edge with no sections

  **Must NOT do**:
  - Do not duplicate existing test coverage
  - Do not add integration tests (those are in Task 6)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Standard test writing following existing patterns
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - None applicable

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: Task 6
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `local-mcp-server/tests/json-converter.test.js:1-186` - Existing test structure and patterns

  **Test Cases to Add**:

  ```javascript
  describe('shape detection', () => {
    it('detects rhombus shapes');
    it('detects ellipse shapes');
    it('returns rectangle for standard styles');
    it('handles missing style gracefully');
  });

  describe('snapToEllipsePerimeter', () => {
    it('snaps to top of ellipse');
    it('snaps to right of ellipse');
    it('snaps diagonal point to perimeter');
    it('handles center point');
  });

  describe('elkToJson with shapes', () => {
    it('adds exitPerimeter=0 to all edges');
    it('snaps rhombus source to vertex');
    it('snaps ellipse target to perimeter');
    it('preserves rectangle coordinates');
  });
  ```

  **Acceptance Criteria**:

  - [ ] All new test cases pass
  - [ ] Test coverage includes shape detection edge cases
  - [ ] Test coverage includes perimeter calculation accuracy
  - [ ] `npm test` passes with 0 failures

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All unit tests pass
    Tool: Bash
    Preconditions: In local-mcp-server directory
    Steps:
      1. cd local-mcp-server && npm test
      2. Assert: Exit code 0
      3. Assert: Output shows all tests passing
    Expected Result: Full test suite passes
    Evidence: Test output captured to .sisyphus/evidence/task-5-tests.txt
  ```

  **Commit**: YES
  - Message: `test(json-converter): add comprehensive tests for shape detection and perimeter calculation`
  - Files: `local-mcp-server/tests/json-converter.test.js`
  - Pre-commit: `npm test`

---

- [ ] 6. Visual Verification with Playwright

  **What to do**:
  - Create a test diagram JSON with mixed shapes (rectangle, rhombus, ellipse)
  - Apply diagram via MCP server to Draw.io
  - Take screenshots showing edge connections
  - Verify edges connect to correct perimeter points visually

  **Must NOT do**:
  - Do not create permanent test fixtures
  - Do not modify Draw.io configuration

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual verification requiring browser automation
  - **Skills**: [`playwright`]
    - `playwright`: Required for browser automation and screenshots
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not designing UI, just verifying

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 3, 4, 5

  **References**:

  **Test Diagram JSON**:
  ```json
  {
    "nodes": [
      {"id": "rect1", "label": "Rectangle", "style": "rounded=1;fillColor=#dae8fc;"},
      {"id": "diamond1", "label": "Decision", "style": "shape=rhombus;fillColor=#fff2cc;"},
      {"id": "ellipse1", "label": "Start", "style": "ellipse;fillColor=#d5e8d4;"}
    ],
    "edges": [
      {"source": "rect1", "target": "diamond1"},
      {"source": "diamond1", "target": "ellipse1"},
      {"source": "ellipse1", "target": "rect1"}
    ],
    "layout": {"preset": "flowchart", "direction": "DOWN"}
  }
  ```

  **Verification Points**:
  - Diamond edges connect to vertices (top/bottom), not corners
  - Ellipse edges connect to curved perimeter, not bounding box
  - Rectangle edges connect normally

  **Acceptance Criteria**:

  - [ ] Screenshot shows diamond with edges at vertices
  - [ ] Screenshot shows ellipse with edges on curved perimeter
  - [ ] No edges "floating" away from shapes
  - [ ] No edges "buried" inside shapes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Visual verification of edge connections
    Tool: Playwright (playwright skill)
    Preconditions: MCP server running on localhost:3000, Draw.io on localhost:18080
    Steps:
      1. Navigate to: http://localhost:18080/?offline=1&p=mcp
      2. Wait for: MCP status indicator shows green (timeout: 10s)
      3. Execute via MCP: apply_diagram_json with test diagram
      4. Wait for: diagram to render (timeout: 5s)
      5. Screenshot: .sisyphus/evidence/task-6-mixed-shapes.png
      6. Zoom to diamond node
      7. Screenshot: .sisyphus/evidence/task-6-diamond-detail.png
      8. Assert: Diamond edges visually connect to top/bottom vertices
      9. Zoom to ellipse node
      10. Screenshot: .sisyphus/evidence/task-6-ellipse-detail.png
      11. Assert: Ellipse edges visually connect to curved perimeter
    Expected Result: All edges connect to correct perimeter points
    Evidence: Screenshots in .sisyphus/evidence/

  Scenario: Edge connection with complex flowchart
    Tool: Playwright (playwright skill)
    Preconditions: MCP server and Draw.io running
    Steps:
      1. Navigate to Draw.io
      2. Apply flowchart with multiple diamonds (decision tree)
      3. Screenshot full diagram
      4. Assert: All diamond edges connect to vertices, not corners
    Expected Result: Complex diagram renders correctly
    Evidence: .sisyphus/evidence/task-6-flowchart.png
  ```

  **Commit**: NO (verification only, no code changes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(json-converter): add shape detection utilities` | json-converter.js | npm test |
| 2 | `feat(json-converter): add ellipse perimeter calculation` | json-converter.js | npm test |
| 3 | `feat(json-converter): integrate perimeter bypass in elkToJson` | json-converter.js | npm test |
| 4 | `feat(mcp-executor): apply perimeter styles` | mcp-executor.js | npm test |
| 5 | `test(json-converter): comprehensive shape tests` | json-converter.test.js | npm test |

---

## Success Criteria

### Verification Commands
```bash
cd local-mcp-server && npm test  # Expected: All tests pass
```

### Final Checklist
- [ ] All "Must Have" present:
  - [ ] exitPerimeter=0;entryPerimeter=0; applied to edges
  - [ ] Shape detection for rectangle, rhombus, ellipse
  - [ ] Vertex snapping for rhombus
  - [ ] Perimeter calculation for ellipse
- [ ] All "Must NOT Have" absent:
  - [ ] No ELK library modifications
  - [ ] No broken rectangle routing
  - [ ] No new dependencies
- [ ] All tests pass
- [ ] Visual verification confirms correct edge rendering

---

## Appendix: Technical Details

### Approach Analysis

| Approach | Description | Pros | Cons | Verdict |
|----------|-------------|------|------|---------|
| **A: ELK nodes only** | Let mxGraph handle all edge routing | Simple, uses mxGraph's perimeter system | Loses ELK's crossing minimization, bend points | ❌ Rejected |
| **B: Hybrid (CHOSEN)** | Use ELK edges with `exitPerimeter=0` | Best of both: ELK routing + correct perimeters | Requires shape-aware snapping | ✅ Selected |
| **C: Full ELK polylines** | Convert edges to absolute polylines | Exact ELK output | Loses mxGraph edge features, complex | ❌ Rejected |

### Why Approach B

1. **Preserves ELK's layout quality**: Crossing minimization, bend points, spacing
2. **Fixes the perimeter issue**: `exitPerimeter=0` bypasses mxGraph's projection
3. **Minimal code changes**: Only need to add perimeter flags and shape snapping
4. **Maintains compatibility**: Works with all existing presets and styles

### mxGraph Perimeter Bypass Mechanism

```
With exitPerimeter=1 (default):
  exitX/exitY → project through shape perimeter → connection point

With exitPerimeter=0:
  exitX/exitY → direct connection point (no projection)
```

By setting `exitPerimeter=0`, we tell mxGraph: "Trust our coordinates, don't recalculate."

### Shape-Specific Snapping Logic

```javascript
// Rhombus: Snap to nearest vertex
vertices = [(0.5, 0), (1, 0.5), (0.5, 1), (0, 0.5)]
snap to closest vertex

// Ellipse: Project to perimeter
angle = atan2(y - 0.5, x - 0.5)
perimeterX = 0.5 + 0.5 * cos(angle)
perimeterY = 0.5 + 0.5 * sin(angle)

// Rectangle: Use raw coordinates (already on perimeter)
no snapping needed
```
