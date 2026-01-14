#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$1" ]; then
    echo "Usage: $0 <project-path>"
    echo "Example: $0 ~/code/aig_demo"
    exit 1
fi

PROJECT_PATH="$1"

if [ ! -d "$PROJECT_PATH" ]; then
    echo "Error: Directory '$PROJECT_PATH' does not exist"
    exit 1
fi

echo "=== Draw.io MCP Project Installer ==="
echo "Project: $PROJECT_PATH"
echo ""

PROJECT_CLAUDE_DIR="$PROJECT_PATH/.claude"
PROJECT_SKILL_DIR="$PROJECT_CLAUDE_DIR/skills/drawio"
PROJECT_MCP_FILE="$PROJECT_CLAUDE_DIR/.mcp.json"
PROJECT_OPENCODE_FILE="$PROJECT_PATH/opencode.json"

echo "[1/4] Creating skill directory..."
mkdir -p "$PROJECT_SKILL_DIR"
cp -r "$SCRIPT_DIR/.claude/skills/drawio/"* "$PROJECT_SKILL_DIR/"
echo "  -> $PROJECT_SKILL_DIR/"

echo "[2/4] Creating .mcp.json..."
mkdir -p "$PROJECT_CLAUDE_DIR"
cat > "$PROJECT_MCP_FILE" <<EOF
{
  "mcpServers": {
    "drawio-controller": {
      "command": "node",
      "args": [
        "$SCRIPT_DIR/local-mcp-server/index.js"
      ]
    }
  }
}
EOF
echo "  -> $PROJECT_MCP_FILE"

echo "[3/4] Creating .opencode.json..."
cat > "$PROJECT_OPENCODE_FILE" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "mcp": {
    "drawio-controller": {
      "type": "local",
      "command": ["node", "$SCRIPT_DIR/local-mcp-server/index.js"],
      "enabled": true
    }
  }
}
EOF
echo "  -> $PROJECT_OPENCODE_FILE"

echo "[4/4] Verifying installation..."
echo "  Skills: $(ls $PROJECT_SKILL_DIR/SKILL.md 2>/dev/null && echo 'OK' || echo 'FAIL')"
echo "  MCP: $(ls $PROJECT_MCP_FILE 2>/dev/null && echo 'OK' || echo 'FAIL')"
echo "  OpenCode: $(ls $PROJECT_OPENCODE_FILE 2>/dev/null && echo 'OK' || echo 'FAIL')"

echo ""
echo "=== Installation Complete ==="
echo "Project-level configuration installed at: $PROJECT_PATH"
