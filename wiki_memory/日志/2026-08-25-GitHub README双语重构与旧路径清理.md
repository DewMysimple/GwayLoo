---
type: log
status: archived
kind: maintenance
importance: high
updated: 2026-08-25
topic: github-readme-bilingual-refresh
source_logs: []
supersedes: null
---

# GitHub README 双语重构与旧路径清理

## 目标

将根 README 改造成面向 GitHub 访客的项目入口，提供中文默认版本和可点击切换的英文版本，并移除已废弃的本机参考路径依赖。

## 已确认决策

- `README.md` 使用简体中文，`README.en.md` 使用英文；两者顶部互相链接，不在同一页面交错显示语言。
- README 介绍网页运行时、当前双轨状态、开发和验证命令、目录结构、Blender 工作区、版权边界与开发计划。
- `C:\Users\Administrator\Desktop\网页(1)` 不再作为公开仓库或默认测试配置的依赖；维护者可通过 `GWAYLOO_REFERENCE_ROOT` 或 `GWAYLOO_REFERENCE_XP` 显式提供私有只读参考基准。
- 历史日志保留旧路径，不对历史事实做机械改写。

## 影响范围

- 根 README、Playwright 配置、E2E 参考对照测试、Blender 清单生成器和执行计划改为可移植的公开仓库行为。
- 主线当前约束和项目概览同步更新；Blender 本地约束与构建验证知识记录可选参考目录规则。
- 不改变网页功能、Blender 场景内容或 `module-replication/`。

## 待确认长期记忆

- GitHub 公共文档不应暴露机器特定路径；私有参考资料只能通过显式环境变量或参数接入。
