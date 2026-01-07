# Draw.io MCP Controller

让 Claude 直接操作 Draw.io 画布，通过单次脚本执行实现高效绘图。

## 架构

```
┌─────────────┐                    ┌──────────────────┐                    ┌─────────────────────────┐
│   Claude    │  MCP Protocol      │   MCP Server     │   HTTP Polling     │   Draw.io Plugin        │
│   + Skill   │ ◄────────────────► │  (port 3000)     │ ◄────────────────► │   (MCP Executor)        │
└─────────────┘                    └──────────────────┘                    └─────────────────────────┘
```

**核心优势**: 单次脚本执行，一次调用完成整个图表绘制

```
原子化方案: 画5节点4连线 = 9次调用 × 2秒 = 18秒
单次脚本方案: 画5节点4连线 = 1次调用 × 2秒 = 2秒
```

## 项目结构

```
draw-io-mcp/
├── .claude/skills/drawio/    # Claude Skill (自动发现)
│   └── SKILL.md
├── local-mcp-server/         # MCP Server
│   ├── package.json
│   └── index.js
├── drawio-server/            # Draw.io Docker 部署
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── plugins/
│       └── mcp-executor.js   # MCP 执行器 + AI_HLP 只读工具
└── README.md
```

## 快速开始

### 1. 部署 Draw.io Server

```bash
cd drawio-server
docker compose up -d
```

Draw.io 将在 `http://localhost:18080` 可用

### 2. 启动 MCP Server

```bash
cd local-mcp-server
npm install
npm start
```

### 3. 配置 Claude Code

运行安装脚本（配置全局 Skill + MCP Server）:

```bash
./install.sh
```

或手动配置:

```bash
# 安装全局 Skill
mkdir -p ~/.claude/skills/drawio
cp .claude/skills/drawio/SKILL.md ~/.claude/skills/drawio/

# 添加全局 MCP Server
claude mcp add drawio --scope user node $(pwd)/local-mcp-server/index.js
```

### 4. 打开 Draw.io

访问并加载插件:

```
http://localhost:18080/?p=plugins/mcp-executor.js&mcp=http://localhost:3000
```

参数说明:
- `p=plugins/mcp-executor.js` - 加载 MCP 执行器插件
- `mcp=http://localhost:3000` - MCP Server 地址 (默认值)

### 5. 验证

1. 打开上述 URL
2. 右上角显示 🟢 **MCP: Untitled** 表示连接成功
3. 让 Claude: "画一个用户登录流程图"

## 绘图方式（原生 mxGraph）

浏览器插件只负责执行脚本，**绘图需使用原生 mxGraph API**（避免 AI_HLP 造成的节点/连线歧义）:

```javascript
const graph = ui.editor.graph;
const parent = graph.getDefaultParent();
const model = graph.getModel();

const baseStyle = 'whiteSpace=wrap;html=1;';
const nodeStyle = baseStyle + 'rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;';
const edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=1;';

model.beginUpdate();
try {
  const start = graph.insertVertex(parent, null, '开始', 40, 60, 80, 40, nodeStyle);
  const step = graph.insertVertex(parent, null, '处理', 200, 60, 100, 50, nodeStyle);
  graph.insertEdge(parent, null, '', start, step, edgeStyle);
} finally {
  model.endUpdate();
}
```

## AI_HLP 只读工具

AI_HLP 只保留查询/导出能力，不提供绘图、清空、布局等写操作:

| 函数 | 说明 |
|------|------|
| `AI_HLP.getCanvasInfo()` | 获取画布信息 |
| `AI_HLP.getAllCells()` | 获取所有元素 |
| `AI_HLP.getSelection()` | 获取选中元素 |
| `AI_HLP.exportSvg()` | 导出 SVG |
| `AI_HLP.exportPng()` | 导出 PNG |
| `AI_HLP.getXml()` | 获取 XML |

## MCP Tool

只有一个工具:

| Tool | 描述 |
|------|------|
| `execute_script` | 在 Draw.io 浏览器环境执行 JavaScript，绘图使用原生 mxGraph，AI_HLP 仅用于查询/导出 |

## 示例

> 用户: 画一个三层架构图

Claude 调用:
```javascript
const graph = ui.editor.graph;
const parent = graph.getDefaultParent();
const model = graph.getModel();

const baseStyle = 'whiteSpace=wrap;html=1;';
const nodeStyle = baseStyle + 'rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;';
const dbStyle = baseStyle + 'shape=cylinder3;boundedLbl=1;fillColor=#e1d5e7;strokeColor=#9673a6;';
const userStyle = baseStyle + 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;';
const edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=1;';

model.beginUpdate();
try {
  const user = graph.insertVertex(parent, null, '用户', 40, 80, 80, 40, userStyle);
  const web = graph.insertVertex(parent, null, 'Web 层', 200, 60, 100, 50, nodeStyle);
  const api = graph.insertVertex(parent, null, 'API 层', 360, 60, 100, 50, nodeStyle);
  const db = graph.insertVertex(parent, null, '数据库', 520, 60, 100, 60, dbStyle);

  graph.insertEdge(parent, null, '', user, web, edgeStyle);
  graph.insertEdge(parent, null, '', web, api, edgeStyle);
  graph.insertEdge(parent, null, '', api, db, edgeStyle);
} finally {
  model.endUpdate();
}
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 红色 Disconnected | 检查 MCP Server 是否运行 (`npm start`) |
| 插件没加载 | 确保 URL 带 `?p=plugins/mcp-executor.js` |
| Claude 超时 | 检查 Draw.io 页面是否打开并已连接 |
| 端口冲突 | 修改 docker-compose.yml 端口映射 |
