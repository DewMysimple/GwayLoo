---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-24
topic: full-paint-reveal-and-lifecycle-alignment
source_logs:
  - "[[日志/2026-08-24-纸片世界朝向与Fade显现对齐|纸片世界朝向与 Fade 显现对齐]]"
  - "[[日志/2026-08-21-图层时间与边缘追赶|图层时间与边缘追赶]]"
supersedes: null
---

# Full Paint 显现与生命周期对齐

## 目标

继续对照原始 `M5` FullPaint 实现，修复全屏水彩在显现 alpha、展开缩放、退出合成和窗口变化方面的结构性差距。

## 源码证据

- 原始材质的 `uScale` 初始值为 `1.4`，`show()` 以 3 秒轨道收敛到 `1`；`uVisibleProgress` 从当前值推进到 `3.8`，时间线 `timeScale` 为 2。
- 原始 fragment shader 将 `computeInkReveal()` 返回的 `globalIntensity` 作为最终 alpha；`uAlpha` 保持 1，并不替换 reveal mask。
- 原始 `hide()` 同时回收 visible progress 和 scale，完成回调后才隐藏 mesh；因此退出期间全屏纸片仍参与合成。
- 原始 resize 路径会重新生成全屏 reveal 点，避免从横屏切换到竖屏后显现轨迹仍使用旧比例。

## 本轮修改

- `app/src/experience/paint/FullPaintManager.ts`：增加 `uScale`、show/hide timeline、`isRendering` 和 resize reveal 点更新；视频纹理在 hide timeline 完成后释放，重新进入时清理上一次纹理。
- `app/src/shaders/fullpaint.ts`：顶点位置乘 `uScale`；fragment 使用 reveal global intensity alpha，并保留当前 renderer 的线性到 sRGB 转换。
- `app/src/experience/WebGLApp.ts`：Full Paint 在退出 timeline 结束前仍被渲染。
- `app/scripts/qa-experience.mjs`：增加 Full Paint rendering、alpha、scale 和 reveal progress 的运行时断言。

## 验证

- `npx tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `npm run build`：通过；Vite 生产构建成功。
- 上一轮已验证 `npm run verify` 的 73/73 素材完整性；本轮代码只改变渲染实现，需在最终收口时再次执行完整 verify。
- `git diff --check`：通过；仅有工作副本 LF/CRLF 提示。
- 浏览器 CDP 当前仍未提供，本轮没有宣称全屏水彩截图、视频层和退出过渡已经完成视觉验收。

## 下一步

CDP 恢复后，执行 `npm run qa`，重点观察 `60-full-paint.png` 的 reveal alpha、1.4→1 缩放边缘、长按进入、Back 退出、快速再次进入和横竖屏 resize；同时确认 Full Paint 的独立第 27 个模拟区域不污染 26 张纸片。
