---
type: moc
status: active
kind: process
importance: high
updated: 2026-08-25
topic: work-log-index
source_logs: []
supersedes: null
---

# 工作日志 MOC

> 单一工作日志索引，按更新时间倒序。任务类型通过 `kind` 元数据区分。

| 时间 | 类型 | 目标 | 状态 | 主题 | 日志 |
| --- | --- | --- | --- | --- | --- |
| 2026-08-25 | maintenance | - | archived | web-blender-memory-routing | [[日志/2026-08-25-网页与Blender工程记忆分流.md|网页与 Blender 工程记忆分流]] |
| 2026-08-25 | maintenance | - | archived | commit-without-push | [[日志/2026-08-25-任务交付仅提交不推送.md|任务交付仅提交不推送]] |
| 2026-08-24 | maintenance | - | archived | module-replication-memory-boundary | [[日志/2026-08-24-支线模块隔离与工程记忆架构调整.md|2026-08-24｜支线模块隔离与工程记忆架构调整]] |
| 2026-08-24 | maintenance | - | archived | gwayloo-brand-migration | [[日志/2026-08-24-GwayLoo品牌迁移.md|GwayLoo 品牌迁移]] |
| 2026-08-24 | maintenance | - | archived | github-repository-url | [[日志/2026-08-24-GitHub仓库地址更新.md|GitHub 仓库地址更新]] |
| 2026-08-24 | maintenance | - | archived | branch-dew-stanzaverse-root-integration | [[日志/2026-08-24-Branch_Dew-StanzaVerse根仓库集成.md|Branch_Dew-StanzaVerse 根仓库集成]] |
| 2026-08-22 | bug | 修复第三个景观结束后滚动提前终止，恢复原版沉浸区之后的完整连续内容。 | archived | source-faithful-page-tail-scroll-restoration | [[日志/2026-08-22-页面尾部连续滚动恢复.md|2026-08-22｜页面尾部连续滚动恢复]] |
| 2026-08-22 | feature | 保持原版尾部的文字、图标与布局，同时阻止订阅、赠送、邮箱、社交分享和奖项内容跳转到其他页面。 | archived | experience-tail-external-links-disabled | [[日志/2026-08-22-页面尾部外链静态化.md|2026-08-22｜页面尾部外链静态化]] |
| 2026-08-22 | bug | 恢复 React 迁移后偏小的画布诗句字号，以及失效的原版滚轮推进交互。 | archived | original-poem-scale-and-scroll-restoration | [[日志/2026-08-22-诗句字号与滚动交互恢复.md|2026-08-22｜诗句字号与滚动交互恢复]] |
| 2026-08-22 | maintenance | 根据外部工程记忆模板，为 Verminoble 建立可持续维护的项目记忆。 | archived | project-memory-initialization | [[日志/2026-08-22-工程记忆初始化.md|2026-08-22｜工程记忆初始化]] |
| 2026-08-22 | bug | 依据只读原版源码恢复右下角声音控件、可靠的背景音乐解锁，以及 FAQ 的 View/Close 展开内容。 | archived | sound-and-faq-regression-fix | [[日志/2026-08-22-声音与FAQ交互回归修复.md|2026-08-22｜声音与 FAQ 交互回归修复]] |
| 2026-08-22 | bug | 修复 React 迁移后体验卡在空白加载画面、原版双阶段加载界面缺失的问题。 | archived | original-two-stage-loader-restoration | [[日志/2026-08-22-双阶段加载界面恢复.md|2026-08-22｜双阶段加载界面恢复]] |
| 2026-08-22 | feature | 将静态 WordPress 快照改造为可通过 npm 开发的 React 模块化沉浸体验。 | archived | react-architecture-migration | [[日志/2026-08-22-react架构迁移.md|2026-08-22｜React 架构迁移]] |
| 2026-08-22 | feature | 在不改变原版 UI 和交互的前提下建立 React Three Fiber 模块化运行时。 | archived | r3f-dual-runtime-migration | [[日志/2026-08-22-R3F双轨运行时迁移.md|2026-08-22｜R3F 双轨运行时迁移]] |

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
