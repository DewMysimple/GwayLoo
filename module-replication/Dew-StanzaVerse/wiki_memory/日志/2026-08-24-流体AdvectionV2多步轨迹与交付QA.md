---
type: log
status: archived
kind: feature
importance: high
date: 2026-08-24
updated: 2026-08-24
topic: fluid-advection-v2-and-delivery-qa
related:
  - "[[当前状态/系统架构|系统架构]]"
  - "[[当前状态/当前待办|当前待办]]"
  - "[[当前状态/项目概览|项目概览]]"
  - "[[日志/2026-08-24-流体Stencil批处理与四帧活跃历史重建|流体 stencil 批处理与四帧活跃历史重建]]"
  - "[[日志/2026-08-24-流体椭圆笔触SDF对齐|流体椭圆笔触 SDF 对齐]]"
---

# 流体 Advection v2 多步轨迹与交付 QA

## 背景

本轮继续只修改 Branch `Dew-StanzaVerse`，不回写 `Verminoble` 主线。对照只读原始提取 `sources/original-extraction/study/app.beautified.js` 的流体 pass，确认 active advection 不是单次 backtrace：源码在 v1 结果之后又执行 v2 的 `spotNew → spotOld → spotNew2 → spotNew3 → spotOld2` 多步 backtrace/forward-trace 链，并把最后一次速度交给 deceleration 与 accumulation。Branch 此前只保留 v1 单步回溯，低速拖尾与湿度衰减因此存在结构差距。

## 本轮变更

- `app/src/shaders/fluid.ts` 恢复源码 active v2 轨迹链：初始速度乘 `noise2.r × 3` 回溯，二次采样乘 `noise2.r × 2` 前向校正，误差半步修正到 `spotNew3`，再由 `spotOld2` 取最终速度；每个 atlas 采样额外夹取当前 region，避免 Branch 的紧密图集布局跨纸片串色。
- `app/src/experience/world/WatercolorView.ts` 让 `fade` 纸片在进入时间线时立即写入 `rotationZ=0 / curve=1`，再执行源码 3 秒 alpha 淡入，保证首帧状态与 shader、射线、阴影共同读取的变换一致。
- `app/src/experience/world/ScrollCamera.ts` 移除初始化时静态的 `IS_MOBILE` 判断，改为运行时组合触控点数、粗指针和 viewport 宽度判断；CDP 改 viewport 后移动端视差仍能正确关闭。
- `app/scripts/qa-experience.mjs` 把断言对准源码 active 契约：检查 advection v2 字符串链、Full Paint 固定 1024×640 的 16:10 region、当前点椭圆显色与活跃窗口后的最终衰减；诗句 hide 在同一浏览器表达式内记录前值并验证 150ms 后下降；宽屏滚动按更高内容槽使用 0.30 下限，流体半精度噪声允许 0.01 中间样本容差。

## 验证

- 只读源码审计：原始 active advection v2 链位于 `app.beautified.js` 约 156803 行附近；原始 external-force active 路径仍是 ellipse v2，未把旧 capsule v1 重新启用。
- `npm exec -- tsc --noEmit`：通过。
- `node --check scripts/qa-experience.mjs`：通过。
- `npm run verify`：通过；Vite 54 modules，构建 JS 约 838.09 kB；`verify:integrity` 检查 73 个本地资源，`passed: true`、无 failures；保留既有单 bundle 大于 500 kB 的提示。
- `npm run qa`：真实 Chrome CDP 9333 五视口通过，报告 `passed: true`；desktop 1440/1920/2560 与 mobile 390/430 均完成 WebGL/FBO、Full Paint、Poem、音频、context loss、reduced-motion、资源失败、FAQ、Restart 检查。
- 真实报告关键结果：`consoleErrors=[]`、`remoteResources=[]`；advection v2、ellipse SDF、Stencil targets、`aStencilActive`、四帧 history 全为 true；Full Paint pigment 约 0.0479、清理后为 0；移动端 `touchParallaxDisabled=true`；诗句 hide `decreased=true`。
- `git diff --check`：通过；只出现既有 LF/CRLF 转换提示。

## 当前边界

- 本轮证明的是 shader 编译、FBO 像素读数和交互生命周期，尚未完成与原始站点截图的逐像素差分；尤其 Branch 当前普通纸片 reveal 仍是用户定制的 3/5/7 秒兼容轨道，原始提取为 10/7/15 秒的四点前沿契约，需下一轮用中间态画面证据决定是否继续收敛。
- `npm run qa` 生成的截图与 `report.json` 只留在 Branch `app/.artifacts/qa/`，未迁入只读 `evidence/` 或主线记忆。
