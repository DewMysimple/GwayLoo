---
type: log
status: archived
kind: bug
importance: high
updated: 2026-08-24
topic: fullpaint-video-resource-failure-boundary
source_logs:
  - "[[日志/2026-08-24-FullPaint移动端比例与可见阈值对齐|Full Paint 移动端比例与可见阈值对齐]]"
  - "[[日志/2026-08-24-全屏绘画生命周期与尾部交付降级|全屏绘画生命周期与尾部交付降级]]"
supersedes: null
---

# Full Paint 视频资源失败边界

## 目标

继续提高 Branch 当前可交付页面的兼容性：当 Full Paint 的 base/over 视频纹理在本地缺失、格式不支持或加载失败时，不能让全屏绘画停留在不可解释的半透明/黑层，也不能阻断页面其余文字内容。

## 源码与当前差距

- 原始 Full Paint 使用页面内隐藏视频元素，按 `loadedmetadata` 更新画面比例，再交给 `VideoTexture` 合成。
- Branch 此前按场景懒创建视频元素，但只设置 `src`、调用 `play()`，没有显式重新 `load()`，也没有媒体 `error` 边界；资源失败时 `_rendering` 可能继续保持 true。
- 这属于页面交付边界，不改变 29/30 号 Full Paint shader 的源码输出契约，也不替代后续真实视频帧像素回归。

## 本轮修改

- `app/src/experience/paint/FullPaintManager.ts`
  - 视频创建时注册 base/over 的错误监听并显式调用 `load()`；进入场景时重新触发加载。
  - `loadedmetadata` 回调改为捕获局部 video 引用，避免视频退出后回调访问已清空的 manager 引用。
  - 任一当前场景视频失败时，停止 show/hide timeline、停止 Full Paint 合成、释放 `VideoTexture`、恢复主音频主题，并发出 `HIDE` 与 `ERROR` 事件。
  - 暴露 `videoFailure` 状态，保留失败场景、层级和资源地址，便于 QA 与诊断。
- `app/src/experience/ExperienceManager.ts`
  - 接收 Full Paint 资源错误，在不隐藏整个体验区的前提下显示可读状态提示；正常进入/退出时清除提示。
- `app/index.html`、`app/src/style.css`
  - 增加 `role=status`、`aria-live=polite` 的资源失败提示层，继续保留下方文字体验和 Restart。
- `app/scripts/qa-experience.mjs`
  - 在正常 Full Paint 生命周期之后模拟 `base/3` 的媒体 error，断言 manager 已停止渲染、phase 已回到 `scroll`、提示可见且有文字。

## 验证

- `npm run build`：通过；53 个模块构建成功，仍有既存的单 bundle 超过 500kB 提示。
- `npm run verify`：通过；`verify:integrity` 检查 73 个资源，`failures=[]`。
- `npm run smoke`：未通过，当前环境没有 CDP 页面目标（`找不到 CDP 页面目标`）。
- `npm run qa`：未通过，当前 `127.0.0.1:9333` 拒绝连接；因此本轮错误事件断言已写入 QA，但尚未取得浏览器运行时截图或真实网络失败证据。

## 下一步

CDP 恢复后，在桌面和移动端分别验证真实 base/over 404、视频格式不支持和播放拒绝三类路径；随后优先继续修正 `PoemView` 当前预渲染 `poem/text.png` 与原始 `TextMesh + TextCanvas + Background` 架构之间的差距。
