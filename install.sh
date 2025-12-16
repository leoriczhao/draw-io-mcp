#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Draw.io MCP Installer ==="

# 1. Install npm dependencies
echo "[1/3] Installing npm dependencies..."
cd "$SCRIPT_DIR/local-mcp-server"
npm install --silent

# 2. Install global Skill
echo "[2/3] Installing global Skill..."
mkdir -p ~/.claude/skills/drawio
cp "$SCRIPT_DIR/.claude/skills/drawio/SKILL.md" ~/.claude/skills/drawio/
echo "  -> ~/.claude/skills/drawio/SKILL.md"

# 3. Add global MCP Server
echo "[3/3] Configuring MCP Server..."
claude mcp remove drawio --scope user 2>/dev/null || true
claude mcp add drawio --scope user node "$SCRIPT_DIR/local-mcp-server/index.js"
echo "  -> Added drawio MCP server (user scope)"

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "  1. Start Draw.io: cd drawio-server && docker compose up -d"
echo "  2. Open: http://localhost:18080/?p=plugins/mcp-executor.js"
echo "  3. Ask Claude: \"Draw a flowchart\""
