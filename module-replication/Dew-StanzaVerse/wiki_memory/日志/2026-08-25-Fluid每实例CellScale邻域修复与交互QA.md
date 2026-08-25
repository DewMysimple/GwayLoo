---
type: log
status: archived
kind: architecture
importance: high
updated: 2026-08-25
topic: fluid-per-instance-cell-scale
source_logs:
  - "[[日志/2026-08-25-流体笔刷源参数与可见波纹幅度收敛QA|流体笔刷源参数与可见波纹幅度收敛 QA]]"
  - "[[日志/2026-08-25-Background全屏Pass源码Uniform收敛与QA|Background 全屏 Pass 源码 Uniform 收敛与 QA]]"
supersedes: null
---

# Fluid 每实例 CellScale 邻域修复与交互 QA

## 结论

本轮修正了 Fluid 图集内部一个结构级差距：原始 01/03 顶点 shader 通过 `px[INSTANCE_COUNT]` 为每个 simulation tile 提供自己的单元尺度，Branch 之前却让 Divergence、Pressure、Gradient 共用整张 atlas 的 `uTexelSize=1/atlasSize`。这会让不同纸片分辨率下的左右/上下邻域步长不一致，并可能放大 atlas 边界附近的空间频率差异。

现在 `simVertexShader` 以实例属性 `aCellScale` 传递每个 tile 的 `(1/tile.width, 1/tile.height)` 到 `vCellScale`；Divergence、Pressure、Gradient 都用它取邻居并在各自 region 内夹取。`SimulationRegion.texelSize` 同步明确为该 tile 的 atlas-normalized 单格。原有的 `0.008 × tileWidth / atlasWidth` per-tile `dt` 没有改变，`DELIVERY_SIMULATION_VISUAL_GAIN=0.015` 和 Paper 波纹强度也没有改变。

## 证据与交互观察

- 同一 Chrome 页面做了短轨迹和约 1 秒轨迹采样，之后等待约 5 秒；Fluid state 能退出 active，未复现无限 active 注入。
- `interactive-ripple-short.png`、`interactive-ripple-1s.png` 和最终 `cell-scale-1440x900.png` 均显示稳定的局部水彩变化，没有把“高频诊断纹理”继续当作交付层增益来放大。
- 这轮修复针对每实例空间邻域，不把波纹半径、force 或 Paper 可见层增益继续收窄；最终仍需固定 seed/freeze/reveal 与主工程做同状态截图和像素差分。

## Shader 推理辅证

本轮参考 Curtis 等人的计算水彩分层/颜料流动模型和 Stam 的稳定流体压力投影资料，作为 shader 推理的学术辅证；具体数值、pass 顺序、实例输入和资源契约仍以本地原始 bundle 的 shader 提取为准：

- [Curtis et al., Computer-Generated Watercolor](https://grail.cs.washington.edu/wp-content/uploads/2015/08/curtis-1997-cgw.pdf)
- [Stam, Stable Fluids](https://graphics.stanford.edu/courses/cs448-01-spring/papers/stam.pdf)

## QA

- `npx tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `git diff --check`：通过。
- `npm run verify:integrity`：73/73 通过。
- `npm run build`：通过。
- `npm run qa`：通过，五视口、Fluid pass 新增 per-instance cell scale gate、Full Paint、Poem、音频、fallback、context loss、console errors 和 remote resources 均通过，报告 `passed: true`。
- Chrome DevTools Protocol 9333：保持唯一 Branch 页面，最终 URL 为 `http://127.0.0.1:3000/?seed=47&freeze=6#autostart`，runtime 为 `exploring`，assets 为 ready，error 为 null；未新增重复页面。

## 边界与后续

本轮只改 Fluid 的源码级实例 cell scale 和对应 QA，不改 `Start.cmd`，不写入主线 `wiki_memory`，不推送远端。下一轮优先做固定 seed/freeze/reveal、固定视口和固定指针状态下的主工程/Branch 跨分辨率截图与像素差分，继续区分真实架构差距和交付视觉保护层。
