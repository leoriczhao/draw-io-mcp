# Draw.io MCP Architecture

## Overview

Draw.io MCP 是一个让 AI 助手（Claude）能够直接操作 Draw.io 画布的桥接系统。通过 MCP 协议和 WebSocket 通信，实现单次脚本执行完成复杂图表绘制。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Architecture Layers                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  AI Layer          │  Claude + Skill 定义                                    │
│  Protocol Layer    │  MCP Server (Node.js)                                  │
│  Transport Layer   │  WebSocket + HTTP                                      │
│  Execution Layer   │  Browser Plugin (mcp-executor.js)                      │
│  Rendering Layer   │  mxGraph API + Canvas                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: AI Layer (AI 层)

### 功能边界

| 职责 | 描述 |
|------|------|
| 用户意图理解 | 解析用户的绘图需求 |
| 脚本生成 | 根据 Skill 指导生成 mxGraph 脚本 |
| 结果解释 | 将执行结果反馈给用户 |

### 组件

#### Claude (AI Assistant)
- **位置**: 外部 AI 服务
- **输入**: 用户自然语言请求
- **输出**: mxGraph JavaScript 脚本
- **协议**: MCP (Model Context Protocol)

#### Drawio Skill
- **位置**: `.claude/skills/drawio/`
- **文件结构**:
  ```
  .claude/skills/drawio/
  ├── SKILL.md              # 主技能定义
  ├── reference/
  │   └── style-guide.md    # 样式常量参考
  └── templates/            # 图表模板
      ├── flowchart.js
      ├── microservice.js
      ├── rpc-flow.js
      └── database.js
  ```
- **功能**:
  - 提供 mxGraph API 使用指南
  - 定义颜色、样式、尺寸规范
  - 提供常用图表模板

### 边界约束

| 允许 | 禁止 |
|------|------|
| 生成 mxGraph 脚本 | 直接访问文件系统 |
| 调用 execute_script 工具 | 修改服务器配置 |
| 使用 AI_HLP 查询画布 | 执行非绘图操作 |

---

## Layer 2: Protocol Layer (协议层)

### 功能边界

| 职责 | 描述 |
|------|------|
| MCP 协议处理 | 接收和响应 MCP 工具调用 |
| 命令路由 | 将脚本转发到 WebSocket 客户端 |
| 超时管理 | 处理命令超时 (30s) |
| 状态追踪 | 管理 pending 命令和结果 |

### 组件

#### MCP Server
- **位置**: `local-mcp-server/index.js`
- **端口**: 3000
- **传输**: stdio (与 Claude 通信)
- **依赖**:
  ```json
  {
    "@modelcontextprotocol/sdk": "MCP 协议实现",
    "express": "HTTP 服务器",
    "ws": "WebSocket 服务器",
    "zod": "参数验证",
    "uuid": "命令 ID 生成"
  }
  ```

#### execute_script Tool
- **唯一暴露的 MCP 工具**
- **参数**: `script` (string) - JavaScript 代码
- **返回**: `{ success: boolean, result?: any, error?: string }`

### 核心函数

```javascript
// 命令发送
function sendCommand(action, params) {
    // 1. 生成唯一 commandId
    // 2. 创建 pending promise
    // 3. 通过 WebSocket 发送
    // 4. 等待结果或超时
}

// MCP 工具注册
server.tool('execute_script', schema, async ({ script }) => {
    return await sendCommand('execute_script', { script });
});
```

### 边界约束

| 允许 | 禁止 |
|------|------|
| 转发 JavaScript 脚本 | 执行本地文件操作 |
| 管理 WebSocket 连接 | 修改脚本内容 |
| 返回执行结果 | 缓存敏感数据 |

---

## Layer 3: Transport Layer (传输层)

### 功能边界

| 职责 | 描述 |
|------|------|
| WebSocket 连接管理 | 维护与浏览器的双向通信 |
| 消息序列化 | JSON 编码/解码 |
| 健康检查 | 提供 /health 端点 |
| 重连处理 | 客户端断线重连 |

### 组件

