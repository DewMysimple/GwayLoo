# David Whyte Experience — 协作规则

开始实质工作前依次阅读：

1. [`wiki_memory/AGENTS.md`](./wiki_memory/AGENTS.md)
2. [`wiki_memory/当前状态/项目概览.md`](./wiki_memory/当前状态/项目概览.md)、[`wiki_memory/当前状态/系统架构.md`](./wiki_memory/当前状态/系统架构.md)、[`wiki_memory/当前状态/当前约束.md`](./wiki_memory/当前状态/当前约束.md)、[`wiki_memory/当前状态/当前待办.md`](./wiki_memory/当前状态/当前待办.md)
3. 与当前任务相关的 active 决策和知识页。
4. 只有需要追溯时才读取最近 1–3 篇 `wiki_memory/日志/`。

## 边界

- `sources/original-extraction/` 是唯一原始源码基线，只读；不要修改、格式化或向其中写入生成物。
- `evidence/` 是已接受证据；新增证据应保留来源与日期，不覆盖既有基线。
- 可再生产物只能写入 `app/node_modules/`、`app/dist/` 或 `app/.artifacts/`，这些目录不纳入 Git。
- 每轮实质性工作结束后，按 `wiki_memory/AGENTS.md` 的统一 schema 新增一篇日志并更新 `wiki_memory/日志/MOC_工作日志.md`。
