---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: source-paper-grouped-reveal-delay
source_logs:
  - "[[日志/2026-08-25-主工程Paper身份与Reveal契约收窄及QA|主工程 Paper 身份与 Reveal 契约收窄及 QA]]"
  - "[[日志/2026-08-25-主工程RuntimeReducer去除历史默认配置与QA|主工程 Runtime Reducer 去除历史默认配置与 QA]]"
supersedes: null
---

# 2026-08-25｜源码 Paper 分组 Reveal 延迟与层同步 QA

- 时间：2026-08-25（北京时间）
- 类型：`feature`
- 状态：`完成`
- 目标：继续从 Branch 的原始提取源码还原 Paper reveal 生命周期，修正同一 `startAt` 分组、首层入口延迟、Ground/Cutout 同步启动和浏览器 QA 的中间态验证；不改变用户已关注的水彩材质、波纹密度、默认 delivery profile 或设备降级策略。
- 日志索引：[[日志/MOC_工作日志|工作日志 MOC]]

## 源码证据与差距

- 原始提取 `sources/original-extraction/study/app.beautified.js` 的 `Paper`/`papersContainer` 路径显示：纸片先按相同 `startAt` 组成 `TZ` 组；`papersContainer.show(name, groupIndex)` 把首纸的 1.5 秒入口延迟（`noIntro` 时跳过）和同组每项 0.3 秒错峰作为共享子时间线 delay。
- 该 delay 作用于 Paper、Cutout、Shadow、Ground 的共同动画时间线，不是把滚动相机的 `startAt` 再加一个阈值。此前 Branch 若把 delay 加到 `triggerTime`，会让首纸直到 `cameraTime=1.5` 才开始建立 reveal，错误地把动画时序变成滚动时序。
- 当前 GLB 的运行时 world position/scale 测量没有发现 `tree_1`、`viaduc_1`、`background_2` 的可观测位置偏差，因此本轮不改 transform 公式；transform world hierarchy 仍列为下一轮独立审计。

## 本轮改动

- `app/src/experience/world/WatercolorView.ts`
  - PaperEntry 增加 `revealStartAt`、`revealDelay`；初始化前按 Definition atlas schedule 和 manifest 顺序建立同组 index。
  - `update()` 在 `triggerTime >= revealStartAt` 时建立 reveal，不再把 delay 加进滚动触发阈值。
  - `_reveal()` 使用共享 GSAP timeline delay，Paper、Cutout、Ground 的可见性与 alpha 从同一延迟边界启动；Shadow 的 alpha 仍随纸片状态更新。
  - 新增 `getRevealSchedule()`，暴露 `startAt`、`delay`、`triggerAt`、`animationStartAt` 给确定性 QA。
- `app/src/experience/world/InkReveal.ts`
  - 增加源码对应的 `?noIntro` debug 选项；正常路径保留源工程的 1.5 秒首纸入口延迟。
- `app/scripts/qa-experience.mjs`
  - 增加 26 项 Paper 分组调度断言，分别确认 `triggerAt === startAt` 和 `animationStartAt === startAt + delay`。
  - 入口探针等待覆盖 1.5 秒首纸 delay；Ground 生命周期验证 delay 前不可见、delay 后可见；首层鼠标探针仍要求真实 movement/brush sample 且 idle 不刷新。

## 保持不变的范围

- 没有改动 Paper fragment shader、SDF 波纹密度、fluid force/advection/pressure、LUT、Ground/Shadow 强度、delivery 3/5/7 秒 profile、source 7/10/15 秒 profile 或移动端能力策略。
- 没有修改主线工程、原始提取、根目录主工程记忆或 Branch `Start.cmd`；没有新增 Chrome page，也没有推送 Git。

## 检查与验证

- `npx tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `npm run verify`：通过；Vite build 72 modules，保留既有大 chunk warning；`verify:integrity` 为 73/73。
- `npm run qa`：通过；最终报告 `passed: true`、`sourceRevealProfilePassed: true`、五视口、console errors 0、remote resources 0。
- 关键最终 QA 结果：Paper schedule 26/26 且匹配；Ground `visibleBeforeDelay=false`、`visibleAfterDelay=true`；桌面 `movementCalls=38`、`idleCalls=0`、brush sample 存在；Full Paint、Poem、Leaves、Cutout、资源失败 fallback、context-loss fallback、reduced-motion、音频和 Restart 均通过。
- 报告路径：`app/.artifacts/qa/layer-timing-2026-08-21/report.json`；目录名沿用历史命名，以报告内本次 `checkedAt` 和 `passed` 为准。

## Chrome 状态

- 按约定复核 9333/9334/9336/9337；只复用 9333 的既有 page target `EDE3099B0AE6CD87CB2419FC8CA1E724`，没有创建新 tab/page；9334、9336、9337 无可用页面。
- QA 的 context-loss 探针结束时会暂时进入 fallback；随后对同一 target 做 hard reload，最终恢复为 `http://127.0.0.1:3000/?seed=47&freeze=6#autostart`，runtime `phase=exploring`、`assetProgress=100`、`fallback=false`、`error=null`、26 张纸已初始化。

## 结果与下一步

- 结果：Branch 已恢复源码 Paper 分组 reveal 的“双时序”语义：滚动 `startAt` 负责触发，层共享 delay 负责显现；Ground/Cutout 不再比 Paper 提前进入可见态。QA 也能捕获这个中间态，不再只验证末态。
- 下一步：继续审计 Paper 的 GLB world transform、Paper/Shadow/Cutout/Ground hide 生命周期和 pointer movement 下的共同投影，再做固定 seed/freeze/reveal/视口的主工程与 Branch 截图/像素差分；维持唯一 Chrome page、每轮本地 Git commit、不推送。

## 待确认长期记忆

- 将“源码 `papersContainer.show()` 的 delay 属于共享 reveal 时间线，而非滚动触发阈值”作为后续 Paper/层同步审计的稳定事实；本日志已记录证据和 QA 门禁，当前状态页由索引同步更新。
