---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: main-atlas-and-rgba-noise-resource-boundary
source_logs:
  - "[[日志/2026-08-25-主工程SceneMetadata迁移与QA|主工程 Scene Metadata 迁移与五视口 QA]]"
supersedes: null
---

# 主工程 Atlas 与 RGBA Noise 资源边界迁移及 QA

## 目标

继续把根目录主工程的 source-derived World 内容边界解构到 Branch。审计发现 Branch 虽然有 `rgbaNoise` 路径，但未进入实际静态资源清单；同时 `WatercolorView` 直接导入 `config/atlas-*.json`，使 26 个纸片的 SDF/纹理 remap 和 reveal schedule 绕过了 Definition。

## 已实施变更

- 新增 `app/src/content/atlas.ts`，以类型化内容边界承载 SDF atlas entries、texture atlas entries 和 26 个 paper layer schedule；底层 JSON 仍是只读提取数据，不复制或改写数值。
- `ExperienceDefinition.world` 增加 `atlas`，`WatercolorView` 的 `_sdfMap`、`_texMap` 和 reveal schedule 改为从 definition 初始化；保留 `PaperConfig.startAt` 作为兼容字段，但实际触发优先使用 source schedule。
- `app/src/content/world.ts` 将主工程 `worldAssets.rgbaNoise` 注册为 `noise/rgba-pixel` 静态资源，修正资源路径存在但未进入 loader 图的问题。
- QA 增加 atlas 条目数量、paper name 覆盖、schedule 一致性、树节点 remap 和 rgbaNoise resource binding 断言。

## 验证

- `npx tsc --noEmit`：通过。
- `npm run build`：通过，67 modules；仅保留既有大 chunk warning。
- `npm run verify:integrity`：73/73 通过。
- `node --check scripts/qa-experience.mjs`：通过。
- 复用 Chrome 9333 唯一网页目标执行五视口 QA：`passed: true`、`sourceRevealProfilePassed: true`、5 cases、console errors 0、remote resources 0。
- 五视口 definitionContent 均确认：SDF/texture/schedule 各 26 条，paper names 全覆盖，schedule 与 `PaperConfig.startAt` 一致，`tree_1` SDF remap x 为 `0.10248046875`、texture remap x 为 `0.0048828125`，rgbaNoise 绑定成功；既有流体、Reveal、Ground、Cutouts、Full Paint、Poem、音频、fallback、FAQ、Restart 和光标门禁继续通过。
- 浏览器状态：9333 仍只有一个 Branch 页面；9334、9336、9337 无可用页面；未创建重复页面。第一次运行遇到已知 CDP attach race，复用同一页面重跑后通过。

## 遗留与下一步

- `PAPERS_CONFIG` 仍保留部分 source-derived paper 字段作为 legacy 兼容配置；下一轮继续审计 paper 的 ground/sdf/leaves/cutout 参数是否可以按职责拆入 definition，而不改变已经验证的 shader 输入。
- 本轮证明了 Branch 自身资源/图集架构和 WebGL 行为一致，不替代 root/main 与 Branch 固定 seed、固定 reveal 中间态的像素差分。
