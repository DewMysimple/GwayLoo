---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-24
topic: full-paint-video-fallback-and-compatibility-qa
source_logs:
  - "[[日志/2026-08-24-源码Reveal中间态视觉证据与原站基线限制|源码 Reveal 中间态视觉证据与原站基线限制]]"
supersedes: null
---

# Full Paint 双层视频回退与兼容性 QA

## 背景

Branch 继续以原始提取源码为契约推进，不把支线复刻误写成主项目最终架构。本轮核对 `FullPaintManager`、Full Paint shader、独立第 27 个 simulation tile、Ground 和 ShadowProjection；源码的 Full Paint 允许第二层视频纹理缺省并回退到第一层，Branch 原实现却把 base/over 任一视频错误都当成整幅绘画失败。

## 修改

- `FullPaintManager` 现在仅在 base 视频失败时退出 Full Paint 并进入文字 fallback。
- over 视频失败时释放坏的 `VideoTexture`，把 `uPaintTexture2` 指回 base texture，保留 `isRendering`、sceneIndex、流体交互和 Back 生命周期。
- 增加 `videoFallback` 调试状态，便于浏览器 QA 区分“可继续渲染的 over 降级”和“必须退出的 base 失败”。
- `qa-experience.mjs` 增加 over 失败与 base 失败的双路径验证；Full Paint 早期 `uVisibleProgress <= 0.8` 的 `isVisible=false` 视为源码阈值行为，不误报为渲染中断。
- Grass 生命周期探针从 1.1 秒延长为 1.6 秒，消除真实 CDP 帧调度下的偶发采样抖动；没有改变草层运行时参数。

## 证据

最终真实 Chrome 五视口 QA 输出到 `app/.artifacts/qa/fullpaint-fallback-2026-08-24-final2/`：

- `passed: true`、`sourceRevealProfilePassed: true`。
- 视口为 1440×900、1920×1080、2560×1440、390×844、430×932。
- `consoleErrors: []`、`remoteResources: []`。
- 每个视口都确认 `fullPaintSoftFailure.rendering=true`、`fallback.from=over`、`fallback.to=base`；base 失败仍确认 `rendering=false`、文字提示可见且回到 scroll。
- 同一报告继续确认 27 个 simulation region、Full Paint index 26、Ground 0.4 秒 reveal、24 个 shadow source、DPR/绘制分辨率契约、Poem、Restart、reduced-motion 和 context-loss fallback。

静态验证：`npm run verify` 通过，Vite 54 modules，73/73 本地素材与原始镜像一致；`npm exec -- tsc --noEmit`、`node --check scripts/qa-experience.mjs`、`git diff --check` 通过。当前仍只修改 Branch，不写入主线根目录，也没有恢复或生成 `网页(1)`。

## 后续

继续以本地原始提取和 Branch 自有截图做视觉收敛，下一批重点仍是 Ground 边缘/阴影投影的中间态像素差异，以及 Full Paint 进入、退出期间视频裁切和流体扰动的同 seed 差分；远程原站试读仍受 `hCaptcha is not defined` 限制，不能作为可靠像素基线。

