---
type: log
status: archived
kind: bug
importance: high
updated: 2026-08-25
topic: paper-fullpaint-shared-reveal-noise-wrap-and-shader-literature
source_logs:
  - "[[日志/2026-08-25-流体笔刷源参数与可见波纹幅度收敛QA|流体笔刷源参数与可见波纹幅度收敛 QA]]"
  - "[[日志/2026-08-24-流体AdvectionV2多步轨迹与交付QA|流体 Advection v2 多步轨迹与交付 QA]]"
  - "[[日志/2026-08-24-全屏绘画独立流体实例与资源完整性|全屏绘画独立流体实例与资源完整性]]"
supersedes: null
---

# Paper 与 Full Paint 共享 Reveal 噪声边界及 Shader 学术对照 QA

## 背景

本轮继续针对 Branch 独立复刻工程推进水彩 WebGL 底层还原，同时响应“可以使用学术资料辅助 Shader 编写”的目标。学术资料用于约束模拟稳定性、纸面材质和职责分层的推理，不取代根目录主工程、原始提取和真实浏览器证据；截图中的现象也不视为源码指令。

## 源码证据与修改

- 原始提取定义 `Dg = 1000`、`Bg = 1002`，其中 `noise/greyscale-fractal` 使用 `RepeatWrapping`，`noise/rgb-generated` 使用 `MirroredRepeatWrapping`。
- 原始 Paper 材质的 `uNoiseFinalTexture` 与原始 Full Paint 的 `uNoiseTexture` 都消费 `noise/rgb-generated`，并都将其设置为 `1002` 镜像重复。
- Branch 原先在 `WatercolorView` 中把该共享纹理设为 `RepeatWrapping`，`FullPaintManager` 初始化时又会再次写入 `RepeatWrapping`，导致 Paper 的设置会被后续消费者覆盖。此契约会改变 reveal 噪声在纹理边界处的连续性。
- `WatercolorView.ts` 与 `FullPaintManager.ts` 现在都明确将共享 `noise/rgb-generated` 设置为 `THREE.MirroredRepeatWrapping`；`qa-experience.mjs` 同时采集 base/final 两组材质纹理 wrap，防止共享资源再次被不同消费者覆盖。
- 本轮没有改动上一轮已收敛的 Paper 流体速度、椭圆笔刷、simulation UV 或 `DELIVERY_SIMULATION_VISUAL_GAIN`；因此这是纹理边界契约修正，不是重新放大波纹。

## 固定中间态证据

同一 Chrome 9333 页面在 `seed=47&freeze=6`、首纸 reveal `1.5s` 中间态分别留存：

- 修改前：`app/.artifacts/qa/source-visual-evidence-2026-08-25/paper-noise-wrap-before.png`，`noiseFinalWrap=[1000,1000]`。
- 修改后：`app/.artifacts/qa/source-visual-evidence-2026-08-25/paper-noise-wrap-after.png`，`noiseFinalWrap=[1002,1002]`。

两张图宏观形态接近符合“边界采样契约修正”的预期，没有观察到上一轮已经压低的整树高频波纹回归；后续仍需固定主工程/Branch 中间态继续做截图和像素差分，不能把该项修正宣称为像素级正版一致。

## 学术 Shader 对照

- [Curtis 等人的《Computer-Generated Watercolor》](https://grail.cs.washington.edu/wp-content/uploads/2015/08/curtis-1997-cgw.pdf) 将水彩拆成浅水流体、纸张/颜料相关过程和多层透明 glaze，并讨论边缘沉积、granulation、backrun、separation 与 glazing。对 Branch 的直接启发是：simulation buffer、Paper 显示材质和交付层可见增益应保持职责分离，便于控制而不把诊断噪声直接变成整屏纹理。
- [Stam 的《Stable Fluids》](https://graphics.stanford.edu/courses/cs448-01-spring/papers/stam.pdf) 说明半拉格朗日输运的稳定性与耗散是实时流体实现的基础。对当前 Branch 的约束是：不能为了“更有水彩感”任意叠加额外速度补偿、正反馈或高频显示增益；任何变化仍须由主工程/原始提取和浏览器中间态证据支持。
- 纹理输运和边界条件的相关研究支持“边界条件会改变连续性”的一般判断，但本轮只采用已经被原始提取直接确认的 `MirroredRepeatWrapping`，没有根据论文自行添加新的物理项或替换源码 shader 结构。

## QA

- `npx tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `npm run verify`：73/73 素材与完整性检查通过。
- `npm run qa`：五个视口、source reveal、fluid shader gate、Paper/Full Paint、音频/诗句、reduced-motion、资源失败、context-loss fallback 均通过；`passed=true`、`sourceRevealProfilePassed=true`、`consoleErrors=[]`、`remoteResources=[]`。
- QA 结束后对同一现有 Chrome 页面完整 reload，最终为 `phase=exploring`、`assetProgress=100`、`assetsReady=true`、`error=null`、`muted=true`；没有创建重复页面。

## 边界与提交

本轮只修正 Branch 内 Paper 与 Full Paint 共享 reveal 噪声的源码边界契约，并将学术资料纳入后续 Shader 推理依据；没有修改根目录主线、没有写入根目录 `wiki_memory`、没有暂存用户未跟踪的 `Start.cmd`，也没有推送远程仓库。下一轮继续做固定中间态的主工程/Branch 视觉差分，并优先检查 Paper 材质职责、Ground/阴影和 Full Paint 的源级连续性。
