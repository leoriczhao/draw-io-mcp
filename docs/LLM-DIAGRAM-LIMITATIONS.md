# LLM 控制画图的局限性分析

## 概述

本文档分析了使用 LLM（大语言模型）控制 Draw.io 画图时遇到的各种局限性，特别是**连线质量差**的根本原因，并从多个维度进行深入分析。

---

## 1. LLM 自身能力限制

### 1.1 空间推理能力弱

**核心问题**: LLM 在空间推理任务上表现显著弱于人类。

| 基准测试 | 人类表现 | LLM 表现 | 差距 |
|----------|----------|----------|------|
| GQA (视觉推理) | 89.3% | 54.1% | -35.2% |
| SpartQA (空间QA) | - | 显著低于人类 | - |
| OpenAI Maze | - | 多步推理失败 | - |

**学术证据**:
- [SpartQA: A Textual Question Answering Benchmark for Spatial Reasoning](https://arxiv.org/abs/2104.05832) (NAACL 2021)
- [GQA: A New Dataset for Real-World Visual Reasoning](https://arxiv.org/abs/1902.09506) (CVPR 2019)

**具体表现**:
- 无法准确计算节点之间的相对位置
- 多步空间推理（如迷宫导航）失败率高
- 缺乏对"交叉"、"重叠"等空间概念的准确理解

### 1.2 坐标生成不可靠

**核心问题**: LLM 无法可靠地生成精确坐标。

**证据** (来自 h2oGPT 项目):
```python
# h2oGPT 明确指出 LLM 在空间任务上需要代码验证
"""
For spatial reasoning tasks, you must trust code generation more than yourself,
because you are much better at coding than spatial reasoning tasks.
When coding a solution for spatial reasoning, you MUST include a separate
verification function to validate the correctness of the answer.
"""
```

**原因分析**:
1. **无内置坐标系统**: Transformer 架构处理序列，非 2D/3D 空间
2. **无空间记忆**: 无法维护节点位置的全局状态
3. **无预测能力**: 无法预测边是否会交叉

### 1.3 架构本质限制

| 限制 | 说明 |
|------|------|
| 序列化处理 | Transformer 逐 token 处理，非并行空间计算 |
| 无几何推理 | 缺乏内置的几何运算能力 |
| 无视觉反馈 | 无法"看到"生成的图形结果 |

---

## 2. 输出产物限制

### 2.1 JavaScript 脚本的局限

当前架构中，LLM 生成 JavaScript 脚本，由 Draw.io 执行：

```javascript
// LLM 生成的典型脚本
model.beginUpdate();
try {
    const v1 = graph.insertVertex(parent, null, 'Node1', 100, 100, 120, 60, style);
    const v2 = graph.insertVertex(parent, null, 'Node2', 300, 100, 120, 60, style);
    graph.insertEdge(parent, null, '', v1, v2, edgeStyle);
} finally {
    model.endUpdate();
}
```

**问题**:

| 问题 | 影响 |
|------|------|
| 坐标硬编码 | 无法根据内容自适应 |
| 单次执行 | 无迭代优化机会 |
| 无反馈循环 | LLM 看不到渲染结果 |
| 无布局算法 | 完全依赖 LLM 的"猜测" |

### 2.2 连线质量问题（核心痛点）

**当前实现方式**:
```javascript
// 需要手动指定出口/入口点
const edgeStyle = 'exitX=1;exitY=0.5;entryX=0;entryY=0.5;';

// 需要手动计算路由点避免交叉
edge.geometry.points = [
    new mxGeometry(300, 80),   // 手动计算的转折点
    new mxGeometry(300, 200)
];
```

**问题分析**:

| 问题 | 原因 | 影响 |
|------|------|------|
| 边交叉 | LLM 无法预测边的路径 | 图表混乱 |
| 端口选择错误 | 无法判断最佳连接点 | 连线不自然 |
| 路由点计算错误 | 空间推理能力弱 | 边绕路或穿过节点 |
| 无自动避障 | mxGraph 不提供智能路由 | 需要完美的手动计算 |

### 2.3 布局一次性问题

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LLM 生成   │ ──► │   脚本执行   │ ──► │   最终结果   │
│   坐标脚本   │     │   (一次性)   │     │   (无法修改) │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                        │
       │              ❌ 无反馈循环              │
       └────────────────────────────────────────┘
```

---

## 3. 画图系统输入限制

### 3.1 mxGraph API 限制

| 限制 | 说明 |
|------|------|
| 需要精确坐标 | `insertVertex(parent, id, label, x, y, w, h, style)` |
| 自动布局效果差 | 内置布局算法有限 |
| 边路由算法简单 | 仅提供基础的正交路由 |

**mxGraph 提供的边样式**:

| 样式 | 用途 | 智能程度 |
|------|------|----------|
| `orthogonalEdgeStyle` | 正交路由 | 低 - 不避障 |
| `elbowEdgeStyle` | 肘形连接 | 低 |
| `entityRelationEdgeStyle` | ER 图 | 中 |
| `segmentConnector` | 分段连接 | 低 |

### 3.2 缺乏智能布局算法

**对比其他工具**:

| 工具 | 布局算法 | 交叉最小化 |
|------|----------|------------|
| Graphviz | 网络单纯形 + Sugiyama | ✓ 成熟 |
| Mermaid | Dagre (分层布局) | ✓ 中等 |
| d3-dag | 可插拔 Sugiyama | ✓ 高度可配置 |
| ELK | 分层 + 正交 | ✓ 专业级 |
| **mxGraph** | 基础分层 | ✗ 有限 |

### 3.3 样式系统复杂性

```javascript
// mxGraph 样式是字符串格式，易出错
const style = 'whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;' +
              'rounded=1;exitX=1;exitY=0.5;entryX=0;entryY=0.5;' +
              'edgeStyle=orthogonalEdgeStyle;jettySize=auto;';
```

**问题**:
- 参数组合爆炸
- 缺乏类型检查
- 错误难以调试

---

## 4. 边交叉问题的根本原因

### 4.1 计算复杂度

**边交叉最小化是 NP-hard 问题**

- 对于一般图，找到最小交叉数是 NP-完全问题
- 即使是分层图，最优解也需要指数时间
- 所有实用工具都使用**启发式算法**

### 4.2 启发式算法对比

| 算法 | 复杂度 | 效果 | 使用者 |
|------|--------|------|--------|
| 重心法 (Barycenter) | O(V²) | 中等 | Graphviz |
| 中位数法 (Median) | O(V²) | 中等 | mxGraph |
| 筛选法 (Sifting) | O(V³) | 较好 | d3-dag |
| 最优解 (Optimal) | O(2^V) | 最佳 | 仅小图 |

### 4.3 LLM 的根本缺陷

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM 无法解决边交叉问题                      │
├─────────────────────────────────────────────────────────────┤
│  1. 无法执行迭代优化算法                                       │
│  2. 无法维护全局状态（所有边的位置）                            │
│  3. 无法进行几何计算（线段相交检测）                            │
│  4. 无法评估布局质量（交叉数、美观度）                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 与其他工具的对比

### 5.1 Graphviz/DOT

**优势**:
- 40+ 年的算法积累
- 网络单纯形算法优化层级分配
- 成熟的交叉最小化
- 高度可配置

**劣势**:
- 需要外部进程
- 输出格式固定
- 交互性差

### 5.2 Mermaid

**优势**:
- 纯 JavaScript，Web 原生
- 使用 Dagre 布局引擎
- 语法简洁

**劣势**:
- 可调性有限
- 复杂图表效果一般

### 5.3 Draw.io MCP (当前方案)

**优势**:
- 交互式编辑
- 丰富的样式系统
- 实时预览

**劣势**:
- 无智能布局算法
- 完全依赖 LLM 生成坐标
- 连线质量差

---

## 6. 改进方向

### 6.1 短期方案：优化 Skill 指导

```javascript
// 改进的边创建模式
function createSmartEdge(source, target) {
    // 1. 计算最佳端口
    const ports = calculateOptimalPorts(source, target);
    
    // 2. 检测潜在交叉
    const existingEdges = AI_HLP.getAllCells().filter(c => c.type === 'edge');
    const routingPoints = calculateAvoidancePoints(source, target, existingEdges);
    
    // 3. 创建边
    const edge = graph.insertEdge(parent, null, '', source, target, 
        `exitX=${ports.exit.x};exitY=${ports.exit.y};` +
        `entryX=${ports.entry.x};entryY=${ports.entry.y};`);
    
    if (routingPoints.length > 0) {
        edge.geometry.points = routingPoints;
    }
    
    return edge;
}
```

### 6.2 中期方案：集成布局算法

**方案 A: 集成 Dagre**
```javascript
// 在 mcp-executor.js 中集成 Dagre
import dagre from 'dagre';

function autoLayout(graph) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 50, nodesep: 30 });
    
    // 转换 mxGraph -> Dagre
    // 执行布局
    dagre.layout(g);
    
    // 应用结果到 mxGraph
}
```

**方案 B: 集成 ELK**
```javascript
// ELK 提供更专业的正交路由
import ELK from 'elkjs';

