---
type: log
status: archived
kind: maintenance
importance: high
date: 2026-08-24
updated: 2026-08-24
topic: branch-dew-stanzaverse-root-integration
---

# Branch_Dew-StanzaVerse 根仓库集成

## 目标

将明确的支线测试项目纳入根仓库专用分支，保持主线默认跳过规则，并解除项目目录内的嵌套 Git 仓库关系。

## 变更

- 将根仓库当前分支 `codex/module-replication-boundary` 重命名为 `Branch_Dew-StanzaVerse`。
- 将 `module-replication/Dew-StanzaVerse` 作为根仓库普通目录跟踪。
- 删除项目目录内的本地 `.git` 元数据；不操作原独立远程仓库。
- 保持 `app/S.cmd`、`node_modules`、构建产物和临时诊断文件不进入根仓库提交。
- `module-replication/AGENTS.md` 与 README 只承担开发区域入口说明；项目工程记忆仍位于项目自己的 `wiki_memory/`。

## 验证

- 根仓库不存在子模块 gitlink。
- 根仓库只向 `GwayLoo.git` 推送 `Branch_Dew-StanzaVerse`。
- 主线 `main` 不修改；不向 `Dew-StanzaVerse.git` 推送。
