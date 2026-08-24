---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-24
topic: poem-textmesh-watercolor-background-reconstruction
source_logs:
  - "[[日志/2026-08-24-FullPaint视频资源失败边界|Full Paint 视频资源失败边界]]"
  - "[[日志/2026-08-24-Ground与渲染分辨率契约对齐|Ground 与渲染分辨率契约对齐]]"
supersedes: null
---

# Poem 视图 TextMesh 与水彩背景重建

## 目标

把支线当前“整屏 `poem/text.png` 贴图”的 Poem 实现推进到原始工程的组件边界，继续提高诗句转场的 WebGL 底层还原和页面交付一致性。

## 原始证据

- 原始 `Poem` view（`app.beautified.js` 约 170,857 行）在 UI 正交相机下创建 `TextMesh` 与 `Background` 两个组件。
- 原始 `TextMesh`（约 169,242 行）消费 `ExperienceManager.textCanvas`，使用 `.xp-fulltext` 的 DOM rect 定位 mesh；其 shader 使用 `uTileRatio`、`uTextRatio`、`uQuadRatio`、`uSharpUvs`、`uLowBlurUvs`、`uHighBlurUvs`，并保持 `uFadeNoiseSize=0.07`、`uCursorFactor=0`。
- 原始 Poem 转场使用 `writeFadeIn()` 的 `uWriteProgress: 0.7→0`，背景 `fadeIn` 为 4 秒，`customFadeOut()` 为 `uFadeProgress: 0→0.97`，背景 `fadeOut` 为 3.5 秒。
- 原始 Poem Background 使用独立 Full Screen simulation instance、watercolor paper texture 与 `uSimulationAlpha`，不是静态诗歌纹理铺底。

## 本轮修改

- `app/src/experience/world/PoemView.ts`
  - 构造函数接收共享 `TextCanvas` 与 `FluidSimulation`。
  - 使用 UI 中心原点正交相机、独立 simulation background mesh 和 source TextMesh mesh。
  - Poem 背景实时绑定第 27 个 Full Paint simulation region，并按源码时长执行显现/收拢。
  - 文字 mesh 按 `.xp-fulltext` 当前 DOM rect 重新定位，使用共享 Canvas 的三瓦片 UV；进入时刷新 rect，避免在页面滚动后沿用启动时坐标。
  - hide 阶段保持 `isVisible` 到 GSAP timeline 完成，避免背景/文字淡出被 WebGL 渲染循环提前裁掉；Restart 增加 Poem reset。
- `app/src/experience/world/TextCanvas.ts`
  - 暴露 `canvasPixelHeight`、`uvBoxes`、`pixelBoxes` 与 `fetchImageDataAtUv`，建立原始 TextMesh 所需的 Canvas 几何契约。
- `app/src/shaders/poem.ts`
  - 移除运行时不再使用的静态 poem texture shader。
  - 增加 TextMesh 三瓦片采样 shader，以及 Full Screen simulation + paper 背景 shader。
- `app/src/experience/WebGLApp.ts`、`app/src/experience/ExperienceManager.ts`
  - 每帧更新 Poem 的滚动窗口和 simulation texture；初始化、Restart 接入共享依赖。
- `app/src/config/assets.ts`
  - 不再把运行时已移除的 `poem/text.png` 当作 WebGL 启动必需资源，避免无用静态图缺失阻断可交付页面。
- `app/scripts/qa-experience.mjs`
  - 增加五视口 Poem opening、mid-hide、closed 状态检查，覆盖 phase、Back、simulation/Canvas 绑定、源码 UV shader 契约和淡出生命周期。

## 验证

- `npm run verify`：通过；53 个模块构建成功，`assetCount=73`、`failures=[]`。
- `npm exec -- tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `git diff --check`：通过；仅有 Git 的 LF/CRLF 提示。
- `npm run qa` / `npm run smoke`：当前环境 `127.0.0.1:9333` 没有 CDP 页面目标，未取得真实 WebGL shader 编译、诗句像素、移动端布局或转场截图证据。

## 待确认长期记忆

- Poem 当前已具备原始组件职责和时间线的代码级对齐，但 `TextCanvas` 的文本数据仍来自 Branch 当前 DOM 提取，不等于原始 bundle 内嵌的完整 `hK` 文本绘制数据；需要后续结合截图确认是否补齐隐藏段落和换行。

## 下一步

CDP 恢复后优先验证 1440×900、390×844、430×932 的 Poem 开启/中途关闭/完成关闭帧；随后补齐原始 TextCanvas 完整文本数据与换行，再回到纸片 reveal、流体中间态和 Full Paint 视频边缘的像素回归。
