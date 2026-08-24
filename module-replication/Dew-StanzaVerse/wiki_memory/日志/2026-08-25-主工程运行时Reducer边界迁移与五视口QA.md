---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: main-runtime-reducer-boundary-and-five-viewport-qa
source_logs:
  - "[[日志/2026-08-24-主线与Branch复刻架构差距比较|主线与 Branch 复刻架构差距比较]]"
  - "[[日志/2026-08-25-主工程Definition边界迁移与空闲悬停流体修正|主工程 Definition 边界迁移与空闲悬停流体修正]]"
supersedes: null
---

# 主工程运行时 Reducer 边界迁移与五视口 QA

## 目标

继续把根目录主工程解构为 Branch 的可追踪架构边界。本轮针对主工程 `src/features/experience/runtime/` 的 `ExperienceRuntimeState`、纯 reducer、性能档位与状态派生，补齐 Branch 之前分散在 `ExperienceManager`、事件总线和 DOM 回调中的运行时状态；不替换 Branch 已验证的 legacy WebGL 材质、流体、Ground、阴影、Poem 和 Full Paint 管线。

## 主工程到 Branch 的差距与迁移

| 职责 | 根目录主工程事实 | 本轮 Branch 处理 |
| --- | --- | --- |
| 运行时状态 | `ExperienceRuntimeState` 统一维护 boot/loading/exploring/landscape/tail/error、资源进度、资产就绪、滚动、诗句、场景、静音、性能档位和错误 | 新增 `app/src/experience/runtime/types.ts` 与纯 `reducer.ts`，保留同一状态契约；Branch 原有视觉 phase 继续独立表示 GSAP/WebGL 视图生命周期 |
| 状态派生 | 主工程 reducer 根据 bounded scroll progress 派生 active poem 与 active scene | `ExperienceManager` 用 definition 的 scene focusTime/camera duration 和 poem breakpoints 注入 reducer，不再依赖散落的固定场景判断 |
| 加载边界 | 主工程区分 boot、loading、assets ready 与 ready | Branch 从 `Resources` 进度/完成事件更新 runtime，`init()` 发送 `BOOT_COMPLETE`，Enter/start 发送 `READY` |
| Landscape | 主工程 `OPEN_LANDSCAPE`/`CLOSE_LANDSCAPE` 管理视频景观 | Branch Full Paint SHOW/HIDE 映射为 `landscapeScene`，同时保留原有 `full-paint` 视觉 phase |
| 错误与性能 | 主工程有 error 状态和 `detectPerformanceTier` | Branch 新增性能档位探测；资源、WebGL 初始化和 context loss 通过 `reportFailure`/`FAIL` 留下可读 runtime error |

## 已实施变更

- 新增 `runtime/types.ts`、`runtime/reducer.ts`、`runtime/performance.ts`，使用 Branch 自己的 `SceneId` 与 definition，不复制根目录路径或资源。
- `ExperienceManager` 维护并暴露 `runtimeState`，把资源进度、资源完成、初始化、启动、滚动、Full Paint、权益区、静音、重启和失败事件接入 reducer。
- `definition.runtime` 增加主工程状态派生所需的诗句断点；场景起点由已有六组 definition scene `focusTime` 动态换算，不改纸片或 shader 数值。
- `qa-experience.mjs` 新增 runtime state 与 Full Paint→Landscape 断言，并把 100px 滚动门禁改为按 `contentHeight × travelMultiplier × cameraDuration` 公式计算，避免固定旧门限把当前有效布局误报为失败。

## 验证

- `npx tsc --noEmit`：通过。
- `npm run build`：通过；61 modules，JS 约 858 KB，仅保留既有大 chunk 警告。
- `npm run verify:integrity`：73/73 通过。
- `node --check scripts/qa-experience.mjs`：通过。
- 复用唯一 Chrome 9333 页面执行五视口 QA：`passed: true`，五个视口的 runtime phase 为 `exploring`、资产进度 100%、24 秒位置派生为 `activeScene=4`/`activePoem=1`，Full Paint 及其 reducer 状态通过，console errors 与 remote resources 均为 0。
- 复用 9333 的轻量 CDP 探针确认 `show(3)` 后 `phase=landscape`、`landscapeScene=3`、Full Paint 可见且正在渲染。
- Chrome 盘点：9333 保留 1 个 Branch 页面；9334、9336、9337 均关闭；本轮没有创建重复页面。

## 遗留与下一步

- Branch 的纯状态边界已经对应主工程 runtime，但 DOM copy/tail/fonts 仍未完全从 `index.html` 迁入 definition；下一轮可继续解构内容契约，不直接替换已经稳定的 legacy DOM。
- 仍缺根目录主工程与 Branch 在同 seed、同 viewport、同时间点的像素差分；当前 QA 证明的是 Branch 自身结构与运行时行为，不宣称两边像素相同。
- `Start.cmd` 是用户工作树中的未跟踪文件，本轮未读取内容、未修改、未加入提交。

## 待确认长期记忆

- “Branch 以纯 runtime reducer 作为主工程状态边界适配层，legacy visual phase 作为渲染实现细节”已获得构建、五视口和 CDP 证据，可作为当前架构事实继续使用；若未来主工程 reducer 发生变化，应重新比较 action 与 phase 映射。
