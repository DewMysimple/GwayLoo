---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: main-scene-metadata-definition-and-five-viewport-qa
source_logs:
  - "[[日志/2026-08-25-主工程World资源定义迁移与QA|主工程 World 资源定义迁移与五视口 QA]]"
supersedes: null
---

# 主工程 Scene Metadata 迁移与五视口 QA

## 目标

继续针对 Branch `Dew-StanzaVerse` 复刻根目录主工程的架构内容边界。把根目录 `src/content/scenes.ts` 中的六场景 label、title 和 `focusProgress` 纳入 Branch 的 `ExperienceDefinition`，消除通过 `PAPERS_CONFIG` 的隐式标题/时间推断，同时保持现有 WebGL 视觉参数不变。

## 已实施变更

- `app/src/experience/definition.ts` 新增六场景的 source-derived metadata：`场景 1` 到 `场景 6`、六个主工程英文标题，以及 `[0.02, 0.14, 0.26, 0.34, 0.55, 0.66]` 六个 `focusProgress`。
- `SceneDefinition.focusTime` 保留为兼容字段，但改为 `focusProgress * CAMERA_ANIMATION_DURATION` 派生；`ExperienceManager` 的 runtime `sceneStarts` 继续从 definition 派生，不再从纸张标题和 `startAt` 猜测场景入口。
- `app/scripts/qa-experience.mjs` 增加 definition 与 runtime 双向断言，检查五视口下 labels、titles、progress 和 runtime scene starts 使用同一组主工程事实。

## 验证

- `npx tsc --noEmit`：通过。
- `npm run build`：通过，66 modules；保留既有约 868 KB JS chunk warning，未引入新的构建错误。
- `npm run verify:integrity`：73/73 通过。
- `node --check scripts/qa-experience.mjs`：通过。
- 复用 Chrome 9333 唯一网页目标执行五视口 QA：`passed: true`、`sourceRevealProfilePassed: true`、5 cases、console errors 0、remote resources 0。
- QA 报告确认五个视口均返回相同的六场景 metadata；runtime starts 与 definition progress 逐项一致。既有流体、27 个 simulation region、Ground batch、Cutouts SDF 阴影、Full Paint、Poem、音频、fallback、FAQ、Restart 和 cursor 门禁继续通过。
- 浏览器状态：9333 仅保留一个 Branch 页面；9334、9336、9337 无可用页面；未创建重复页面。第一次运行遇到已知 `Not attached to an active page` 导航附着竞态，复用同一页面重跑后通过。

## 遗留与下一步

- `PAPERS_CONFIG` 仍负责 Branch 的纸片/Ground layout 与 reveal timing，作为已验证的底层配置保留；下一轮继续审计 root `scenes.ts` 与 paper manifest 的其他可观测字段，按可验证顺序迁入 definition。
- 本轮证明的是架构内容绑定和 Branch 自身行为，不等同于 root/main 与 Branch 的同 seed 同时间像素差分；视觉收敛仍需固定 `freeze`、`reveal`、视口、等待时长和指针状态后再做。
