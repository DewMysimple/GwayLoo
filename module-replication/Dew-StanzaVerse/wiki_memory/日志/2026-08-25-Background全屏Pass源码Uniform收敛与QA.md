---
type: log
status: archived
kind: architecture
importance: high
updated: 2026-08-25
topic: background-fullscreen-pass-source-uniform-contract
source_logs:
  - "[[日志/2026-08-25-全局Ground背景与阴影职责重建及交付QA|全局 Ground、Background 与阴影职责重建及交付 QA]]"
  - "[[日志/2026-08-25-Paper交付波纹增益收窄与主工程架构边界QA|Paper 交付波纹增益收窄与主工程架构边界 QA]]"
supersedes: null
---

# Background 全屏 Pass 源码 Uniform 收敛与 QA

## 背景

上一轮已把 Paper 可见层的 simulation delivery gain 收窄到 `0.015`，本轮不再改变 Fluid、Paper 或波纹参数，而是继续处理 Branch 与原始提取之间尚未完全对齐的 WebGL 结构差距。检查 `sources/original-extraction/study/extracted-shaders/27_fragmentShader.glsl` 与 `28_vertexShader.glsl` 后确认，`ShadowProjection.ts` 内的 fullscreen composite 仍是手写近似：虽然输出形态接近源码，但 Background/Lighting 的值被硬编码在该类内部，没有复用 Paper/Global Ground 的 source uniform 对象。

## 实现

- 新增 `app/src/shaders/background.ts`，把原始 27/28 的 Background pass 拆为独立 vertex/fragment shader；保留 `uProjectionInverse`、`uViewMatrixInv` 与主相机 `uViewMatrix` 的 Branch fullscreen adapter，使 fog depth/world position 在独立正交 composite camera 下仍与源码契约一致。
- `backgroundFragmentShader` 恢复源码形状的 `uBackground`、`uLighting`、`uRatio`、屏幕高光、三态 fog 与 `linearToSrgb`，明确不消费 `uShadowMap`；投影阴影仍只由 Ground、Paper/Cutouts 的既有消费者读取。
- `ShadowProjection.init()` 接收 Paper 材质的 `uBackground/uLighting` uniform descriptor；Background、Paper、Global Ground 后续读取同一组颜色/光照状态，避免三处参数漂移。Paper 和 Fluid 交付增益保持不变。
- QA 新增 Background pass 门禁：确认 composite 存在 source-shaped shader、`uLighting/uBackground/uRatio` 与 drawing-buffer resolution，同时确认它不重复消费 `uShadowMap`。

## 验证

- `npm run build`：通过。
- `npm run qa`：首次运行在总门禁收尾阶段返回一次 `passed:false`，但报告中 Background shader 已编译且各新增状态为真；未据此猜改代码。第二次完整复跑通过，五视口、source reveal、中间态、Fluid activity、Full Paint/Poem、音频、失败降级、reduced-motion、context loss、`consoleErrors=[]`、`remoteResources=[]` 均通过，`passed=true`。
- 通过 9333 CDP 复用同一页面 reload 后复核：`phase=scroll`、runtime `phase=exploring`、`assetsReady=true`、`error=null`、Background source shader 已挂载、普通 Fluid active 状态为空；未创建重复 Chrome 页面。
- 当前稳定截图：`app/.artifacts/qa/background-pass-2026-08-25-1440x900.png`。

## 边界

本轮是源码职责/Uniform 链的结构收敛，不宣称已经完成主工程与 Branch 的像素级一致；没有修改 Paper 的 `DELIVERY_SIMULATION_VISUAL_GAIN=0.015`、Fluid 底层方程、Ground/Shadow 强度或 cursor。后续继续以固定 seed/freeze/reveal、视口、输入轨迹做中间态视觉差分。

本轮只修改 Branch，没有写入根目录 `wiki_memory`；没有暂存或修改用户未跟踪的 `Start.cmd`，只做本地 Git 提交，不推送远程仓库。
