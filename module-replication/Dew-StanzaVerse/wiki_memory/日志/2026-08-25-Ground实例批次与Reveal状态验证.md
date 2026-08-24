---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: ground-instanced-batch-and-reveal-state-verification
source_logs:
  - "[[日志/2026-08-25-全局Ground背景与阴影职责重建及交付QA|全局 Ground、Background 与阴影职责重建及交付 QA]]"
  - "[[日志/2026-08-24-Ground与渲染分辨率契约对齐|Ground 与渲染分辨率契约对齐]]"
  - "[[日志/2026-08-24-源码Reveal双时序Profile与交付QA|源码 Reveal 双时序 Profile 与交付 QA]]"
supersedes: null
---

# Ground 实例批次与 Reveal 状态验证

## 目标

继续以 Branch 自己的 `sources/original-extraction/` 为源码基线，补齐源码 `Grounds` 组件与当前 Branch 逐纸 Mesh 之间的架构差距，同时确认 Auto 服务器与手动打开页面的视觉差异来自 reveal 时间状态，而不是擅自改变默认纸片材质参数。

## 源码对照结论

- 源码 `Grounds` 使用一个覆盖全部纸片索引的 `InstancedMesh`，几何属性包含 `instance`、`size`、`simulationBox`、`simulationRemap`，材质使用 `uVisible[]`、`uAlpha[]`、`uAtlasRemap[]`。
- Branch 之前每个 `hasGround` 纸片创建一个独立 Mesh；本轮改为一个 `SourceGroundsBatch`，26 个实例槽全部保留，只有配置为 `hasGround` 且已 reveal 的索引打开 `uVisible`。
- Three CPU Raycaster 不执行顶点 shader 中的 `uVisible` 折叠，因此命中 Ground 批次后必须通过 `instanceId` 和 Branch 的可见索引再次过滤；命中后仍使用该 Ground 纸片自己的模拟区域和草层变换。
- `GrassLayer` 不再依赖逐纸 Ground 渲染 Mesh，只接收源码 Ground 变换元数据；Ground 的绘制、射线批次和草层职责分离。

## Reveal 视觉状态结论

- 没有修改默认 `delivery` profile、`uNormalMapStrength`、`uNormalMapScale` 或纸片波纹参数。
- Auto `cdp-smoke` 会在导航后固定等待约 20 秒；默认 delivery reveal 已进入末态，底图纹理完全显现，画面会比手动刚打开的中途 reveal 更深、纹理更密。
- 后续视觉比较必须固定 URL 查询参数（特别是 `freeze` / `reveal`）、视口、等待时间和指针状态。中途显现与末态不能互相作为视觉回归基线。

## 变更范围

- `app/src/shaders/ground.ts`
- `app/src/experience/world/WatercolorView.ts`
- `app/src/experience/world/GrassLayer.ts`
- `app/scripts/qa-experience.mjs`
- `wiki_memory/当前状态/项目概览.md`
- `wiki_memory/当前状态/系统架构.md`
- `wiki_memory/当前状态/当前待办.md`

## 验证结果

- `npm run build`：通过，Vite 58 modules；保留既有大 chunk warning。
- `npm exec -- tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `git diff --check`：通过；仅有既有 LF/CRLF 提示。
- 固定 `?seed=47&freeze=6#autostart`、1440×900 的 CDP smoke：通过，`phase=scroll`、`time=6`、`SourceGroundsBatch`、`count=26`、`consoleErrors=[]`，当前时刻 23 个 Ground 实例已可见并有 alpha。
- 完整五视口 QA 本轮因需要保持用户当前手动页面作为视觉参考而中止，不能把本轮报告宣称为完整交付验收；下一轮应使用统一 freeze 状态重新执行。

## 结果与遗留

Ground 的源码实例化架构已收敛，默认视觉参数保持不变。当前不能据 Auto 服务器的末态截图推导“波纹密度需要降低”；后续优先做同状态截图和 DPR/横竖屏回归，再决定是否存在真实材质差异。

## 待确认长期记忆

- 保持 `delivery` 作为当前交付默认，`?reveal=source` 作为源码比较入口；所有视觉证据必须记录 reveal 状态。
