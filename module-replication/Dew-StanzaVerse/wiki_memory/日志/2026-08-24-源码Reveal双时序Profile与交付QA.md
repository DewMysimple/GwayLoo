---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-24
topic: reveal-profile-and-delivery-qa
source_logs:
  - "[[日志/2026-08-21-图层时间与边缘追赶|图层时间与边缘追赶]]"
  - "[[日志/2026-08-24-流体AdvectionV2多步轨迹与交付QA|流体 Advection v2 多步轨迹与交付 QA]]"
supersedes: null
---

# 源码 Reveal 双时序 Profile 与交付 QA

## 目标

继续以 `sources/original-extraction/` 为唯一基线，收敛纸片 reveal 时间、GSAP ease、shader 边缘补全与当前可交付页面之间的差异；保留 Branch 既有交付速度，同时建立可重复的源码时序入口，供后续截图/像素差分使用。

## 源码确认

- 原始 `_revealAnimation` 的默认纸片并行轨道是：`uAlpha` 0.01 秒、`uCurveCoef` 10 秒 `quart.out`、`rotationZ` 7 秒 `back.out`、`uRevealProgress` 15 秒线性从 0 到 15。
- 原始 `fade` 纸片保持 `rotationZ=0`，只做 3 秒 `sine.inOut` alpha 淡入；当前 Branch 的 Ground 0.4 秒淡入与原站的 Ground 层职责保持独立。
- Branch 既有 3/5/7 秒与 0.5 秒普通纸片 edge catch-up 是用户选定的页面交付策略，不是原始 bundle 的时间常量。

## 决策与实现

- `app/src/config/papers.ts` 新增 `delivery` / `source` 两套 `PaperRevealTiming`。默认 profile 仍是 `delivery`（3/5/7 秒、普通层补全保持开启）；URL 使用 `?reveal=source` 时切换为源码 7/10/15 秒，并将 `uCompleteLayerBaseline` 设为 0，使 Branch 额外普通层补全在源码比较模式中成为 no-op。
- `WatercolorView` 的 timeline 改用与源码等价且可读的 `quart.out`、`back.out`，新增 `getRevealTiming()` 供浏览器 QA 读取当前 profile；透明背景层仍只执行 3 秒 alpha 淡入。
- 两种 profile 共用四点 reveal、`computeInkReveal`、SDF、LUT、流体、Ground、Shadow 与相机，不复制另一套材质架构，避免时序切换改变底层交互边界。
- QA 默认五视口检查 delivery profile；随后加载 `?reveal=source`，逐项检查 7/10/15 秒、15 的进度上限和关闭普通层补全。超宽 2560 视口的草叶探针按渲染负载延长等待窗口；流体 decay 仍要求 3 秒归零，只容许 half-float 中间值小幅量化抖动。

## 变更范围

- `app/src/config/papers.ts`
- `app/src/experience/world/WatercolorView.ts`
- `app/scripts/qa-experience.mjs`
- `wiki_memory/当前状态/项目概览.md`
- `wiki_memory/当前状态/系统架构.md`
- `wiki_memory/当前状态/当前待办.md`

## 验证

- `npm run verify`：通过；Vite 54 modules，73/73 本地素材完整性通过。
- `npm exec -- tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `git diff --check`：通过；仅保留既有换行格式提示。
- `npm run qa -- http://127.0.0.1:3000/ .artifacts/qa/reveal-profile-2026-08-24`：通过，报告 `passed: true`。
- 五视口均通过；源码 profile 通过；`consoleErrors=[]`、`remoteResources=[]`。

## 结果与遗留

当前 Branch 已能在同一套运行时中分别验收“可交付时序”和“源码时序”，后续可以对同一 `seed`、同一 `freeze` 和同一视口直接生成截图对照。当前仍未完成原站与 Branch 的真实截图/像素差分，也未将新的报告迁入 `evidence/qa/` 正式证据目录。

## 待确认长期记忆

- `?reveal=source` 作为源码截图/像素差分 profile 保持 active；默认页面继续使用 delivery profile，直到视觉证据证明应该切换默认时序。
