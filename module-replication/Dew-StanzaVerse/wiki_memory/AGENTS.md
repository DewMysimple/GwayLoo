# AGENTS.md — 工程 Agent 记忆维护协议

本文件是 `Dew-StanzaVerse` 工程记忆的 Schema 层。它约束 Agent 如何读取、写入、压缩和检查本项目记忆；本项目不使用 Verminoble 主线的 `wiki_memory/`。

## 记忆模型

- `当前状态/`：当前有效的项目事实，每个主题只能有一个明确的 active 版本。
- `决策/`：架构、技术选型和会影响后续工作的工程决策。
- `知识/`：稳定的模块说明、流程、规范和运维知识。
- `日志/`：一次实质任务的追加式历史记录，不承担当前状态的唯一来源。
- `AGENTS.md`：Agent 的程序性记忆，规定本协议。

原始代码、配置、证据和用户提供的资料是事实来源。记忆只记录结论、关系和相对路径。

## 会话开始时的读取顺序

1. 读取本文件。
2. 读取 `当前状态/项目概览.md`、`当前状态/系统架构.md`、`当前状态/当前约束.md`、`当前状态/当前待办.md`。
3. 读取与当前任务相关的 `active` 决策。
4. 读取相关知识页。
5. 只有需要追溯时才读取最近 1–3 篇日志。

## 任务类型

每篇日志只设置一个主要 `kind`：

| kind | 适用场景 |
| --- | --- |
| `feature` | 新功能、行为变化、重构 |
| `ui` | 纯界面、外观、样式 |
| `bug` | 异常诊断、恢复、修复 |
| `discussion` | 解释、比较、架构讨论、计划 |
| `test` | 测试、审查、检查、验收 |
| `maintenance` | 文档、配置、依赖、清理、迁移 |

## 记忆写入规则

### 工作日志

完成实质任务后生成 `日志/YYYY-MM-DD-任务标题.md`，同一天标题冲突时追加后缀。日志记录目标、确认的决策、检查范围、文件变更、测试摘要、结果、遗留问题和下一步。

日志封存后不改写；需要更正时新增日志并链接原日志。

### 长期记忆

只有影响未来工作的内容才进入 `当前状态/`、`决策/` 或 `知识/`。任务结束时在日志的“待确认长期记忆”部分列出候选；未经确认的内容不得写入 `active` 页面。

新确认事实替代旧事实时，更新当前 active 页面、标记旧决策为 `superseded` 或 `deprecated`，并保留旧页面。

### 页面元数据

长期页面和日志都使用 YAML frontmatter：

```yaml
---
type: state | decision | knowledge | log | moc
status: active | proposed | deprecated | superseded | archived
kind: feature | ui | bug | discussion | test | maintenance | architecture | process | module | operations
importance: high | medium | low
updated: YYYY-MM-DD
topic: stable-topic-name
source_logs: []
supersedes: null
---
```

## MOC 与工具

- `日志/MOC_工作日志.md` 是唯一工作日志索引。
- 新增或修改日志后运行 `python 工具/memory_lint.py index` 更新索引。
- `python 工具/memory_lint.py check` 只检查，不擅自修复问题。
- Obsidian 链接使用 `[[路径|别名]]`；表格中的竖线写成 `\|`。
- 记忆路径使用 `/`，不写机器特定的绝对路径。

## 固定操作

- `记忆同步`：生成日志，提出长期记忆候选，必要时更新索引。
- `记忆检索 <关键词>`：先查 MOC 和当前状态，再按需查知识页与历史日志。
- `记忆体检`：执行 lint，报告断链、缺字段、重复 active 主题和孤儿页面。
- `记忆压缩`：把重复历史归纳到长期页面，不删除原始日志。

## 项目边界

- 当前应用位于 `../app/`，是独立的 Vite / TypeScript / Three.js 工程。
- `../sources/original-extraction/` 是只读原始提取镜像；`../evidence/` 是已接受证据，不覆盖既有基线。
- 可再生产物只写入 `../app/node_modules/`、`../app/dist/` 或 `../app/.artifacts/`。
- 本项目的源码、资产、依赖、配置和日志不依赖 Verminoble 主线；同名资产也必须使用本项目自己的路径。
