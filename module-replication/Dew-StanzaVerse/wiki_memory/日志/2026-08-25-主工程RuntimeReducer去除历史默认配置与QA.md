---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: runtime-reducer-definition-required-contract
source_logs:
  - "[[日志/2026-08-25-主工程设备能力与移动端降级Definition边界及空闲笔刷QA|主工程设备能力与移动端降级 Definition 边界及空闲笔刷 QA]]"
  - "[[日志/2026-08-25-主工程Runtime输入选择音频契约边界迁移与QA|主工程 Runtime 输入、选择、音频与契约边界迁移及 QA]]"
supersedes: null
---

# 2026-08-25｜主工程 Runtime Reducer 去除历史默认配置与 QA

- 时间：2026-08-25（北京时间）
- 类型：`feature`
- 状态：`完成`
- 目标：继续针对 Branch 复刻主工程的 Definition → runtime contract → reducer 边界，移除 reducer 内仍可能把旧时间线带回运行时的历史 fallback；不调整水彩材质、波纹密度、Reveal profile 或设备策略。
- 日志索引：[[日志/MOC_工作日志|工作日志 MOC]]

## 差距判断

- 主工程运行时的选择值由 content/Definition 输入到 runtime；Branch 的正常生产入口已经由 `ExperienceManager` 创建 `RuntimeContract` 并传给 reducer，但 `runtime/reducer.ts` 仍保留硬编码 `sceneStarts`、`poemBreakpoints` 默认值。
- 该默认值与 Branch 当前 Definition 的六个 `focusProgress` 只是恰好一致，不应继续作为第二个事实来源；一旦调用方漏传合约，旧数值会静默接管场景/诗句选择，造成“页面能运行但架构内容不是主工程”的隐性分叉。
- `ExperienceManager` 也曾用空 `sceneStarts`、默认诗句断点、零 camera tail/travel multiplier 初始化字段，再在 constructor 中覆盖；虽然不会在生产 constructor 完成前暴露，但仍是一个不真实的运行时占位。

## 本轮改动

- `app/src/experience/runtime/reducer.ts`
  - `RuntimeReducerConfig` 从 `Pick<RuntimeContract, ...>` 收窄为纯 `RuntimeSelectionConfig`，让 reducer 只依赖选择所需的窄输入，不反向依赖完整编排合约。
  - 删除 `DEFAULT_CONFIG` 及其中的硬编码 scene starts/poem breakpoints。
  - reducer 的 `config` 改为必传；Definition-derived contract 缺失时由类型和调用链暴露问题，不再静默回到历史架构。
- `app/src/experience/ExperienceManager.ts`
  - `_runtimeState`、`_runtimeConfig`、`_state` 改为 constructor 内基于当前 Definition/性能档位初始化。
  - 删除空 RuntimeContract 占位和重复的 state runtime 回写。

## 保持不变的范围

- 没有改动 shader、paper material、fluid force/advection/pressure、Ground、Shadow、Leaves、Cursor、Full Paint 视频或 Reveal timing。
- 没有修改主线工程、原始提取、Chrome 页面数量或 Branch 的 `Start.cmd`。
- `config/papers.ts`、`config/assets.ts` 等原始事实映射仍按既有协议保留；本轮只消除了 runtime reducer 的默认行为，不扩大到删除历史配置。

## 检查与验证

- `npx tsc --noEmit`：通过。
- `npm run verify`：通过；Vite build 72 modules，保留既有大 chunk warning；`verify:integrity` 为 73/73。
- `npm run qa`：通过；`passed: true`、`sourceRevealProfilePassed: true`、五视口、console errors 0、remote resources 0。
- QA 保持通过的关键证据：desktop/mobile Definition device 与视频路径、27 个 simulation region、Full Paint、Poem、纸片/Ground/Cutout/Leaves、idle hover `idleCalls=0`、资源失败 fallback、WebGL context-loss fallback、reduced-motion 静态交互。
- 最新报告由现有 QA 流程刷新于 `app/.artifacts/qa/layer-timing-2026-08-21/report.json`；文件名是历史目录名，内容以本次 `checkedAt` 和 `passed` 为准。

## Chrome 状态

- 按约定先查询 9333/9334/9336/9337；只复用 9333 的原有 page target `EDE3099B0AE6CD87CB2419FC8CA1E724`，没有创建新 tab/page。
- QA 的 context-loss 门禁结束时会按设计进入 fallback；随后对同一 target 做 hard reload，`#autostart` 自动重新进入。
- 最终 CDP：`http://127.0.0.1:3000/?seed=47&freeze=6#autostart`，`assetProgress=100`、runtime `phase=exploring`、`experiencePhase=scroll`、`fallback=false`、`error=null`、`device=desktop`。
- 9334、9336、9337 未提供可用 CDP 页面。

## 结果与下一步

- 结果：Branch 的 runtime reducer 不再拥有第二套历史 scene/poem 默认事实；Definition-derived contract 成为唯一生产输入，且 reducer 与完整 RuntimeContract 的依赖已收窄。
- 下一步：继续审计 GLB transform/reveal state 生命周期和 Paper identity 的剩余兼容层，优先做固定 seed/freeze/reveal 中间态视觉差分；维持唯一 Chrome page、每轮本地 Git commit、不推送。
