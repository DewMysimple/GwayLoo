# Verminoble

Verminoble 是一个以 React 管理的沉浸式创作体验站。当前兼容版保留六组本地水彩场景、场景内的 “Open the landscape” 全屏体验，以及原版沉浸区之后的 Benefits、FAQ 和体验收尾，用于忠实回归、替换素材与逐步二次创作。

Benefits、FAQ、订阅按钮和相关英文仅作为原版静态体验内容保留；其中订阅、赠送、邮箱、社交分享与奖项文字均不执行页面跳转。项目没有对应的账户、商城、支付、订阅后端或 WordPress 服务。

## 开发

要求：Node.js 20.19+。本项目使用 npm。

```bash
npm install
npm run dev
```

Vite 会显示本地访问地址，通常是 `http://localhost:5173`。

常用命令：

```bash
npm run lint          # 代码规范检查
npm run typecheck     # TypeScript 类型检查
npm run test          # 组件测试
npm run check:assets  # 检查六组视频与音频资源
npm run build         # 生产构建
npm run preview       # 预览生产构建
```

## 架构

```text
src/
├── app/                         # 应用入口
├── content/                     # 可编辑文案与场景资源清单
├── features/experience/         # 沉浸体验与旧运行时桥接
├── styles/                      # 主题令牌与全局样式
└── test/                        # 测试初始化

public/wp-content/themes/davidwhyte/
├── app.js                       # 临时兼容的压缩 WebGL 运行时
├── style.css、loader.css         # 体验样式兼容层
└── resources/assets/            # 模型、纹理、字体、视频与音频
```

`LegacyRuntimeBridge` 是唯一接触旧运行时的 React 模块。它渲染 Canvas、视频、音频、加载器和必要的兼容节点；`OriginalExperienceTail` 用 React 保留原版体验尾部的 DOM 契约。项目运行不依赖 WordPress 服务。

旧运行时仍硬编码使用 `/wp-content/themes/davidwhyte/resources/assets/` 路径，因此这些文件暂时保留在 Vite 的 `public` 目录中。这是静态兼容路径，不代表项目继续使用 WordPress。

## 内容与素材替换

- 中文加载、按钮和三段文字：编辑 `src/content/experience.ts`。
- 六组场景视频映射：编辑 `src/content/scenes.ts`。
- 当前运行时尚未读取场景清单来加载视频，因此替换媒体时仍须保持原有 `desktop/mobile`、`base/over`、`1-6` 文件结构和名称。
- 每次替换资源后运行 `npm run check:assets`，并在桌面和移动端实际体验场景切换。
- 当 WebGL 引擎被重写为可维护模块后，`sceneManifest` 将成为运行时唯一的场景资源来源。

## 兼容层的当前边界

当前压缩的 `app.js` 负责 Canvas、WebGL、视频纹理、音频和 “Open the landscape” 全屏状态。它没有可维护的源模块，因此本阶段不直接编辑它。

画布内由该运行时绘制的英文景观标题、“Open the landscape” 及现有可见控件暂按只读源码保留。后续重写引擎后，画布内文案和资源映射会一并配置化；未经明确授权，不改变当前原版 UI 与交互。

## 基线与版权

迁移前的完整静态快照已在本地 Git 标签 `baseline/static-replica-2026-08-22` 中归档。可通过以下命令查看：

```bash
git show baseline/static-replica-2026-08-22
```

当前素材、字体、模型、音频和原站文本仅可用于本地实验与技术参考。任何公开发布前，都必须完成品牌替换、素材授权或替换、外链审查和版权清理。

## 工程记忆

项目记忆不与源码混放，统一位于 [`工程记忆/`](./工程记忆/)。开始新任务前请先阅读 [`工程记忆/AGENTS.md`](./工程记忆/AGENTS.md)。

```bash
python 工程记忆/工具/memory_lint.py check
python 工程记忆/工具/memory_lint.py index
```
