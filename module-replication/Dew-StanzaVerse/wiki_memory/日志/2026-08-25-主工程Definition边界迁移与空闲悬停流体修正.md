---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: main-definition-boundary-and-idle-fluid-lifecycle
source_logs:
  - "[[日志/2026-08-24-主线与Branch复刻架构差距比较|主线与 Branch 复刻架构差距比较]]"
  - "[[日志/2026-08-25-五视口交付回归与光标状态门禁修正|五视口交付回归与光标状态门禁修正]]"
supersedes: null
---

# 主工程 Definition 边界迁移与空闲悬停流体修正

## 目标

本轮把根目录主工程实际存在的 `ExperienceDefinition` 架构边界解构到 Branch，同时处理用户反馈的“鼠标停在 2D 图层上仍无限扩散/闪烁”现象。保留 Branch 已验证的纸片、SDF、流体、Ground、阴影、Full Paint 和交付参数，不以主工程当前尚未完成的 R3F MeshBasic 路径替换 Branch 的深层 WebGL 实现。

## 主工程到 Branch 的差距矩阵

| 职责 | 根目录主工程事实 | 本轮 Branch 处理 |
| --- | --- | --- |
| Definition 入口 | `src/content/definition.ts` 聚合 copy、scenes、sounds、fonts、world、tail，并由 `ExperiencePage` 注入 runtime | 新增 `app/src/experience/definition.ts`，聚合 local assets、6 scenes、5 sounds、26 papers、Ground atlas、reveal/camera timing 和 runtime constants |
| 运行时注入 | `R3FExperienceRuntime` 接收 `definition`，资源管线和场景世界从同一对象读取 | `ExperienceManager` 将 definition 传入 `WatercolorView`、`FluidSimulation`、`FullPaintManager`；主入口从 definition 读取静态资源 |
| 场景/视频 | 主工程用 scene manifest 提供标题、焦点进度和 desktop/mobile base/over 视频 | Branch scene definition 从已有 26 纸片的 title/startAt 派生标题和焦点时间，视频路径仍使用 Branch 自己的 `/assets/xp` 边界 |
| 音频 | 主工程 definition 提供 5 个 sound source，audio hook 负责主题/反馈 | Branch `AudioManager` 从 definition 读取 3 个主题和 2 个反馈音效的 DOM 名称；保留原有淡入淡出和 Enter 解锁行为 |
| 深层 WebGL | 主工程的 R3F 仍明确标注尚未应用全部 shader 输入，保留 legacy 作为 equality gate | Branch 继续保留实际纸片/流体/SDF/Shadow/Full Paint 图形管线，仅迁移数据边界，不降低材质深度 |
| 交互活跃状态 | 主工程 runtime 将 scroll/landscape/tail 等 UI 状态与渲染世界分开 | Branch 现有 `ExperienceState` 保留；本轮补齐流体的“命中 hover”与“有效绘画活跃”边界，避免二者混为一谈 |

## 已实施变更

- `app/src/experience/definition.ts` 建立 Branch 版 definition，引用既有配置对象，避免复制或改写已验收的视觉数值。
- `main.ts`、`ExperienceManager`、`WatercolorView`、`FluidSimulation`、`FullPaintManager`、`ScrollController`、`PaintingTitles` 和 `AudioManager` 接入同一份 definition；资源预载接受只读清单。
- `FullPaintManager` 不再自行拼接视频路径，而是按 definition 的 scene/device/layer 读取本地视频地址。
- `PaintManager` 仍在命中纸片时保持 hover/cursor/title 行为，但只在真实笔触移动或按压时刷新 `markActive`；鼠标静止时不再续期 5 秒 activity grace，流体 pass 会在四帧历史冲刷后停止。
- `qa-experience.mjs` 增加可配置 CDP 端口和 idle-hover 门禁，防止后续把无限活跃误判为正常水彩扩散。

## 验证

- `npx tsc --noEmit`：通过。
- `npm run build`：通过；包体积与既有构建同量级，仅保留原有大 chunk 警告。
- `npm run verify:integrity`：73/73 通过。
- `node --check scripts/qa-experience.mjs`、`git diff --check`：通过。
- 使用现有 9333 页面做实时 CDP 探针：`phase=scroll`、`movementCalls=214`、`idleCalls=0`、`brushSample=true`、`idleDoesNotRefresh=true`。
- 本轮完整五视口 QA 曾因被测 Chrome target 被用户关闭/导航而中断，未把中断误记为通过；此前 `1ac7fe8` 的五视口交付回归仍保持有效。本轮应在稳定且唯一的 Chrome target 上补跑完整 QA。

## Chrome 会话清理

本轮曾创建 9334、9336、9337 三个隔离测试 Chrome。实时盘点确认 9333 为唯一保留的 Branch 页面后，已关闭四个重复测试页并结束三个隔离浏览器；当前只保留 9333 页面，避免重复导航和重复 QA target。

## 遗留与下一步

- 在不新开重复页面的前提下，用唯一稳定 target 补跑五视口回归，重点读取 `idleHoverState`、视频路径、音频和 Full Paint 字段。
- 继续把主工程 `content` 与 Branch 的静态 DOM 合同做成可追踪的 definition adapter；暂不把 `index.html` 的原始 DOM 合同直接改造成 React copy，以免破坏当前 legacy 交付路径。
- 下一轮再比较主工程 runtime reducer 与 Branch `ExperienceState/TransitionState` 的状态迁移，而不是继续盲调水彩颜色或波纹密度。

## 待确认长期记忆

- “Branch 版 definition 作为主工程解构适配层，底层 shader 配置仍由 source-extracted config 提供”可在后续稳定回归后提升为长期架构事实。
