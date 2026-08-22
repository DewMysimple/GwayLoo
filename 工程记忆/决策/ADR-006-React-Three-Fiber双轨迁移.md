---
type: decision
status: active
kind: architecture
importance: high
updated: 2026-08-22
topic: r3f-dual-runtime-migration
source_logs:
  - "[[日志/2026-08-22-R3F双轨运行时迁移|R3F 双轨运行时迁移]]"
supersedes: null
---

# ADR-006｜采用 React Three Fiber 双轨迁移

## 状态

`active`

## 背景

React 页面仍通过 `LegacyRuntimeBridge` 依赖不可维护的压缩 WebGL 引擎。直接替换会同时威胁原版加载、诗句排版、滚动节奏、六景观与尾部连续滚动。

## 决策

建立统一 `ExperienceDefinition`、运行时契约和 reducer 状态机。迁移期默认使用 legacy，`?runtime=r3f` 只用于新引擎回归；只读原版、legacy 与 R3F 使用 Playwright 对照。R3F 完成视觉、交互和资源验收前，不删除旧引擎或兼容资源。

## 理由

- 将技术重写与 UI 变化隔离，任何视觉参数都可追溯到源码、资源或运行测量。
- 保留随时可运行和可对照的基线，避免未完成引擎替换破坏现有体验。
- 让内容、场景、音频和资源逐步进入强类型配置，而不提前改变公开行为。

## 影响

- 开发期存在 legacy 与 R3F 两套运行时，维护和回归成本暂时增加。
- R3F 已接管状态、滚动、视频景观和资源加载，但水彩着色器等价仍是最终切换门槛。
- `/wp-content/` 兼容路径、`app.js`、旧样式与隐藏契约节点在验收前继续保留。

## 验证方式

运行单元测试、资源检查、构建和桌面/移动 Playwright；对静态布局比较几何与 computed style，对动态 WebGL 比较相机、边界、状态和截图。

## 来源

- [[日志/2026-08-22-R3F双轨运行时迁移|R3F 双轨运行时迁移]]
