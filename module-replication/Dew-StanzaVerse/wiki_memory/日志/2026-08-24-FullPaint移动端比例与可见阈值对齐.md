---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-24
topic: fullpaint-responsive-visibility-contract
source_logs:
  - "[[日志/2026-08-24-流体实例活跃生命周期对齐|流体实例活跃生命周期对齐]]"
  - "[[日志/2026-08-24-全屏绘画独立流体实例与资源完整性|全屏绘画独立流体实例与资源完整性]]"
supersedes: null
---

# Full Paint 移动端比例与可见阈值对齐

## 目标

继续修正 Full Paint 的响应式底层契约，保证第 27 个流体 tile、全屏视频 cover 和普通纸片 active 生命周期在桌面、横屏移动端与竖屏移动端使用同一屏幕比例语义。

## 源码证据

- 原始 `BatchInkSimulation._createInstances()` 按 viewport ratio 创建 Full Screen instance：横屏固定宽度 1024、竖屏固定高度 512，另一轴按比例计算；Branch 此前在移动端固定宽度 512，竖屏会把 tile 高度错误放大。
- 原始 Full Paint manager 的 `isVisible` 是 `visibleProgress > 0.8`，不是进入调用时立即为 true；隐藏过程中 progress 未降到阈值前，普通实例仍应视 Full Paint 为占用态。
- 原始 `30_fragmentShader.glsl` 直接输出 `inkColor`，没有纸片/地面 pass 使用的显式 `LinearTosRGB`；Branch 之前额外乘了 `uAlpha` 并转换颜色，偏离该 pass 的源码输出契约。

## 本轮修改

- `app/src/experience/world/WatercolorView.ts`：按原始横竖屏规则计算 Full Screen tile 的宽高，竖屏保持高度 512，横屏保持宽度 1024。
- `app/src/experience/paint/FullPaintManager.ts`：`isVisible` 改为由 `uVisibleProgress > 0.8` 派生，退出 reveal 未穿过阈值前继续阻止普通纸片 active。
- `app/src/shaders/fullpaint.ts`：恢复源码 `gl_FragColor = inkColor` 的输出语义，移除该 pass 的额外 alpha 乘法与 sRGB 转换。
- `app/scripts/qa-experience.mjs`：增加 Full Paint region/viewport 比例、可见阈值和 fragment 输出语义断言。

## 验证

- `npm exec -- tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `git diff --check`：通过；仅有 Git 的 LF/CRLF 提示。
- `npm run verify`：通过；53 模块构建成功，`assetCount=73`、`failures=[]`。
- 当前 `127.0.0.1:9333` 没有 CDP 页面目标；移动端 tile 像素比例、Full Paint 进入/退出阈值和视频边缘实际合成仍未取得截图证据。

## 下一步

CDP 恢复后，优先在 390×844、430×932 与 1440×900 采样 Full Paint region 宽高、`visibleProgress` 穿越 0.8 的前后帧、退出期间普通纸片 accumulation 是否停止，以及视频 cover 边缘是否没有竖屏裁切漂移。
