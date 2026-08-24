---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: main-paper-manifest-webgl-boundary
source_logs:
  - "[[日志/2026-08-25-主工程Atlas与RGBA噪声资源边界迁移及QA|主工程 Atlas 与 RGBA Noise 资源边界迁移及 QA]]"
supersedes: null
---

# 主工程 Paper Manifest 与 WebGL 职责边界迁移及 QA

## 目标

继续把 Branch 从“运行时各处直接读取 config”推进为主工程式 Definition 解构。审计 `PAPERS_CONFIG` 的全部引用后，将 ground、SDF、leaves、shadow/hole、fade、标题和 reveal timing 的运行时读取统一经过 `content/papers.ts` 与 `ExperienceDefinition.world.papers`，保持原始 26 项数据不变。

## 已实施变更

- 新增 `app/src/content/papers.ts`，作为 source-extracted paper manifest 的内容边界，导出 `paperManifest`、`PaperConfig`、reveal timing、camera duration、camera scroll end 和 Ground atlas 类型/数据。
- `ExperienceDefinition` 改用 `paperManifest`；`WatercolorView`、`PaintingTitles`、`LeavesLayer`、公共 experience types 和 Paper shader 均改为从 content boundary 读取或引用类型。
- `WatercolorView` 的纸片、Ground、leaves、shadow/hole、fade 与标题配置现在由同一 Definition 入口注入；`config/papers.ts` 仅作为底层只读提取 payload 保留。
- QA 增加 Paper manifest 结构断言，覆盖 26 张纸、23 个 Ground、10 个 leaves、24 个 cast shadow、24 个 hole、1 个 fade、6 个 title 以及 ground/SDF/leaves/cutout 必要字段。

## 验证

- `npx tsc --noEmit`：通过。
- `npm run build`：通过，68 modules；仅保留既有大 chunk warning。
- `npm run verify:integrity`：73/73 通过。
- `node --check scripts/qa-experience.mjs`：通过。
- 复用 Chrome 9333 唯一网页目标执行五视口 QA：`passed: true`、`sourceRevealProfilePassed: true`、5 cases、console errors 0、remote resources 0。
- QA 确认 Paper manifest contract、atlas remap/schedule、27 个 simulation region、Reveal、Ground batch、Cutouts SDF、树叶、流体、相机、Poem、音频、Full Paint、context loss、reduced-motion、FAQ、Restart 和 cursor 门禁继续通过。
- 浏览器状态：9333 仅保留一个 Branch 页面；9334、9336、9337 无可用页面；未创建重复页面。第一次运行遇到已知 CDP attach race，复用同一页面重跑后通过。

## 遗留与下一步

- `config/papers.ts` 仍保留完整原始数据和兼容字段；后续可继续把 PaperConfig 按 ground/SDF/vegetation/shadow 职责拆成更细的 source-derived 子定义，但必须保持同一渲染输入和中间态证据。
- 本轮是架构边界与 Branch 自身行为验证，不等同于 root/main 与 Branch 的固定 seed、固定 reveal 中间态像素差分。
