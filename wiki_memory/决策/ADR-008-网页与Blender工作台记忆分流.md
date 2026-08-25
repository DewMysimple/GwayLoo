---
type: decision
status: active
kind: architecture
importance: high
updated: 2026-08-25
topic: web-blender-memory-routing
source_logs:
  - "[[日志/2026-08-25-网页与Blender工程记忆分流|网页与 Blender 工程记忆分流]]"
supersedes: null
---

# ADR-008 网页与 Blender 工作台记忆分流

## 决策

网页项目与 Blender 工作台继续在同一个仓库和 `main` 分支中同步开发，不创建新的 Git 分支、独立仓库、子模块或隐式运行时依赖。工程记忆按任务范围分流：

- 网页任务使用主线 `wiki_memory/`。
- Blender 任务使用 `blender_scenebench/wiki_memory/`，必要时读取主线网页边界状态。
- 混合任务分别记录网页和 Blender 的对应结论。

## 边界

主线记忆只保留网页资源、运行时和工作台边界；Blender 场景结构、材质、资产、构建、验证和创作过程只在工作台本地记忆维护。工作台目录本身仍属于主线仓库内容，代码和 `.blend` 与网页代码共享同一提交历史。

## 来源

- [[日志/2026-08-25-网页与Blender工程记忆分流|网页与 Blender 工程记忆分流]]
