---
type: log
status: archived
kind: feature
importance: medium
updated: 2026-08-23
topic: wlop-nap-fluid-reveal
source_logs: []
supersedes: null
---

# WlopNap 独立流体 Reveal 实验页

## 目标

在 `module-replication/Mouse-driven Local Fluid Simulation/WlopNap/` 新建一个可独立运行的 npm 开发环境，使用 WLOP - Nap 的本地图片复刻 `Open the landscape` 的“鼠标驱动局部流体 → 水彩 reveal”交互。

## 确认的实现

- 采用独立 Vite + TypeScript + Three.js 页面，不修改主站 legacy 压缩 WebGL 文件。
- `FluidSimulation` 使用 ping-pong 半浮点 render target 保存局部速度、dye 和笔刷 footprint。
- `revealShader` 将原图先转换为冷灰版本，再以流体 dye、速度和程序化颗粒生成不规则 reveal mask，恢复原图颜色并施加轻微扭曲。
- 鼠标坐标由 canvas 局部坐标转换为 0–1 UV，鼠标离开后速度衰减而染料继续扩散/淡出。
- 用户提供的路径在本机实际对应 `Extracted_Wallpapers/.../Images/wallpaper_001.png`，素材复制为 `public/assets/wlop-nap.png`。

## 变更范围

- 新增 `module-replication/Mouse-driven Local Fluid Simulation/WlopNap/package.json`、`package-lock.json`、`tsconfig.json`、`index.html`、`README.md`。
- 新增 `src/fluidSimulation.ts`、`src/revealShader.ts`、`src/wlopNapExperience.ts`、`src/main.ts`、`src/style.css`。
- 新增本地实验素材 `public/assets/wlop-nap.png`。

## 验证

- `npm install`：通过。
- `npm run build`：通过，TypeScript 检查与 Vite 生产构建通过。
- `npm run dev -- --host 127.0.0.1`：已启动，地址为 `http://127.0.0.1:5173/`。
- 首页与 `/assets/wlop-nap.png`：本地 HTTP 请求均返回 200。

## 遗留项

- 当前是独立可读的 Three.js 实验实现，不直接复用主站压缩 bundle 中的 shader；后续若要与主站 R3F 运行时合并，需要另做视觉逐帧验收。
- 未在本轮修改主站 R3F 的 `VideoLandscape.tsx`，也未改变默认 legacy 运行时。

## 待确认长期记忆

- 暂无。该页作为本地素材实验保留，公开发布前仍需完成素材授权或替换审查。
