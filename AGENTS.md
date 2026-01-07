# AGENTS.md - Draw.io MCP Server

> Guidelines for AI coding agents working in this repository.

## Project Overview

This is a **Model Context Protocol (MCP) server** that enables AI assistants to create diagrams in Draw.io. It consists of:

- **`local-mcp-server/`** - Node.js MCP server (HTTP + WebSocket bridge)
- **`drawio-server/`** - Dockerized Draw.io with custom browser plugins
- **`.claude/skills/drawio/`** - Claude skill definitions and templates

## Build & Run Commands

### Installation

```bash
# Full installation (recommended)
./install.sh

# Manual setup
cd local-mcp-server && npm install
cd drawio-server && docker compose up -d
```

### Running

| Command | Location | Description |
|---------|----------|-------------|
| `npm start` | `local-mcp-server/` | Start MCP server |
| `docker compose up -d` | `drawio-server/` | Start Draw.io container |
| `docker compose up -d --build` | `drawio-server/` | Rebuild and restart Draw.io |
| `docker compose logs -f` | `drawio-server/` | View container logs |

### Ports

- **3000** - MCP server (HTTP + WebSocket)
- **18080** - Draw.io web UI

## Testing

**No automated test framework is configured.** Manual testing workflow:

1. Start services: `docker compose up -d` (drawio-server) + `npm start` (local-mcp-server)
2. Open: `http://localhost:18080/?offline=1&p=mcp`
3. Verify green status indicator (WebSocket connected)
4. Test via Claude: ask to draw a simple diagram

## Code Style Guidelines

### Language & Runtime

- **JavaScript (ES Modules)** - No TypeScript
- **Node.js** for server, **Browser** for plugins

### Formatting

- **4-space indentation**
- **Single quotes** for strings
- **Semicolons** required
- **Arrow functions** preferred for callbacks
- **Async/await** for asynchronous code

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Variables | camelCase | `activeClient`, `pendingResults` |
| Constants | UPPER_SNAKE_CASE | `COMMAND_TIMEOUT`, `HTTP_PORT` |
| Functions | camelCase | `sendCommand`, `executeCommand` |
| Global objects | UPPER_SNAKE_CASE | `AI_HLP`, `SHAPE_STYLES` |
| Plugin globals | Underscore prefix | `window._mcpPluginLoaded` |

### Import Pattern (ES Modules)

```javascript
// External dependencies first
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import express from 'express';

// Node built-ins last
import http from 'http';
```

### Error Handling

Always use result objects with `success` flag:

```javascript
// Success
return { success: true, result };

// Error
return { success: false, error: 'Descriptive error message' };
```

Wrap async operations in try/catch:

```javascript
try {
    const result = await someOperation();
    return { success: true, result };
} catch (e) {
    console.error('[MCP] Operation failed:', e);
    return { success: false, error: e.message };
}
```

### Logging

Use prefixed console output for traceability:

```javascript
console.error('[MCP] Server started');           // Server logs
console.log('[MCP Plugin] WebSocket connected'); // Plugin logs
console.error('[MCP] Error:', e);                // Errors to stderr
```

## Architecture

### Data Flow

```
Claude -> MCP Server (stdio) -> WebSocket -> Draw.io Browser Plugin
                             <- WebSocket <- (results)
```

### Key Files

| File | Purpose |
|------|---------|
| `local-mcp-server/index.js` | MCP server implementation |
| `drawio-server/plugins/mcp-executor.js` | Browser plugin + AI_HLP library |
| `.claude/skills/drawio/SKILL.md` | Skill definition for Claude |
| `.claude/skills/drawio/reference/style-guide.md` | Draw.io style constants |
| `.claude/skills/drawio/templates/*.js` | Diagram template examples |

### MCP Tool

Single tool exposed: `execute_script`

- Executes JavaScript in Draw.io browser context
- Has access to: `graph`, `ui`, `editor`, `model`, `AI_HLP`

## Draw.io Scripting Guidelines

### CRITICAL: Use Native mxGraph API

**Do NOT use the AI_HLP wrapper functions** for diagram creation. Use native mxGraph API instead:

```javascript
// CORRECT - Native mxGraph
const parent = graph.getDefaultParent();
model.beginUpdate();
try {
    const v1 = graph.insertVertex(parent, null, 'Node', 100, 100, 120, 60, style);
    const v2 = graph.insertVertex(parent, null, 'Node2', 300, 100, 120, 60, style);
    graph.insertEdge(parent, null, '', v1, v2);
} finally {
    model.endUpdate();
}

// WRONG - AI_HLP wrapper (has layout issues)
AI_HLP.drawBatch({nodes: [...], edges: [...]});
```

### Required Base Style

Always include in vertex styles:

```javascript
const baseStyle = 'whiteSpace=wrap;html=1;';
const style = baseStyle + 'rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;';
```

### Transaction Pattern

Wrap all modifications in update transactions:

```javascript
model.beginUpdate();
try {
    // All graph modifications here
} finally {
    model.endUpdate();
}
```

### Manual Positioning

Use explicit x/y coordinates rather than auto-layout:

```javascript
graph.insertVertex(parent, null, 'Label', x, y, width, height, style);
```

## File Modification Workflow

1. **MCP Server changes** -> Edit `local-mcp-server/index.js`, run `npm start`
2. **Browser plugin changes** -> Edit `drawio-server/plugins/mcp-executor.js`, then `docker compose up -d --build`
3. **Skill instructions** -> Edit `.claude/skills/drawio/SKILL.md`
4. **Style constants** -> Edit `.claude/skills/drawio/reference/style-guide.md`

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `express` | HTTP server |
| `ws` | WebSocket server |
| `zod` | Schema validation |
| `cors` | CORS middleware |
| `uuid` | UUID generation |

## Common Issues

### WebSocket Not Connecting

- Ensure Draw.io opened with `?offline=1&p=mcp` parameters
- Check MCP server is running on port 3000
- Verify no firewall blocking WebSocket connections

### Script Execution Timeout

- Default timeout: 30 seconds
- Check browser console for JavaScript errors
- Verify Draw.io tab is focused (some browsers throttle background tabs)

### Docker Container Issues

```bash
# View logs
docker compose logs -f

# Restart with rebuild
docker compose down && docker compose up -d --build
```
