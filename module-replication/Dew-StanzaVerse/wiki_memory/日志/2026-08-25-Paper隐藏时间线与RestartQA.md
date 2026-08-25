---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: paper-hide-timeline-restart-qa
source_logs:
  - "[[日志/2026-08-25-源码Paper分组Reveal延迟与层同步QA|源码 Paper 分组 Reveal 延迟与层同步 QA]]"
  - "[[日志/2026-08-25-Paper世界变换提取与五视口QA|Paper 世界变换提取与五视口 QA]]"
supersedes: null
---

# 2026-08-25｜Paper 隐藏时间线与 Restart QA

- 时间：2026-08-25（北京时间）
- 类型：`feature`
- 状态：`完成`
- 目标：继续从 Branch 的原始提取源码还原 `papersContainer.hideAll()` 的共同隐藏生命周期，避免重启时瞬时清零、旧 shadow/cutout 残留或淡出过程中 Paper 重新触发 reveal；不改变水彩材质、波纹密度和默认显现参数。
- 日志索引：[[日志/MOC_工作日志|工作日志 MOC]]

## 源码证据

- 原始 `Paper._hideAnimation()` 会 kill 当前动画，执行 `uAlpha → 0` 的 `0.5s sine.inOut`，完成后才把 `_isVisible` 和 `_hasRevealStarted` 清为 false。
- 原始 `papersContainer.hideAll()` 把全部 Paper.hide、Cutouts.hideAll、Shadows.hideAll、Grounds.hideAll 加到同一个 timeline；Cutouts、Shadows、Grounds 各自也以约 `0.5s sine.inOut` 收拢 alpha。
- 因此隐藏期间仍保留当前 Paper 的显现状态，完成回调才清理 visible/reveal 状态；Branch 不能在 timeline 开始时把 `revealed=false`，否则滚动触发器会在淡出中重新创建首纸动画。

## 本轮改动

- `app/src/experience/world/WatercolorView.ts`
  - `hideAll()` 改为返回 GSAP timeline；runtime 默认以 `0.5s sine.inOut` 同步淡出 Paper alpha、per-paper Ground alpha、Cutout alpha 和 Shadow source alpha。
  - 新增 `_isHiding` 门禁，隐藏期间阻止 `update()` 重新触发 Paper reveal；timeline 完成后才统一清空 `revealed`、Ground `uVisible`、Paper state、Cutout/Shadow GPU alpha。
  - 保留 `{ immediate: true }` deterministic reset，用于 QA 探针和直接构造中间态，不改变 runtime Restart 的源式淡出。
- `app/src/experience/world/CutoutShadowLayer.ts`
  - 新增源码对应的 `hideAll(duration)`，并行淡出独立 SDF cutout shadow alpha。
- `app/src/experience/world/ShadowProjection.ts`
  - 新增 projected shadow source 的 `hideAll(duration)`，与 Paper alpha 同时收拢，完成时由 WatercolorView reset GPU attribute。
- `app/scripts/qa-experience.mjs`
  - QA 的结构性 reveal 探针改用 immediate reset，避免把 runtime hide timeline 混入独立 profile 断言。
  - 新增 `hideLifecycle`：验证起始 alpha、0.25 秒中间 alpha、0.5 秒完成后的 `revealed=false` 和 Ground 不可见。

## 保持不变

- 未改动 Paper/Fluid shader、SDF、LUT、笔刷尺寸、波纹密度、Ground/Shadow 强度、delivery 3/5/7 秒、source 7/10/15 秒、相机、设备能力或资源路径。
- 没有修改主线工程、原始提取、主线 `wiki_memory` 或 Branch `Start.cmd`；没有新增 Chrome tab/page，也没有推送 Git。

## 检查与验证

- `npx tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `npm run verify`：通过；Vite build 72 modules，保留既有 chunk 体积提示；`verify:integrity` 73/73 通过。
- `npm run qa`：通过；报告 `passed: true`、`sourceRevealProfilePassed: true`、5 cases、console errors 0、remote resources 0。
- 新增中间态证据：`hideLifecycle.start={alpha:1,revealed:true,duration:0.5}`；`mid={alpha:0.5,revealed:true}`；`done={alpha:0,revealed:false,groundVisible:false}`。Cutout 生命周期仍通过 `initial=0`、中段约 `0.5`、完成约 `1` 的独立 show 断言。
- 报告路径：`app/.artifacts/qa/layer-timing-2026-08-21/report.json`；本次 `checkedAt=2026-08-25T02:46:08.547Z`。

## Chrome 状态

- 复核 9333/9334/9336/9337：9333 只有既有 page target `EDE3099B0AE6CD87CB2419FC8CA1E724`，9334、9336、9337 无可用页面。
- QA context-loss 收尾后仅恢复同一 target；最终 URL 为 `http://127.0.0.1:3000/?seed=47&freeze=6#autostart`，`phase=scroll`、runtime `exploring`、asset progress 100%、fallback false、error null、26 张 Paper，9333 page 数为 1。

## 结果与下一步

- 结果：Branch 的 Restart 隐藏路径已经从瞬时清零提升为源码式共同 hide timeline；Paper、Cutout、Shadow、Ground 不会在淡出中彼此错时，完成后才允许新的首纸 reveal。
- 下一步：继续做固定 seed/freeze/reveal 的主工程与 Branch 中间态截图/像素差分，并审计 shader 实际像素与 DPR>1 屏幕空间；继续保持唯一 Chrome page、每轮本地 Git commit、不推送。

## 待确认长期记忆

- 将“Paper/Cutout/Shadow/Ground 的 hide 是共享 0.5 秒时间线，Paper `revealed`/Ground visible 必须在完成回调后才清除”作为后续 Restart、转场和视觉差分的稳定事实；当前状态和系统架构页同步记录。