const elk = new ELK();
const layoutedGraph = await elk.layout(elkGraph, {
    'elk.algorithm': 'layered',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
});
```

### 6.3 长期方案：语义化中间层

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户意图   │ ──► │   LLM 理解   │ ──► │  拓扑描述    │ ──► │  布局算法   │
│  "画架构图"  │     │   生成拓扑   │     │  (无坐标)    │     │  生成坐标   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**拓扑描述格式**:
```json
{
  "nodes": [
    { "id": "client", "label": "Client", "type": "rectangle" },
    { "id": "server", "label": "Server", "type": "rectangle" }
  ],
  "edges": [
    { "from": "client", "to": "server", "label": "HTTP" }
  ],
  "layout": {
    "direction": "LR",
    "algorithm": "hierarchical"
  }
}
```

**优势**:
- LLM 只负责理解意图和生成拓扑
- 布局算法负责坐标计算和交叉最小化
- 关注点分离，各司其职

### 6.4 迭代优化循环

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   LLM 生成   │ ──► │   渲染图表   │ ──► │   截图分析   │
│   初始布局   │     │             │     │   (视觉LLM)  │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                                        │
       │              反馈循环                   │
       │         "发现3处边交叉"                 │
       └────────────────────────────────────────┘
```

---

## 7. 结论

