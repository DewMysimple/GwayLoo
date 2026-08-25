---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: device-definition-mobile-degradation-and-idle-brush-qa
source_logs:
  - "[[日志/2026-08-25-主工程Paper身份与Reveal契约收窄及QA|主工程 Paper 身份与 Reveal 契约收窄及 QA]]"
  - "[[日志/2026-08-25-主工程Definition边界迁移与空闲悬停流体修正|主工程 Definition 边界迁移与空闲悬停流体修正]]"
supersedes: null
---

# 2026-08-25｜主工程设备能力与移动端降级 Definition 边界及空闲笔刷 QA

- 时间：2026-08-25（北京时间）
- 类型：`feature`
- 状态：`完成`
- 目标：继续把主工程的设备能力/移动端降级边界解构到 Branch 的 `ExperienceDefinition`，并修正停笔后的流体 activity 不应被平滑尾帧无限续期的问题。
- 日志索引：[[日志/MOC_工作日志|工作日志 MOC]]

## 已确认的决策

- `ExperienceDefinition.assets.device` 与 `assets.videoResources` 作为唯一设备能力入口；运行时不再从 `config/assets.ts` 读取 `IS_MOBILE`，也不在 Full Paint 内重新从 `window` 推断视频平台。
- `Cursor`、`GrassLayer`、`LeavesLayer`、`ScrollCamera`、`TextCanvas`、`UIView`、`PaintManager`、`FullPaintManager` 和 `WatercolorView` 都消费同一 Definition-derived device。设备敏感的 Watercolor 对象延迟到 `init` 构造，避免 Chrome viewport 仿真切换在模块导入时留下 desktop/mobile 混合状态。
- `config/assets.ts` 暂作为历史配置和原始事实映射保留，但已确认没有 Branch runtime import；资源清单与设备判定由 `content/world.ts` 和 `experience/definition.ts` 承担。
- Paint activity 只有在最近真实指针输入或主动按压时才刷新；停留在纸片上的平滑尾帧可以完成当前采样，但不能重新延长 5 秒 activity grace。

## 检查与操作

- 审计 `IS_MOBILE`、视频平台、光标、草、树叶、相机、文字排版和 UI layout 的直接读取点，全部改为 Definition 注入或由 Definition getter 在资源/运行时边界解析。
- `detectWorldDevice()` 补齐 max-width media query；QA 在每个 viewport 设置后对同一 Chrome page reload 一次，确保 390/430 移动仿真在 WebGL init 前稳定生效。
- `PaintManager` 增加 120ms 最近输入门控；移动端长按为 0.6s，桌面为 0.3s，Full Paint 视频来源和资源预载路径与同一 `device` 对齐。
- QA 期间发现本地 3000 服务曾短暂停止，9333 页面显示 `ERR_CONNECTION_REFUSED`；确认没有新建页面后恢复同一 Branch Vite 服务，再继续使用原 target 完成验证。

## 文件变更

- `app/src/content/world.ts`：集中设备判定并支持窄 viewport media query。
- `app/src/experience/definition.ts`：延迟提供设备与对应视频资源。
- `app/src/dom/Cursor.ts`、`app/src/main.ts`：光标初始化消费 Definition device。
- `app/src/experience/world/GrassLayer.ts`、`LeavesLayer.ts`、`ScrollCamera.ts`、`TextCanvas.ts`、`UIView.ts`、`WatercolorView.ts`：移除独立设备推断，按 Definition 初始化/布局。
- `app/src/experience/paint/PaintManager.ts`、`FullPaintManager.ts`、`app/src/experience/ExperienceManager.ts`：统一长按、视频平台和 activity 生命周期。
- `app/scripts/qa-experience.mjs`：增加设备/视频/降级契约，修正 emulation reload 时序、Full Paint viewport ratio 和高分辨率停笔探针。

## 测试与验证

- `npx tsc --noEmit`：通过。
- `npm run verify`：通过；build 通过并保留既有大 chunk warning，`verify:integrity` 为 73/73。
- `node --check scripts/qa-experience.mjs`、`node --check scripts/cdp-eval.mjs`：通过。
- Chrome QA：`app/.artifacts/qa/device-definition-contract-2026-08-25-final/report.json` 的 `passed: true`、`sourceRevealProfilePassed: true`，5 个 viewport，0 个 console errors，0 个 remote resources。
- 设备证据：桌面 `desktop`、草 23 patches、Leaves 1024 position pass、长按 0.3s；移动 `mobile`、草 0 patches、Leaves disabled、长按 0.6s；Full Paint base/over 均走对应 desktop/mobile 视频目录。
- 同一 9333 CDP 端口仅复用原 page target；9334/9336/9337 无页面，未创建重复 Chrome 页面。

## 待确认长期记忆

- Branch 的设备 getter 解决了浏览器仿真与资源/初始化边界的时序问题，但横跨 breakpoint 的真实 resize 是否需要重建设备敏感 GPU 层，仍应在后续专门的 DPR/横竖屏视觉回归中决定；本轮不扩大到动态重建。
- 本轮修正了 activity 生命周期，但没有调整纸张材质、波纹密度、Reveal timing 或源/交付 profile；视觉差异仍应以固定 seed/freeze/reveal 的中间态截图和主工程解构证据判断。

## 问题、结果与下一步

- 结果：Branch 的设备能力、资源平台和移动端降级不再由多个 runtime 模块各自推断；停笔后不会因平滑尾帧持续刷新 activity grace。完整交付和源码 Reveal QA 仍保持通过。
- 遗留问题：根目录主工程当前 R3F scaffold 仍没有可直接复制的完整 Paper WebGL pass；同 seed 中间态像素差分、DPR>1 和动态 resize 仍缺少强证据。
- 下一步：继续解构主工程可运行路径与原始提取中的 Paper transform/reveal 生命周期，优先做固定中间态视觉差分；维持唯一 Chrome page 和每轮本地 Git 提交。
