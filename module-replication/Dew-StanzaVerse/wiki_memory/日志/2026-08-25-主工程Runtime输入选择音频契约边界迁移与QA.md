---
type: log
status: active
kind: feature
importance: high
updated: 2026-08-25
topic: runtime-contract-boundary
source_logs:
  - "[[日志/2026-08-25-主工程PaperManifest与WebGL职责边界迁移及QA|Paper manifest 与 WebGL 职责边界迁移]]"
supersedes: null
---

# 主工程 Runtime 输入、选择、音频与契约边界迁移及 QA

## 目标

继续以根目录主工程源码为依据推进 Branch 复刻，但不把主工程中尚未实际挂载的 R3F React 运行时脚手架直接替换现有 legacy WebGL 页面。优先抽出对当前运行路径有约束力的输入、状态选择、Definition contract 和音频语义。

## 确认的差距与决策

- 根目录主工程 `src/features/experience/runtime/` 的 `input.ts`、`selection.ts`、`contract.ts`、`audio.ts` 当前主要是迁移边界/脚手架，并未被页面入口直接消费；Branch 的 `ExperienceManager`、`ScrollController`、`AudioManager` 才是现有水彩页面真实运行路径。
- Branch 新增 `runtime/input.ts`，把 wheel/touch 归一化、section progress 和浏览器滚动到 baked camera timeline 的纯映射集中管理；`ScrollController` 改为调用该映射，并从 `ExperienceDefinition.runtime.travelMultiplier` 读取 7.5，而不是重复硬编码。
- Branch 新增 `runtime/selection.ts`，将 runtime progress clamp、诗句断点和六场景选择从 reducer 内部函数抽出；reducer 继续保留状态转移职责。
- Branch 新增 `runtime/contract.ts`，由 `ExperienceDefinition` 派生 scene starts、poem breakpoints、camera tail seconds 和 travel multiplier；`ExperienceManager.runtimeContract` 作为只读 QA/调试边界，legacy visual phase 仍与 runtime phase 分离。
- Branch 新增 `runtime/audio.ts`，将 `main`、`poem`、`landscape` 等 runtime 语义映射到 `loop-main`、`loop-poem`、`loop-painting`；没有替换 `AudioManager` 的解锁、静音、可见性和淡入淡出行为。
- 未迁移主工程的 React `useExperienceAudio`，避免给 Branch 引入与既有 DOM 音频生命周期重复的第二套播放器。

## 代码变更

- `app/src/experience/runtime/input.ts`
- `app/src/experience/runtime/selection.ts`
- `app/src/experience/runtime/contract.ts`
- `app/src/experience/runtime/audio.ts`
- `app/src/experience/runtime/reducer.ts`
- `app/src/experience/scroll/ScrollController.ts`
- `app/src/experience/ExperienceManager.ts`
- `app/scripts/qa-experience.mjs`

QA 现在通过公开 `runtimeContract` 断言六个 scene starts、`[0.32, 0.62]` poem breakpoints、`cameraTailSeconds=4.7667` 和 `travelMultiplier=7.5`，并继续检查 Full Paint landscape、音频主题、source reveal、流体和页面降级。

## 验证结果

- `npx tsc --noEmit`：通过。
- `npm run build`：通过，72 modules，保留既有 large chunk warning。
- `npm run verify:integrity`：73/73，通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `npm run qa -- http://127.0.0.1:3000/ .artifacts/qa/runtime-contract-2026-08-25-rerun`：通过；5 个视口、source reveal profile、`consoleErrors=0`、`remoteResources=0`。
- Chrome 实时状态：查询 9333/9334/9336/9337 后仅复用 9333 上已有的一个 page `http://127.0.0.1:3000/?seed=47&freeze=6`；QA 导航到同一 page 的 `#autostart`，没有新增网页 target。9333 的 browser_ui/worker target 不计为重复网页。
- 首次 QA 失败是门禁表达式把 `CAMERA_SCROLL_END` 误写为 39.5；实际 Branch source value 为 55，修正为 `59.7667 - 55` 后复跑通过。该过程没有修改 WebGL 视觉参数。

## 遗留与下一步

- `runtime/reducer.ts` 的无外部 config fallback 仍保留历史 scene starts，正常入口已始终注入 Definition-derived contract；后续可再决定是否将 fallback 也收敛到 source content。
- 继续优先做 paper manifest 的 ground/SDF/vegetation/shadow 子契约和固定 reveal 中间态的同 seed 像素差分；不得用未冻结时序的 Auto 末态截图反推水彩密度。

## 待确认长期记忆

- 建议长期保留：主工程 runtime 目录不是 Branch legacy WebGL 的可直接替换实现；迁移时优先采用 Definition-derived pure boundaries，避免引入第二套音频或渲染生命周期。
