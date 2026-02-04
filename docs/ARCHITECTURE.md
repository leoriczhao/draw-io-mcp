# Draw.io MCP Architecture

## Overview

Draw.io MCP 是一个让 AI 助手（Claude）能够直接操作 Draw.io 画布的桥接系统。核心特性是**统一 JSON 格式 + ELK 自动布局**，LLM 只需描述节点和连接关系，系统自动计算最优布局。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Architecture Layers                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  AI Layer          │  Claude + Skill 定义                                    │
│  Protocol Layer    │  MCP Server (Node.js) + ELK Layout Engine              │
│  Transport Layer   │  WebSocket + HTTP                                      │
│  Execution Layer   │  Browser Plugin (mcp-executor.js)                      │
│  Rendering Layer   │  mxGraph API + Canvas                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Data Flow (核心数据流)

```
┌──────────┐     Unified JSON      ┌────────────┐      ELK Layout      ┌────────────┐
│   LLM    │ ───────────────────► │ MCP Server │ ──────────────────► │  ELK.js    │
│ (Claude) │                      │            │                      │            │
└──────────┘                      └────────────┘                      └────────────┘
                                        │                                   │
                                        │ ◄─────────────────────────────────┘
                                        │   Layouted JSON (with positions)
                                        ▼
                                  ┌────────────┐     WebSocket      ┌─────────────┐
                                  │  Convert   │ ─────────────────► │ MCP Plugin  │
                                  │  to mxGraph│                    │  (Browser)  │
                                  └────────────┘                    └─────────────┘
                                                                          │
                                                                          ▼
                                                                    ┌─────────────┐
                                                                    │  mxGraph    │
                                                                    │   Canvas    │
                                                                    └─────────────┘
```

### 数据格式转换

| 阶段 | 格式 | 示例 |
|------|------|------|
| LLM 输入 | Unified JSON | `{ nodes: [...], edges: [...], layout: { preset: "flowchart" } }` |
| ELK 处理 | ELK Graph | `{ id: "root", children: [...], edges: [...], layoutOptions: {...} }` |
| ELK 输出 | Layouted JSON | `{ nodes: [{ x, y, ... }], edges: [{ exitX, exitY, ... }] }` |
| 浏览器执行 | mxGraph API | `graph.insertVertex(...)`, `graph.insertEdge(...)` |

---

## Layer 1: AI Layer (AI 层)

### 功能边界

| 职责 | 描述 |
|------|------|
| 用户意图理解 | 解析用户的绘图需求 |
| JSON 生成 | 生成统一 JSON 格式的图表描述 |
| 预设选择 | 根据图表类型选择合适的布局预设 |

### 组件

#### Drawio Skill
- **位置**: `.claude/skills/drawio/`
- **核心内容**:
  - 统一 JSON 格式规范
  - 布局预设说明 (flowchart, architecture, workflow, tree, mindmap, compact, spread)
  - mxGraph 样式参考

### LLM 输出示例

```json
{
  "nodes": [
    { "id": "a", "label": "Start", "fixed": false, "style": "ellipse;fillColor=#d5e8d4;" },
    { "id": "b", "label": "Process", "fixed": false }
  ],
  "edges": [
    { "source": "a", "target": "b" }
  ],
  "layout": {
    "preset": "flowchart",
    "direction": "DOWN"
  }
}
```

---

## Layer 2: Protocol Layer (协议层)

### 功能边界

| 职责 | 描述 |
|------|------|
| MCP 协议处理 | 接收和响应 MCP 工具调用 |
| JSON 验证 | 验证输入 JSON 格式 |
| ELK 布局 | 调用 ELK 引擎计算节点位置和边路由 |
| 格式转换 | Unified JSON ↔ ELK Graph ↔ mxGraph |

### 组件

#### MCP Server
- **位置**: `local-mcp-server/index.js`
- **端口**: 3000
- **版本**: v4.0.0

#### 依赖模块

```
local-mcp-server/
├── index.js                 # MCP Server 入口
└── lib/
    ├── elk-presets.js       # ELK 布局预设配置
    ├── elk-layout.js        # ELK 布局引擎封装
    ├── json-converter.js    # JSON 格式转换
    └── server.js            # 模块化管理器
```

### MCP Tools

**Drawing Tools (绘图工具)**

