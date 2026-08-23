# WLOP — Nap / Mouse-driven Local Fluid Simulation

这是一个独立的 Vite + TypeScript + Three.js 实验页。交互链按原工程 `Open the landscape` 的 `M5 full-paint` 材质与单个全屏 `BatchInkSimulation` 实例复写。

```text
pointermove
  → external force
  → advection（rgb-fractal noise）
  → divergence
  → pressure（源码默认 1 次）
  → gradient subtract
  → accumulation（RG 方向、B 速度、A 强度）
  → mix(paintTexture, paintTexture2, smoothstep(0, .1, B))
  → computeInkReveal（rgb-generated noise）
```

原工程为每个场景提供作者预制的 `base/*.mp4` 与 `over/*.mp4` 两份视频。WLOP 只有一张图片，因此加载时只额外生成一份中性白灰 base；原图作为另一纹理，不经过 LUT、色相调整或纸张乘色。按照源码静止区 `B = 1`、流动区向 `B = 0` 变化的方向，白灰纹理放在第二槽，原图放在第一槽。

## 启动

在本目录执行：

```text
npm install
npm run dev
```

然后打开 Vite 输出的本地地址。生产构建使用 `npm run build`。

## 关键文件

- `src/fluidSimulation.ts`：源码六 pass 的单全屏适配，保留原始数值与顺序。
- `src/revealShader.ts`：源码 cover UV、双纹理混合和 `computeInkReveal`。
- `src/whiteGrayBaseTexture.ts`：补足原工程第二份预制素材的白灰 base 生成器；不参与原图显色。
- `src/wlopNapExperience.ts`：Three.js 生命周期、输入映射与资源释放。
- `public/assets/wlop-nap.png`：复制进来的 3840×2160 原图。
- `public/assets/fluid-noise.png`：源码 `noise/rgb-fractal`，用于 advection。
- `public/assets/watercolor-noise.png`：源码 `noise/rgb-generated`，用于开场墨迹遮罩。

## 源码原值

`mouseForce = 50`、`cursorSize = 400`、`deceleration = .98`、`attenuation = .96`、`dt = .008`、`pressure.iterations = 1`。最终双纹理公式保持源码的 `smoothstep(0., .1, vel)` 与中性 ±5% 明度变化。
