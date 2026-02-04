# Draft: Unified JSON + ELK Constraint Layout Architecture

## Requirements (confirmed)
- **Bidirectional**: Read mxGraph → JSON, Write JSON → ELK → mxGraph
- **Constraint Layout**: `fixed: true` nodes keep position, `fixed: false` get computed by ELK
- **Edge Routing**: ELK handles automatic orthogonal edge routing
- **Backward Compatible**: Keep existing `execute_script` tool working
- **Style Preservation**: Full style information preserved in JSON

## Technical Decisions

### Current Architecture Understanding
- MCP Server uses `@modelcontextprotocol/sdk` with zod for tool definitions
- WebSocket communication: Server (port 3000) ↔ Browser Plugin
- Command flow: `sendCommand(action, params)` → WebSocket → `executeCommand(cmd)` → result
- AI_HLP provides read-only helpers (getAllCells, getXml, etc.)
- Native mxGraph API required for writing (insertVertex, insertEdge)

### Tool Definition Pattern
```javascript
server.tool(
    'tool_name',
    'Description',
    { param: z.string().describe('...') },
    async ({ param }) => {
        const result = await sendCommand('action_name', { param });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
);
```

### Plugin Command Handler Pattern
- Scripts executed via `new Function('graph', 'ui', 'editor', 'model', 'AI_HLP', script)`
- Results sent back with matching `commandId`

## Research Findings

### Codebase Exploration (completed)
- `local-mcp-server/index.js`: Single `execute_script` tool, WebSocket server
- `drawio-server/plugins/mcp-executor.js`: Command executor, AI_HLP helpers
- `.claude/skills/drawio/SKILL.md`: AI instructions for mxGraph usage
- Communication tracked via UUID command IDs with 30s timeout

### ELK.js Research (completed)
- Fixed positions via `layoutOptions: { position: "(x, y)" }` on nodes
- Layered algorithm: `elk.algorithm: 'layered'` with `elk.edgeRouting: 'ORTHOGONAL'`
- Edge output includes `sections` with `startPoint`, `endPoint`, `bendPoints`
- Direction options: LEFT, RIGHT, DOWN, UP

### mxGraph Research (completed)
- Cell properties: id, value, vertex, edge, geometry, style, source, target
- Current AI_HLP.getAllCells() missing: style, source/target IDs for edges
- Need to enhance getAllCells() to include full information

### Key Insight: Hybrid Layout Approach
- Use ELK's `INTERACTIVE` node placement strategy
- Respects existing positions while computing new ones
- Single pass handles both fixed and unfixed nodes

## Open Questions
- [x] ELK.js exact API for fixed node positions → `layoutOptions: { position: "(x, y)" }`
- [x] mxGraph edge routing point structure → geometry.points array
- [x] JSON schema for unified format → Defined below

## JSON Schema (Unified Format)
```javascript
{
  nodes: [{
    id: string,           // mxCell id
    label: string,        // cell value
    x: number,            // geometry.x
    y: number,            // geometry.y
    width: number,        // geometry.width
    height: number,       // geometry.height
    fixed: boolean,       // true = keep position, false = ELK computes
    style: string         // full mxGraph style string
  }],
  edges: [{
    id: string,           // mxCell id
    source: string,       // source node id
    target: string,       // target node id
    label: string,        // edge label
    style: string         // full mxGraph style string
  }],
  layout: {
    algorithm: 'layered' | 'fixed',
    direction: 'DOWN' | 'UP' | 'LEFT' | 'RIGHT',
    nodeSpacing: number,
    layerSpacing: number
  }
}
```

## Scope Boundaries
- INCLUDE: get_diagram tool, update_diagram tool, ELK layout module, JSON converter
- INCLUDE: Browser plugin handlers for new actions
- INCLUDE: Skill documentation updates
- EXCLUDE: Changes to existing execute_script tool
- EXCLUDE: UI modifications to Draw.io