| Tool | 描述 | 参数 |
|------|------|------|
| `update_diagram` | 创建/更新图表 (推荐) | `diagram` (JSON), `clearCanvas` |
| `get_diagram` | 读取当前图表为 JSON | - |
| `execute_script` | 执行原生 mxGraph 脚本 | `script` (JS code) |

**Platform Tools (平台工具)**

| Tool | 描述 | 参数 |
|------|------|------|
| `get_pages` | 获取所有页面列表 | - |
| `create_page` | 创建新页面并切换 | `name` |
| `select_page` | 切换到指定页面 | `index` 或 `name` |
| `rename_page` | 重命名当前页面 | `name` |

### update_diagram 处理流程

```javascript
async function handleUpdateDiagram(diagram, clearCanvas) {
    // 1. 解析 JSON
    const json = JSON.parse(diagram);
    
    // 2. 验证格式
    const validation = validateJson(json);
    
    // 3. ELK 布局 (核心)
    const layoutedDiagram = await layoutWithConstraints(json);
    
    // 4. 发送到浏览器
    return await sendCommand('apply_diagram_json', { 
        diagram: layoutedDiagram,
        clearCanvas 
    });
}
```

---

## ELK Layout Engine (ELK 布局引擎)

### 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        ELK Layout Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Unified JSON ──► jsonToElk() ──► ELK Graph                     │
│                                      │                           │
│                                      ▼                           │
│                              elk.layout()                        │
│                                      │                           │
│                                      ▼                           │
│  Layouted JSON ◄── elkToJson() ◄── ELK Result                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 预设配置 (elk-presets.js)

基于 Dify、Reaflow、LogicFlow 等生产项目的配置优化。

| 预设 | 算法 | 方向 | 边路由 | 适用场景 |
|------|------|------|--------|----------|
| `flowchart` | layered | DOWN | ORTHOGONAL | 流程图、决策树 |
| `architecture` | layered | DOWN | ORTHOGONAL | 系统架构、组件图 |
| `workflow` | layered | RIGHT | SPLINES | 工作流、数据管道 |
| `tree` | mrtree | DOWN | - | 组织架构、层级结构 |
| `mindmap` | mrtree | RIGHT | - | 思维导图 |
| `compact` | layered | DOWN | ORTHOGONAL | 紧凑布局 |
| `spread` | layered | DOWN | ORTHOGONAL | 宽松布局 |

### 核心 ELK 配置

```javascript
const BASE_OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.crossingMinimization.greedySwitch.type': 'TWO_SIDED',
    'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
    'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
    'elk.separateConnectedComponents': 'true',
    'elk.layered.thoroughness': '10'
};
```

### ELK → mxGraph 映射

ELK 计算的边连接点通过相对坐标映射到 mxGraph：

```javascript
// ELK 返回绝对坐标
section.startPoint = { x: 62, y: 73 }

// 转换为 mxGraph 相对坐标 (0-1)
exitX = (startPoint.x - node.x) / node.width;   // 如 0.33
exitY = (startPoint.y - node.y) / node.height;  // 如 1.0

// mxGraph 使用这些值定位边的连接点
style = `exitX=${exitX};exitY=${exitY};entryX=${entryX};entryY=${entryY};`
```

---

## Layer 3: Transport Layer (传输层)

### WebSocket 通信

- **URL**: `ws://localhost:3000`
- **消息格式**:

```typescript
// 请求 (Server → Browser)
{ 
    id: string,           // 命令 ID
    action: string,       // 'apply_diagram_json' | 'execute_script' | ...
    diagram?: object,     // 图表数据
    script?: string       // 脚本内容
}

// 响应 (Browser → Server)
{ 
    type: 'result', 
    commandId: string, 
    result: { success: boolean, result?: any, error?: string } 
}
```

---

## Layer 4: Execution Layer (执行层)

### MCP Plugin (mcp-executor.js)

- **位置**: `drawio-server/plugins/mcp-executor.js`
- **版本**: v3

### 命令处理

| Action | 描述 |
|--------|------|
| `apply_diagram_json` | 应用布局后的 JSON 到画布 |
| `get_diagram_json` | 读取画布为 JSON |
| `execute_script` | 执行原生 mxGraph 脚本 |
| `get_pages` | 获取页面列表 |
| `create_page` | 创建新页面 |
| `select_page` | 切换页面 |
| `rename_page` | 重命名页面 |