#### WebSocket Server
- **URL**: `ws://localhost:3000`
- **消息格式**:
  ```typescript
  // 请求 (Server -> Browser)
  { id: string, action: 'execute_script', script: string }
  
  // 响应 (Browser -> Server)
  { type: 'result', commandId: string, result: { success: boolean, ... } }
  ```

#### HTTP Server
- **端点**:
  | 路径 | 方法 | 描述 |
  |------|------|------|
  | `/health` | GET | 服务状态检查 |
  | `/poll` | GET | 兼容性端点 (已废弃) |
  | `/result` | POST | 兼容性端点 (已废弃) |

### 边界约束

| 允许 | 禁止 |
|------|------|
| 单客户端连接 | 多客户端并发 |
| JSON 消息传输 | 二进制数据传输 |
| 命令超时处理 | 无限等待 |

---

## Layer 4: Execution Layer (执行层)

### 功能边界

| 职责 | 描述 |
|------|------|
| 脚本执行 | 在浏览器环境执行 JavaScript |
| 上下文注入 | 提供 graph, ui, model 等对象 |
| 结果返回 | 将执行结果发送回服务器 |
| 状态显示 | UI 状态指示器 |

### 组件

#### MCP Plugin (mcp-executor.js)
- **位置**: `drawio-server/plugins/mcp-executor.js`
- **加载方式**: 
  1. PostConfig.js 自动加载
  2. URL 参数 `?p=plugins/mcp-executor.js`
- **注入上下文**:
  ```javascript
  const fn = new Function('graph', 'ui', 'editor', 'model', 'AI_HLP', script);
  fn(graph, ui, ui.editor, model, window.AI_HLP);
  ```

#### AI_HLP (Read-only Helpers)
- **位置**: `window.AI_HLP`
- **API**:
  | 函数 | 返回值 | 描述 |
  |------|--------|------|
  | `getCanvasInfo()` | `{ pageCount, currentPageIndex, currentPageName, cellCount }` | 画布元信息 |
  | `getAllCells()` | `[{ id, label, type, geometry }]` | 所有元素列表 |
  | `getSelection()` | `[{ id, label, type }]` | 选中元素 |
  | `exportSvg()` | `string` | SVG 导出 |
  | `exportPng()` | `string` | PNG (Base64 Data URI) |
  | `getXml()` | `string` | mxGraph XML |

### 边界约束

| 允许 | 禁止 |
|------|------|
| 执行 mxGraph API | 访问本地文件系统 |
| 查询画布状态 | 发起外部网络请求 |
| 修改图表内容 | 修改 Draw.io 核心代码 |

---

## Layer 5: Rendering Layer (渲染层)

### 功能边界

| 职责 | 描述 |
|------|------|
| 图形渲染 | 将 mxGraph 模型渲染为 SVG/HTML |
| 用户交互 | 处理鼠标、键盘事件 |
| 布局计算 | 节点位置、边路由 |
| 导出功能 | SVG, PNG, XML 导出 |

### 组件

#### mxGraph API
- **核心对象**:
  | 对象 | 描述 |
  |------|------|
  | `graph` | 主图形对象，提供 insertVertex, insertEdge 等方法 |
  | `model` | 数据模型，管理 beginUpdate/endUpdate 事务 |
  | `parent` | 默认父容器 (graph.getDefaultParent()) |

- **常用 API**:
  ```javascript
  // 创建节点
  graph.insertVertex(parent, id, label, x, y, width, height, style);
  
  // 创建边
  graph.insertEdge(parent, id, label, source, target, style);
  
  // 事务包装
  model.beginUpdate();
  try { /* 操作 */ } finally { model.endUpdate(); }
  ```

#### Canvas (SVG/HTML)
- **渲染目标**: SVG 元素
- **交互层**: HTML overlay
- **样式系统**: mxGraph style string

### 边界约束

| 允许 | 禁止 |
|------|------|
| 图形绑定操作 | 直接 DOM 操作 (推荐通过 API) |
| 样式自定义 | 修改 mxGraph 源码 |
| 事件监听 | 阻塞主线程 |

---

## Infrastructure (基础设施)

### Docker Container

- **镜像**: `jgraph/drawio:latest`
- **端口映射**: `18080:8080`
- **文件挂载**:
  ```yaml
  volumes:
    - ./plugins:/usr/local/tomcat/webapps/draw/plugins
  ```
