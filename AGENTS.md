# GwayLoo Agent 入口

本项目的完整工程记忆位于 [`wiki_memory/`](./wiki_memory/)。开始工作前，先读取 [`wiki_memory/AGENTS.md`](./wiki_memory/AGENTS.md)，再按其中规定的顺序读取当前状态、决策、知识和必要日志。

记忆系统说明：[`wiki_memory/工程记忆README.md`](./wiki_memory/工程记忆README.md)

体检与日志索引命令：

```text
python wiki_memory/工具/memory_lint.py check
python wiki_memory/工具/memory_lint.py index
```

根目录的 `README.md`、源代码和媒体资源属于项目本体，不要把工程记忆页面散落到根目录。

## 工作区边界

- `Verminoble/` 是主线工程；未明确指定支线目标时，只读取和修改主线文件及 `wiki_memory/`。
- `module-replication/` 是独立的支线开发区域。除非用户明确指定其中的具体项目或路径，否则不要读取、搜索、运行、开发或修改其中任何内容；某个项目是否由当前 Git 分支跟踪，不改变这条默认读取边界。
- 用户明确指定 `module-replication/<项目>/` 后，先读取该项目自己的 `AGENTS.md`，再按该项目的本地记忆协议读取其 `wiki_memory/`；不要用主线 `wiki_memory/` 作为该支线任务的工作记忆。
- 针对支线项目的日志、当前状态、决策和知识只写入目标项目自己的 `wiki_memory/`。只有修改本主线边界策略或入口规则时，才在主线 `wiki_memory/` 记录跨仓库维护日志。
- 不要因为主线与支线存在同名资产、同名目录或相似实现，就建立隐式路径、依赖、配置或运行时引用；支线项目必须保持自己的开发环境和资产边界。
- `module-replication/` 下的项目不因目录包含关系自动成为 Git 子模块、嵌套仓库或主线运行时依赖；提交范围以当前分支的 Git 规则为准。

## 任务记忆路由

- 网页任务继续读取和写入主线 `wiki_memory/`。
- Blender 工作台任务读取主线必要的网页边界状态，并读取和写入 `blender_scenebench/wiki_memory/`；工作台与网页仍在同一个 `main` 工程中同步开发，不创建新的 Git 支线、仓库或子模块。
- 同时涉及网页和 Blender 的混合任务，分别在两套记忆中记录对应范围；主线只保留网页事实和工作台边界说明，Blender 的场景、资源、构建、验证和创作细节放在工作台本地记忆。

## Git 交付规则

- 每次执行任务完成后只创建本地 Git commit，不执行 `git push`。
- 默认继续使用当前分支，不自动创建新分支；Blender 与网页继续共用 `main` 工程。
- 只有用户明确修改本规则时，才调整上述提交与推送边界。
