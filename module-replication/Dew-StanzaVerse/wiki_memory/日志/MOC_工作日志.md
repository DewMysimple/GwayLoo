---
type: moc
status: active
kind: process
importance: high
updated: 2026-08-24
topic: work-log-index
source_logs: []
supersedes: null
---

# 工作日志 MOC

> 单一工作日志索引，按更新时间倒序。任务类型通过 `kind` 元数据区分。

| 时间 | 类型 | 目标 | 状态 | 主题 | 日志 |
| --- | --- | --- | --- | --- | --- |
| 2026-08-24 | maintenance | - | archived | project-memory-architecture-migration | [[日志/2026-08-24-工程记忆架构迁移.md|2026-08-24｜工程记忆架构迁移]] |
| 2026-08-21 | bug | - | archived | brush-motion-decay | [[日志/2026-08-21-笔触速度与轨迹衰减.md|2026-08-21｜笔触速度与轨迹衰减]] |
| 2026-08-21 | bug | - | archived | layer-edge-integrity | [[日志/2026-08-21-图层边缘完整性.md|2026-08-21｜图层边缘完整性]] |
| 2026-08-21 | bug | - | archived | layer-rise-reveal | [[日志/2026-08-21-图层立起渐进显现.md|2026-08-21｜图层立起渐进显现]] |
| 2026-08-21 | bug | - | archived | layer-timing-edge-catchup | [[日志/2026-08-21-图层时间与边缘追赶.md|2026-08-21｜图层时间与边缘追赶]] |
| 2026-08-21 | maintenance | - | archived | readme-powershell-workflow | [[日志/2026-08-21-README与PowerShell工作流.md|2026-08-21｜README 与 PowerShell 工作流]] |
| 2026-08-21 | maintenance | - | archived | git-proxy-remote | [[日志/2026-08-21-Git代理与远程连接修复.md|2026-08-21｜Git 代理与远程连接修复]] |
| 2026-08-20 | bug | - | archived | source-fidelity-recovery | [[日志/2026-08-20-源码优先恢复.md|2026-08-20｜源码优先恢复]] |
| 2026-08-20 | bug | - | archived | watercolor-audio-regression | [[日志/2026-08-20-水彩与音频回归修复.md|2026-08-20｜水彩与音频回归修复]] |
| 2026-08-20 | maintenance | - | archived | project-memory-initialization | [[日志/2026-08-20-工程记忆初始化.md|2026-08-20｜工程记忆初始化]] |
| 2026-08-20 | bug | - | archived | uv-alignment | [[日志/2026-08-20-UV对齐修复.md|2026-08-20｜UV 对齐修复]] |

## 使用方式

- 由 `python 工具/memory_lint.py index` 生成或刷新。
- 查询时先阅读当前状态，再按关键词定位日志。
- 历史日志是审计记录，不应直接覆盖当前状态。

## 入口

- [[工程记忆README|工程 Agent 记忆系统]]
- [[AGENTS|记忆维护协议]]
- [[日志/README|工作日志说明]]
- [[当前状态/项目概览|当前项目概览]]
- [[当前状态/系统架构|当前系统架构]]