- **环境变量**:
  | 变量 | 值 | 描述 |
  |------|-----|------|
  | `DRAWIO_SELF_CONTAINED` | `1` | 独立模式 |
  | `DRAWIO_CSP_HEADER` | (见 docker-compose.yml) | 安全策略 |

### PostConfig.js

- **位置**: `drawio-server/PostConfig.js`
- **功能**: Draw.io 初始化后自动加载 MCP 插件
- **机制**:
  ```javascript
  // 等待 Draw 对象就绪
  var checkReady = setInterval(function() {
      if (typeof Draw !== 'undefined' && Draw.loadPlugin) {
          // 动态加载插件脚本
          var script = document.createElement('script');
          script.src = 'plugins/mcp-executor.js';
          document.head.appendChild(script);
      }
  }, 100);
  ```

---

## Data Flow (数据流)

```
┌──────────┐    MCP/stdio    ┌────────────┐    WebSocket    ┌─────────────┐
│  Claude  │ ──────────────► │ MCP Server │ ──────────────► │ MCP Plugin  │
│          │                 │  (Node.js) │                 │  (Browser)  │
└──────────┘                 └────────────┘                 └─────────────┘
     │                             │                              │
     │ 1. 生成脚本                  │ 2. 转发命令                   │ 3. 执行脚本
     │                             │                              │
     ▼                             ▼                              ▼
┌──────────┐                 ┌────────────┐                 ┌─────────────┐
│  Skill   │                 │  Pending   │                 │  mxGraph    │
│ 参考文档  │                 │  Results   │                 │    API      │
└──────────┘                 └────────────┘                 └─────────────┘
                                   │                              │
                                   │ 4. 返回结果                   │
                                   ◄──────────────────────────────┘
```

### 请求生命周期

1. **用户请求**: "画一个流程图"
2. **Claude 处理**: 参考 Skill，生成 mxGraph 脚本
3. **MCP 调用**: `execute_script({ script: "..." })`
4. **服务器转发**: WebSocket 发送 `{ id, action, script }`
5. **插件执行**: `new Function(...)(graph, ui, ...)`
6. **结果返回**: `{ type: 'result', commandId, result }`
7. **响应用户**: "图表已创建"

---

## File Structure (文件结构)

```
draw-io-mcp/
├── local-mcp-server/           # Protocol Layer
│   ├── package.json
│   ├── index.js                # MCP Server 入口
│   └── lib/
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
│       ├── flowchart.js
│       ├── microservice.js
│       ├── rpc-flow.js
│       └── database.js
│
├── docs/
│   └── ARCHITECTURE.md         # 本文档
│
├── install.sh                  # 安装脚本
├── AGENTS.md                   # AI Agent 指南
└── README.md                   # 项目说明
```

---

## Security Considerations (安全考虑)

| 层级 | 风险 | 缓解措施 |
|------|------|----------|
| AI Layer | 恶意脚本生成 | Skill 约束 + 代码审查 |
| Protocol Layer | 未授权访问 | 本地运行 + 无认证 (信任模型) |
| Transport Layer | 中间人攻击 | 仅本地 WebSocket |
| Execution Layer | XSS/代码注入 | CSP 头 + 沙箱执行 |
| Rendering Layer | DOM 污染 | mxGraph API 封装 |

---

## Performance Characteristics (性能特征)

| 指标 | 值 | 说明 |
|------|-----|------|
| 命令超时 | 30s | `COMMAND_TIMEOUT` |
| 重连间隔 | 3s | `RECONNECT_INTERVAL` |
| 单次绘图 | ~2s | 相比原子化方案 9x 提升 |
| 最大脚本 | 无限制 | 受浏览器内存限制 |

---

## Troubleshooting (故障排除)

| 症状 | 原因 | 解决方案 |
|------|------|----------|
| 红色 Disconnected | MCP Server 未运行 | `cd local-mcp-server && npm start` |
| 插件未加载 | URL 缺少参数 | 添加 `?p=plugins/mcp-executor.js` |
| 命令超时 | Draw.io 页面未打开 | 打开 `http://localhost:18080` |
| 脚本错误 | mxGraph API 使用错误 | 参考 Skill 文档 |
