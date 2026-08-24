# module-replication

这是 Verminoble 主线之外、用于隔离开发与验证的支线项目工作区。

## 规则

- 每个子项目独立维护自己的源码、开发环境、依赖、资产和 `wiki_memory/`；具体 Git 跟踪范围由当前分支和任务决定。
- 只有在任务明确指定某个子项目时，Agent 才应进入该项目。
- 支线项目的工程记忆不计入主线 `C:/Users/Administrator/Desktop/Verminoble/wiki_memory/`。
- 支线项目可以拥有相同资产，但不引用主线项目的环境、配置或运行时路径；目录包含关系不自动形成 Git 子模块或运行时依赖。

具体路由和 Git 规则见 [`AGENTS.md`](./AGENTS.md)。
