---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: cutout-shadow-layer-reconstruction
source_logs:
  - "[[日志/2026-08-24-背景合成与阴影职责对齐|背景合成与阴影职责对齐]]"
  - "[[日志/2026-08-24-FullPaint双层视频回退与兼容性QA|Full Paint 双层视频回退与兼容性 QA]]"
supersedes: null
---

# Cutouts 独立 SDF 阴影层重建与浏览器 QA

## 背景

本轮继续只在 `module-replication/Dew-StanzaVerse` Branch 内推进。源码审计修正了一个容易混淆的职责判断：原始 bundle 中消费 `uShadowMap` 的 shader 并不是 Paper 材质本体，而是独立的 `Cutouts` pass。其输入来自 24 个 `hasHole` 纸片，输出是纸片孔洞下方的 SDF cutout 阴影；`ShadowProjection` 负责写入屏幕空间阴影纹理，Paper、Ground 和 Cutouts 是不同消费者。

## 源码证据

- 原始提取 `sources/original-extraction/study/app.beautified.js` 的 `Cutouts` 类使用 `uShadowMap`、`uSdfTexture`、`uDepth`、`uShadowSize`、`uCutoutShadowIntensity`、`uPaperShadowIntensity` 和 `uFogState`。
- 源码配置为 `uDepth: 0.03`、`uShadowSize: 0.5`、`uCutoutShadowIntensity: 0.4`、`uPaperShadowIntensity: 1.7`、`uNoise: 0.005`，并用 `PlaneGeometry(1, 1, 1, 1)`、`computeTangents()`、`computeVertexNormals()`、`translate(0, -0.5, 0)` 构造独立平面。
- 每个实例矩阵取纸片容器位置并向上偏移 `0.012`，缩放为 `(meshSize.z, meshSize.y, 1)`，旋转为 `(-PI/2, 0, PI/2 + container.rotation.y)`，renderOrder 为 `-1`。
- Fragment 先根据切线空间 view direction 和 `uDepth` 偏移 SDF UV，再把 SDF 阴影与屏幕 `uShadowMap` 阴影分别按强度混合，最后乘以 alpha 和 fog。`uVisible` 只让 `hasHole` 纸片参与显示。

## Branch 实现

- 新增 `app/src/shaders/cutoutShadow.ts`，恢复源码 Cutouts 的切线空间、SDF atlas 解码、随机噪声、cutout/map 双阴影混合、sRGB 与 fog 路径。
- 新增 `app/src/experience/world/CutoutShadowLayer.ts`，把 24 个带孔纸片变为 InstancedBufferGeometry；SDF atlas remap、scale、origin/plane size 和动态 alpha 都通过实例属性传入，避免把真实结构退化为单张静态贴图。
- `WatercolorView` 在 `ShadowProjection` 初始化后建立 Cutouts producer/consumer 链：`ShadowProjection.texture → CutoutShadowLayer.uShadowMap`；reveal 时按源码的 0.4 秒 `sine.inOut` alpha 显现，hide/restart 时清零并同步 GPU attribute，resize 时使用 renderer drawing-buffer 分辨率。
- QA 脚本新增 shader/uniform/attribute/source-count 结构断言，并实际执行 alpha `0 → 中间态 → 1` 生命周期断言。

## 验证结果

- `npm exec -- tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `npm run verify`：通过，Vite 构建完成，73/73 本地素材完整性通过。
- `npm run qa -- http://127.0.0.1:3000/ .artifacts/qa/cutout-shadow-2026-08-25`：通过。
  - 桌面 1440×900、1920×1080、2560×1440；移动 390×844、430×932 共 5 个视口。
  - 每个视口均为 `cutoutShadowSources: 24`、mesh/attributes/shader/uniforms 全部成立。
  - alpha 中间态范围约 `0.504..0.942`，完成态均为 `1`。
  - `sourceRevealProfilePassed: true`、`consoleErrors: []`、`remoteResources: []`、总 `passed: true`。

报告：`app/.artifacts/qa/cutout-shadow-2026-08-25/report.json`。

## 尚未宣称完成的部分

这次证明了独立 Cutouts 层能够编译、绘制并参与真实生命周期，但还没有证明与原站同 seed 的像素级边界完全一致。原始 bundle 还存在独立的全局 Ground 类，Branch 当前仍采用“每纸 Ground + ShadowProjection 全屏合成”的推演拆分；下一轮应继续比较这两种 Ground/Background 组织在光照、阴影边界和 fog 深度上的差异，再决定是否继续收敛，而不是把 Branch 结构误称为源码架构。

