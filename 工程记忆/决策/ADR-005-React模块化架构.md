---
type: decision
status: active
kind: architecture
importance: high
updated: 2026-08-22
topic: react-modular-architecture
source_logs:
  - "[[日志/2026-08-22-react架构迁移|React 架构迁移]]"
  - "[[日志/2026-08-22-页面尾部连续滚动恢复|页面尾部连续滚动恢复]]"
supersedes: "[[决策/ADR-001-静态复刻基线]]"
---

# ADR-005｜采用 React 模块化架构与 WebGL 兼容桥接

## 状态

`active`

## 背景

原始页面将 WordPress 外壳、内容、第三方插件和压缩 WebGL 运行时混在一个静态 HTML 快照中，无法支持安全的素材替换和二次创作。

## 决策

使用 Vite + React + TypeScript 作为主应用。页面、中文文案、场景清单和主题令牌拆分为独立模块。当前 WebGL 引擎通过 `LegacyRuntimeBridge` 作为隔离兼容层保留，原完整静态副本存于本地 Git 标签。

## 影响

- `npm run dev` 成为开发入口；React 按源码保留体验尾部的静态 Benefits、FAQ 和订阅文案，但 WordPress、商城、账户、支付后端和第三方插件不再加载。
- 兼容资源维持旧 URL，直到场景引擎重写完成。
- 画布内旧英文和核心交互仍暂由压缩脚本负责。

## 验证方式

执行 npm 质量脚本，确认 Vite 开发服务及桌面/移动场景媒体可访问，并手动验证六组全屏景观的进入与返回。

## 来源

- [[日志/2026-08-22-react架构迁移|React 架构迁移]]
