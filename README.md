# Draw.io Remote Controller (MCP)

让 Claude 直接操作 Draw.io 画布，通过 mxGraph API 实现实时绘图。

## 架构

```
Claude  <--MCP-->  MCP Server      <--HTTP-->  Draw.io (Docker)
                   (localhost:3000)             (localhost:18080)
                                                     ↓
                                              mcp-executor.js
                                                (mxGraph API)
```

## 项目结构

```
draw-io-mcp/
├── local-mcp-server/       # MCP 服务器
│   ├── package.json
│   └── index.js
├── drawio-server/          # Draw.io Docker 部署
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── plugins/
│       └── mcp-executor.js
└── README.md
```

## 快速开始

### 1. 部署 Draw.io Server (远程服务器)

```bash
cd drawio-server
docker compose up -d
```

Draw.io 将在 `http://your-server:18080` 可用

### 2. 启动 MCP Server (用户本地)

```bash
cd local-mcp-server
npm install
npm start
```

### 3. 配置 Claude Desktop (用户本地)

编辑 `~/.config/Claude/claude_desktop_config.json` (Linux)
或 `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "drawio": {
      "command": "npx",
      "args": ["drawio-mcp"],
      "cwd": "/path/to/local-mcp-server"
    }
  }
}
```

### 4. 使用

访问 Draw.io 并通过 URL 参数加载插件和指定 MCP Server：

```
http://your-server:18080/?p=plugins/mcp-executor.js&mcp=http://localhost:3000
```

参数说明：
- `p=plugins/mcp-executor.js` - 加载 MCP 插件
- `mcp=http://localhost:3000` - 指定本地 MCP Server 地址 (可选，默认 localhost:3000)

### 5. 验证

1. 打开上述 URL
2. 右上角应显示 🟢 **Connected (localhost:3000)**
3. 让 Claude: "在 Draw.io 中画一个流程图"

## MCP Tools

| Tool | 描述 | 参数 |
|------|------|------|
| `add_rect` | 添加矩形 | x, y, width, height, label, style? |
| `add_edge` | 添加连线 | sourceId, targetId, label? |
| `set_style` | 修改样式 | cellId, key, value |
| `get_selection` | 获取选中元素 | - |
| `get_all_cells` | 获取所有元素 | - |
| `clear_diagram` | 清空画布 | - |
| `execute_raw_script` | 执行原生 JS | script |

## 样式参考

常用 mxGraph 样式:
```
fillColor=#d5e8d4      # 填充颜色
strokeColor=#82b366    # 边框颜色
rounded=1              # 圆角
shape=ellipse          # 椭圆
shape=rhombus          # 菱形
```

示例: `rounded=1;fillColor=#d5e8d4;strokeColor=#82b366`

## 示例对话

> 画一个流程图：开始 → 处理 → 结束

Claude 将调用:
```
add_rect(100, 50, 120, 60, "开始", "ellipse;fillColor=#d5e8d4")
add_rect(100, 150, 120, 60, "处理", "")
add_rect(100, 250, 120, 60, "结束", "ellipse;fillColor=#f8cecc")
add_edge(cell1_id, cell2_id)
add_edge(cell2_id, cell3_id)
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 红色 Disconnected | 检查 MCP Server 是否运行 |
| 插件没加载 | 确保 URL 带 `?p=plugins/mcp-executor.js` |
| Claude 超时 | 检查 Draw.io 页面是否打开 |
| 端口冲突 | 修改 docker-compose.yml 中的端口映射 |
