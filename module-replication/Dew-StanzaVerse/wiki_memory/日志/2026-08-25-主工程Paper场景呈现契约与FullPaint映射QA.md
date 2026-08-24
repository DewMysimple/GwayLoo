---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: paper-presentation-contract
source_logs:
  - "[[日志/2026-08-25-主工程Paper职责子契约解构与QA|主工程 Paper 职责子契约解构与 QA]]"
  - "[[日志/2026-08-25-主工程SceneMetadata迁移与QA|主工程 Scene Metadata 迁移与 QA]]"
  - "[[日志/2026-08-25-主工程Runtime输入选择音频契约边界迁移与QA|主工程 Runtime 输入、选择、音频与契约边界迁移及 QA]]"
supersedes: null
---

# 2026-08-25｜主工程 Paper 场景呈现契约与 Full Paint 映射 QA

- 时间：2026-08-25（北京时间）
- 类型：`feature`
- 状态：`完成`
- 目标：消除标题层和 Full Paint 场景选择对完整 `world.papers` 的直接依赖，建立 Paper 场景呈现/主纸绑定窄契约。
- 日志索引：[[日志/MOC_工作日志|工作日志 MOC]]

## 已确认的决策

- `PaintingTitles` 所需的标题、CTA、sceneIndex 和 Paper identity 组成 `PaperPresentationContract`；它与 Ground、SDF、vegetation、shadow 契约并列，由 `paperManifest` 只读适配层派生。
- `FluidSimulation.regionRemap(sceneIndex)` 与 `splatScene(sceneIndex)` 只消费 presentation 契约来选择带 title 的主纸；不改变原有 sceneIndex 优先级、27 个 tile 的布局或 Full Paint 行为。
- `WatercolorView` 仍保留完整 manifest 作为中央 WebGL 编排输入；本轮只收窄标题/场景选择边界，不调整水彩 shader、波纹强度、Reveal timing、光标或材质。

## 检查与操作

- 审计确认根目录主工程已把六场景 title/focus metadata 放进 `ExperienceDefinition.scenes`，而 Branch 的标题代理与 Full Paint 主纸选择仍绕过 definition 直接读取宽 `world.papers`。
- 在 `paper-layers.ts` 增加 26 项 presentation contract，并由 `ExperienceDefinition.world.paperLayers` 注入。
- 将 `PaintingTitles` 和 `FluidSimulation` 的直接宽配置读取改为 presentation contract；QA 新增数量、标题/CTA 数量、identity 对齐和字段类型门禁。
- 查询 Chrome 9333/9334/9336/9337 后只复用 9333 已存在的单一页面，未创建新页面。

## 文件变更

- `app/src/content/paper-layers.ts`：新增 `PaperPresentationContract` 与 presentation 数组。
- `app/src/experience/world/PaintingTitles.ts`：移除 `paperManifest`/`PaperConfig` 直接依赖。
- `app/src/experience/paint/FluidSimulation.ts`：scene→主纸映射改用 presentation contract。
- `app/src/experience/world/WatercolorView.ts`：从 definition 注入 presentation contract。
- `app/scripts/qa-experience.mjs`：增加 presentation 对齐与 Full Paint 相关门禁。

## 测试与验证

- `npx tsc --noEmit`：通过。
- `npm run build`：通过，73 个模块；保留既有大 chunk 警告。
- `npm run verify:integrity`：73/73 通过。
- `node --check scripts/qa-experience.mjs`：通过。
- Chrome QA：`report.passed: true`，`sourceRevealProfilePassed: true`，5 个场景，0 个 console errors，0 个 remote resources。
- Presentation state：26 项对齐，6 个 title，6 个 CTA；既有标题交互、Full Paint 27th region、fluid lifecycle、Poem、音频与 fallback 均通过。

## 待确认长期记忆

- 根目录主工程的 R3F runtime 仍未承载完整 Paper WebGL pass；Branch 继续采用“主工程真实 content/definition 边界 + 现有源码提取的 legacy WebGL 底层”并行解构策略。
- 同 seed、固定 freeze/reveal 中间态的主工程/Branch 截图或像素差分仍未完成；本轮不以 Auto 服务器末态反推水彩纹理密度。

## 问题、结果与下一步

- 结果：标题层与 Full Paint scene 选择不再通过宽 `world.papers` 直接寻找主纸，Paper definition 的职责边界继续向主工程解构版本收敛。
- 遗留问题：WatercolorView 中央编排仍需要完整 paper identity/config，后续需继续判断哪些字段可以安全迁入更窄的 instance/reveal contract。
- 下一步：继续审计 paper identity、reveal timeline 和 GLB transform 的生命周期边界，并优先补固定中间态视觉差分；保持单一 Chrome 页面和每轮本地 Git 提交。
