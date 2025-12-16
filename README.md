# Draw.io MCP Controller

让 Claude 直接操作 Draw.io 画布，通过批处理架构实现高效绘图。

## 架构

```
┌─────────────┐                    ┌──────────────────┐                    ┌─────────────────────────┐
│   Claude    │  MCP Protocol      │   MCP Server     │   HTTP Polling     │   Draw.io Plugin        │
│   + Skill   │ ◄────────────────► │  (port 3000)     │ ◄────────────────► │   + AI_HLP Library      │
└─────────────┘                    └──────────────────┘                    └─────────────────────────┘
```

**核心优势**: 批处理架构，一次调用完成整个图表绘制

```
原子化方案: 画5节点4连线 = 9次调用 × 2秒 = 18秒
批处理方案: 画5节点4连线 = 1次调用 × 2秒 = 2秒
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
│       └── mcp-executor.js   # 包含 AI_HLP 标准库
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

## AI_HLP 标准库

浏览器插件注入的标准库，供 Claude 调用:

### 核心绘图

```javascript
// 批量绘图 (核心函数)
AI_HLP.drawBatch({
  nodes: [
    { id: "n1", label: "开始", shape: "ellipse", style: "fillColor=#d5e8d4" },
    { id: "n2", label: "处理", shape: "rect" },
    { id: "n3", label: "判断?", shape: "rhombus", style: "fillColor=#fff2cc" }
  ],
  edges: [
    { source: "n1", target: "n2" },
    { source: "n2", target: "n3", label: "下一步" }
  ],
  layout: "hierarchical"
})

// 清空画布
AI_HLP.clear()
```

### Shape 形状

| Shape | 说明 |
|-------|------|
| `rect` | 矩形 (默认) |
| `rounded` | 圆角矩形 |
| `ellipse` | 椭圆 (开始/结束) |
| `rhombus` | 菱形 (判断) |
| `cylinder` | 圆柱 (数据库) |
| `actor` | 人形 (用户) |
| `parallelogram` | 平行四边形 (输入/输出) |
| `note` | 便签 |
| `cloud` | 云 |

### Style 样式

```
fillColor=#d5e8d4    填充色
strokeColor=#82b366  边框色
fontColor=#333333    文字色
fontSize=14          字号
dashed=1             虚线
rounded=1            圆角
```

### Layout 布局

| Layout | 说明 |
|--------|------|
| `hierarchical` | 层次布局 (流程图) |
| `tree` | 树形 (组织架构) |
| `organic` | 有机布局 (关系图) |
| `circle` | 环形 |
| `radial` | 放射状 |

### 其他函数

| 函数 | 说明 |
|------|------|
| `AI_HLP.autoLayout(type, options)` | 重新布局 |
| `AI_HLP.getCanvasInfo()` | 获取画布信息 |
| `AI_HLP.getAllCells()` | 获取所有元素 |
| `AI_HLP.getSelection()` | 获取选中元素 |
| `AI_HLP.addPage(name)` | 新建页面 |
| `AI_HLP.switchPage(index)` | 切换页面 |
| `AI_HLP.renamePage(name)` | 重命名页面 |
| `AI_HLP.exportSvg()` | 导出 SVG |
| `AI_HLP.exportPng()` | 导出 PNG |
| `AI_HLP.getXml()` | 获取 XML |
| `AI_HLP.fit()` | 缩放适应 |
| `AI_HLP.center()` | 居中显示 |

## MCP Tool

只有一个工具:

| Tool | 描述 |
|------|------|
| `execute_script` | 在 Draw.io 浏览器环境执行 JavaScript，可使用 AI_HLP 标准库 |

## 示例

> 用户: 画一个三层架构图

Claude 调用:
```javascript
AI_HLP.drawBatch({
  nodes: [
    {id:"user", label:"用户", shape:"actor"},
    {id:"web", label:"Web 层", style:"fillColor=#dae8fc"},
    {id:"api", label:"API 层", style:"fillColor=#d5e8d4"},
    {id:"db", label:"数据库", shape:"cylinder", style:"fillColor=#e1d5e7"}
  ],
  edges: [
    {source:"user", target:"web"},
    {source:"web", target:"api"},
    {source:"api", target:"db"}
  ],
  layout: "hierarchical"
})
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 红色 Disconnected | 检查 MCP Server 是否运行 (`npm start`) |
| 插件没加载 | 确保 URL 带 `?p=plugins/mcp-executor.js` |
| Claude 超时 | 检查 Draw.io 页面是否打开并已连接 |
| 端口冲突 | 修改 docker-compose.yml 端口映射 |
