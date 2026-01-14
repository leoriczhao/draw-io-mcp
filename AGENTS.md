# AGENTS.md - Draw.io MCP Server

> Guidelines for AI coding agents working in this repository.

## Project Overview

MCP server enabling AI assistants to create diagrams in Draw.io via native mxGraph API.

```
local-mcp-server/    # Node.js MCP server (HTTP + WebSocket)
drawio-server/       # Dockerized Draw.io with browser plugins
.claude/skills/      # Claude skill definitions and templates
```

## Build & Run Commands

```bash
# Full installation
./install.sh

# Manual setup
cd local-mcp-server && npm install
cd drawio-server && docker compose up -d
```

| Command | Location | Description |
|---------|----------|-------------|
| `npm start` | `local-mcp-server/` | Start MCP server |
| `docker compose up -d` | `drawio-server/` | Start Draw.io |
| `docker compose up -d --build` | `drawio-server/` | Rebuild Draw.io |
| `docker compose logs -f` | `drawio-server/` | View logs |

**Ports:** 3000 (MCP), 18080 (Draw.io)

## Testing

| Command | Location | Description |
|---------|----------|-------------|
| `npm test` | `local-mcp-server/` | Run all tests |
| `npm run test:watch` | `local-mcp-server/` | Run tests in watch mode |
| `npm run test:coverage` | `local-mcp-server/` | Run tests with coverage report |

**Test Structure:**
- `tests/server.test.js` - Unit tests for command/client managers
- `tests/http.test.js` - HTTP endpoint integration tests
- `tests/websocket.test.js` - WebSocket integration tests
- `tests/plugin.test.js` - Browser plugin logic tests (AI_HLP, executeCommand)

**Manual verification workflow:**
1. Start both services
2. Open `http://localhost:18080/?offline=1&p=mcp`
3. Verify green status indicator
4. Test via Claude

## Code Style Guidelines

### Language & Runtime

- **JavaScript (ES Modules)** - No TypeScript
- **Node.js** for server, **Browser** for plugins
- **4-space indentation**, single quotes, semicolons required
- **Arrow functions** preferred, **async/await** for async code

### Import Pattern (ES Modules)

```javascript
// External dependencies first
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import express from 'express';

// Node built-ins last
import http from 'http';
```

### Naming Conventions

| Type | Convention | Examples |
|------|------------|----------|
| Variables | camelCase | `activeClient`, `pendingResults` |
| Constants | UPPER_SNAKE_CASE | `COMMAND_TIMEOUT`, `HTTP_PORT` |
| Functions | camelCase | `sendCommand`, `executeCommand` |
| Global objects | UPPER_SNAKE_CASE | `AI_HLP`, `SHAPE_STYLES` |
| Plugin globals | Underscore prefix | `window._mcpPluginLoaded` |

### Error Handling

Always use result objects with `success` flag:

```javascript
// Success
return { success: true, result };

// Error
return { success: false, error: 'Descriptive error message' };
```

Wrap async operations:

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

Use prefixed console output:

```javascript
console.error('[MCP] Server started');           // Server logs
console.log('[MCP Plugin] WebSocket connected'); // Plugin logs
console.error('[MCP] Error:', e);                // Errors to stderr
```

## Architecture

**Data Flow:** Claude → MCP Server → WebSocket → Draw.io Browser Plugin

**Key Files:**
- `local-mcp-server/index.js` - MCP server implementation
- `drawio-server/plugins/mcp-executor.js` - Browser plugin
- `.claude/skills/drawio/SKILL.md` - Skill definition
- `.claude/skills/drawio/reference/style-guide.md` - Style constants

## Draw.io Scripting Guidelines

### CRITICAL: Use Native mxGraph API

**Do NOT use AI_HLP wrapper functions** for diagram creation.

```javascript
// CORRECT
const parent = graph.getDefaultParent();
model.beginUpdate();
try {
    const v1 = graph.insertVertex(parent, null, 'Node', 100, 100, 120, 60, style);
    const v2 = graph.insertVertex(parent, null, 'Node2', 300, 100, 120, 60, style);
    graph.insertEdge(parent, null, '', v1, v2);
} finally {
    model.endUpdate();
}
```

### Required Base Style

```javascript
const baseStyle = 'whiteSpace=wrap;html=1;';
const style = baseStyle + 'rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;';
```

## File Modification Workflow

1. **MCP Server changes** → Edit `local-mcp-server/index.js`, run `npm start`
2. **Browser plugin changes** → Edit `drawio-server/plugins/mcp-executor.js`, then `docker compose up -d --build`
3. **Skill instructions** → Edit `.claude/skills/drawio/SKILL.md`
4. **Style constants** → Edit `.claude/skills/drawio/reference/style-guide.md`

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol |
| `express` | HTTP server |
| `ws` | WebSocket |
| `zod` | Schema validation |
| `cors` | CORS middleware |
| `uuid` | UUID generation |