### 标签换行处理

```javascript
// 写入时: \n → <br>
function toHtmlLabel(text) {
    return String(text)
        .replace(/\\\\n/g, '<br>')
        .replace(/\\n/g, '<br>')
        .replace(/\n/g, '<br>');
}

// 读取时: <br> → \n
function fromHtmlLabel(text) {
    return String(text).replace(/<br\s*\/?>/gi, '\n');
}
```

### AI_HLP (Read-only Helpers)

| 函数 | 返回值 | 描述 |
|------|--------|------|
| `getDiagramJson()` | `{ nodes, edges, layout }` | 统一 JSON 格式 |
| `getAllCells()` | `[{ id, label, type, geometry }]` | 所有元素列表 |
| `getSelection()` | `[{ id, label, type }]` | 选中元素 |
| `getPages()` | `[{ index, name, current }]` | 页面列表 |
| `exportSvg()` | `string` | SVG 导出 |
| `getXml()` | `string` | mxGraph XML |

---

## Unified JSON Schema (统一 JSON 格式)

### Node

```javascript
{
    "id": "unique_id",        // Required: 唯一标识
    "label": "Display Text",  // Optional: 显示文本 (支持 \n 换行)
    "x": 100,                 // Optional: x 坐标 (fixed=true 时必需)
    "y": 200,                 // Optional: y 坐标 (fixed=true 时必需)
    "width": 120,             // Optional: 宽度 (默认 120)
    "height": 60,             // Optional: 高度 (默认 60)
    "fixed": false,           // Required: true=保持位置, false=自动布局
    "style": "rounded=1;..."  // Optional: mxGraph 样式
}
```

### Edge

```javascript
{
    "id": "edge_id",          // Optional: 自动生成
    "source": "node_id",      // Required: 源节点 ID
    "target": "node_id",      // Required: 目标节点 ID
    "label": "Edge Label",    // Optional: 边标签
    "style": "dashed=1;..."   // Optional: mxGraph 样式
}
```

### Layout

```javascript
{
    "preset": "flowchart",       // 预设: flowchart|architecture|workflow|tree|mindmap|compact|spread
    "direction": "DOWN",         // 方向: DOWN|UP|LEFT|RIGHT
    "nodeSpacing": 50,           // 节点间距
    "layerSpacing": 80,          // 层间距
    "edgeRouting": "ORTHOGONAL", // 边路由: ORTHOGONAL|SPLINES
    "elkOptions": {}             // 高级: 原始 ELK 选项覆盖
}
```

---

## File Structure (文件结构)

```
draw-io-mcp/
├── local-mcp-server/           # Protocol Layer
│   ├── package.json
│   ├── index.js                # MCP Server 入口
│   └── lib/
│       ├── elk-presets.js      # ELK 布局预设
│       ├── elk-layout.js       # ELK 布局引擎
│       ├── json-converter.js   # JSON 格式转换
│       └── server.js           # 模块化管理器
│
├── drawio-server/              # Execution + Rendering Layer
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── PostConfig.js           # 插件自动加载
│   └── plugins/
│       └── mcp-executor.js     # MCP 执行器插件
│
├── .claude/skills/drawio/      # AI Layer (Skill)
│   ├── SKILL.md
│   ├── reference/
│   │   └── style-guide.md
│   └── templates/
│
├── docs/
│   └── ARCHITECTURE.md         # 本文档
│
├── install.sh
├── AGENTS.md
└── README.md
```

---

## Performance (性能)

| 指标 | 值 | 说明 |
|------|-----|------|
| 命令超时 | 30s | `COMMAND_TIMEOUT` |
| 重连间隔 | 3s | `RECONNECT_INTERVAL` |
| ELK 布局 | ~100ms | 10 节点图表 |
| 端到端延迟 | ~500ms | 从 LLM 调用到画布更新 |

---

## Troubleshooting (故障排除)

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 红色 Disconnected | MCP Server 未运行 | `cd local-mcp-server && npm start` |
| 插件未加载 | Docker 未重建 | `cd drawio-server && docker compose up -d --build` |
| 布局异常 | 预设不匹配 | 尝试其他 preset 或调整 spacing |
| 边连接点错误 | ELK 配置问题 | 检查 elkOptions 覆盖 |
| 换行显示为 `<br>` | 插件版本旧 | 重建 Docker 镜像 |
