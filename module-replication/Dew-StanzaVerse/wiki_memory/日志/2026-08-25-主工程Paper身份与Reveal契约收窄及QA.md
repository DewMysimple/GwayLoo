---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: paper-identity-reveal-contract
source_logs:
  - "[[日志/2026-08-25-主工程Paper场景呈现契约与FullPaint映射QA|主工程 Paper 场景呈现契约与 Full Paint 映射 QA]]"
  - "[[日志/2026-08-25-主工程Paper职责子契约解构与QA|主工程 Paper 职责子契约解构与 QA]]"
  - "[[日志/2026-08-24-纸片世界朝向与Fade显现对齐|纸片世界朝向与 Fade 显现对齐]]"
supersedes: null
---

# 2026-08-25｜主工程 Paper 身份与 Reveal 契约收窄及 QA

- 时间：2026-08-25（北京时间）
- 类型：`feature`
- 状态：`完成`
- 目标：继续移除 WatercolorView 中央纸片实例对完整 PaperConfig 的携带，让 identity、SDF reveal 和 Ground 参数分别归属窄契约。
- 日志索引：[[日志/MOC_工作日志|工作日志 MOC]]

## 已确认的决策

- `PaperIdentityContract` 统一只读的 `index/name/startAt/sceneIndex`，由 `paperLayers.presentation` 派生并供 WatercolorView 的 GLB 查找、simulation region、射线场景编号、Ground 关联和实例调试使用。
- `PaperEntry` 与 `PaperInstanceConfig` 不再携带完整 `PaperConfig`；普通 reveal 的时间入口继续使用 identity.startAt，fade/default 分支继续使用 `PaperSdfContract.revealType`，Ground 几何继续使用 `PaperGroundContract`。
- `config/papers.ts` 仍是只读源数据事实，`content/papers.ts` 和 `content/paper-layers.ts` 是唯一适配层；本轮没有删除旧配置，避免破坏原始证据链。

## 检查与操作

- 审计 WatercolorView 后确认 runtime 中完整 PaperConfig 的实际用途已收敛到 identity、SDF 与 Ground；将实例对象和公开 `PaperInstanceConfig` 改为窄 identity。
- QA 查询同步改为检查 `paper.identity` 与 `paper.sdf`，继续覆盖 delivery/source reveal、fade 分支、GLB yaw、27 个 simulation region 和 Full Paint。
- 首次浏览器尝试遇到 CDP attach race，随后确认同一 9333 页面运行时对象已切换为 identity；重试完成后 QA 通过，未创建新 Chrome 页面。

## 文件变更

- `app/src/content/paper-layers.ts`：导出 `PaperIdentityContract`，让五类 Paper 子契约共享同一身份边界。
- `app/src/experience/types.ts`：`PaperInstanceConfig.config` 改为 `identity`。
- `app/src/experience/world/WatercolorView.ts`：不再 import/携带 PaperConfig，使用 presentation identity、SDF、Ground、shadow 契约。
- `app/scripts/qa-experience.mjs`：更新 identity/reveal 调试探针。

## 测试与验证

- `npx tsc --noEmit`：通过。
- `npm run build`：通过，73 个模块；保留既有大 chunk 警告。
- `npm run verify:integrity`：73/73 通过。
- `node --check scripts/qa-experience.mjs`：通过。
- Chrome QA：`report.passed: true`，`sourceRevealProfilePassed: true`，5 个场景，0 个 console errors，0 个 remote resources。
- 运行态：26 张纸片、27 个 simulation region、标题 6 个、Ground 23 个、shadow/cutout 24 个，纸片 yaw 对齐和 reveal timing 均通过。

## 待确认长期记忆

- 视觉上仍需在固定 seed、freeze、reveal 中间态下与主工程做截图/像素差分；本轮只收窄数据生命周期，没有根据 Auto 服务器末态调整波纹密度或材质参数。
- WatercolorView 仍是 legacy WebGL 的中央编排器，后续可以继续审计 GLB transform、reveal state 和 PaperInstanceConfig 是否能进一步分层，但不能为了形式拆分而改变已通过的渲染顺序。

## 问题、结果与下一步

- 结果：Branch 的 Paper runtime 实例不再把完整配置对象作为隐式总线传递，identity、presentation、SDF、Ground、vegetation 和 shadow 边界更加接近主工程 Definition 解构方向。
- 遗留问题：主工程 R3F 当前仍未承载完整 Paper WebGL pass；同 seed 中间态视觉差分仍缺少强证据。
- 下一步：继续从主工程与原始提取中审计 Paper transform/reveal 生命周期，并优先补视觉中间态差分；保持单一 Chrome 页面和每轮本地 Git 提交。