### 核心矛盾

> **LLM 生成坐标 ≠ 优化坐标**

LLM 擅长：
- 理解用户意图
- 生成图表结构（节点、边、关系）
- 选择合适的样式

LLM 不擅长：
- 计算精确坐标
- 优化布局（最小化交叉）
- 空间推理

### 推荐策略

| 阶段 | 负责方 | 任务 |
|------|--------|------|
| 意图理解 | LLM | 解析用户需求 |
| 结构生成 | LLM | 确定节点、边、关系 |
| 布局计算 | 算法 | Dagre/ELK/Graphviz |
| 样式应用 | LLM | 选择颜色、形状 |
| 微调优化 | 用户 | 交互式调整 |

### 最终建议

1. **短期**: 优化 Skill，提供更好的边创建指导
2. **中期**: 集成 Dagre 或 ELK 布局算法
3. **长期**: 实现语义化中间层，分离拓扑生成和布局计算

---

## 参考资料

### 学术论文
- [SpartQA](https://arxiv.org/abs/2104.05832) - 空间推理基准
- [GQA](https://arxiv.org/abs/1902.09506) - 视觉推理数据集
- [Sugiyama Framework](https://en.wikipedia.org/wiki/Layered_graph_drawing) - 分层图绘制

### 开源项目
- [Dagre](https://github.com/dagrejs/dagre) - JavaScript 图布局
- [ELK](https://github.com/kieler/elkjs) - Eclipse 布局内核
- [d3-dag](https://github.com/erikbrinkman/d3-dag) - 模块化 DAG 布局
- [mxGraph](https://github.com/jgraph/mxgraph) - Draw.io 核心

### 评估框架
- [OpenAI Evals](https://github.com/openai/evals) - 包含迷宫空间推理测试
- [VisuLogic](https://github.com/modelscope/evalscope) - 视觉推理基准
- [ZeroBench](https://github.com/modelscope/evalscope) - 挑战性视觉推理
