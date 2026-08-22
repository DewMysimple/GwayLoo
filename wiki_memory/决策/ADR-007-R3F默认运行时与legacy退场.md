---
type: decision
status: active
kind: architecture
importance: high
updated: 2026-08-23
topic: r3f-default-runtime-legacy-retirement
source_logs:
  - "[[日志/2026-08-23-R3F默认切换与资源边界迁移]]"
supersedes: "[[决策/ADR-006-React-Three-Fiber双轨迁移]]"
---

# ADR-007｜R3F 成为默认运行时并分阶段退场 legacy

## 状态

`active`

## 决策

默认入口使用 React Three Fiber；`?runtime=legacy` 在人工视觉验收前作为短期回退。新运行时只从 `/assets/` 读取资源，不加载旧主题 CSS、压缩 `app.js`、WordPress 路径或 legacy 全局变量。

迁移验收标准采用行为等价与 Verminoble 新视觉：保留加载、滚动、诗句、六景观、音频、返回、FAQ、Restart 和连续尾部，不再要求旧引擎逐帧复刻。人工视觉验收完成后删除 legacy 代码和 `/wp-content/` 兼容树，历史基线由 Git 标签保存。

## 理由

- 默认链路已经通过桌面、移动和低性能自动验收，继续使用压缩引擎会阻碍维护和资源治理。
- 旧引擎存在缺失异步 chunk、字体 404、外部插件逻辑和不可读压缩代码，不能作为长期生产架构。
- 独立 `/assets/`、强类型清单和架构检查能阻止旧路径重新渗入新代码。

## 验证方式

执行 lint、真实 TypeScript 检查、单元测试、架构边界检查、资源检查、构建和三档 Playwright；默认 R3F 必须无旧路径、外部网络、4xx 和控制台错误。

## 来源

- [[日志/2026-08-23-R3F默认切换与资源边界迁移|R3F 默认切换与资源边界迁移]]
