# Verminoble

Verminoble 是一个使用 Vite、React、TypeScript 与 React Three Fiber 构建的沉浸式水彩体验。新运行时保留双阶段加载、滚动、诗句、六组景观、声音、FAQ、Restart 和连续页面尾部等行为契约，同时允许视觉进入独立的 Verminoble 设计系统。

订阅、赠送、邮箱、Facebook、X 和奖项文字按项目约定保留为静态展示，不导航、不打开新窗口。项目不包含 WordPress、账户、商城、支付、订阅后端、CMS 或路由。

## 当前迁移状态

工程处于 R3F 默认、legacy 短期可回退阶段：

- 默认及 `?runtime=r3f`：可维护的 React Three Fiber 运行时。
- `?runtime=legacy`：显式选择旧压缩运行时，仅用于短期对照与回退。

R3F 版已经具备统一状态机、双加载器、原生连续滚动、三组诗句、六场景全屏视频、返回、声音、Restart、Benefits、五项 FAQ 和最终收尾；GLB 相机动画、纹理图集、KTX2、LUT、视频与音频均进入强类型资源定义和加载链。

R3F 水彩材质已实际使用 atlas、mask、SDF、纸张、噪声、地面 KTX2 和 LUT，并按性能档位降级。新运行时只从 `/assets/` 读取资源，不加载旧主题 CSS、WordPress 路径或旧脚本。旧 `app.js`、兼容 DOM 和 `/wp-content/` 仍为显式 legacy 回退保留，完成一轮人工视觉验收后进入最终清除阶段。

只读事实基准位于 `C:\Users\Administrator\Desktop\网页(1)`。测试可以读取和启动它，但不得修改其中任何文件。

## 开发

要求 Node.js 20.19+，使用 npm：

```bash
npm install
npm run dev
```

Vite 通常提供 `http://localhost:5173`。直接访问该地址使用 R3F；`?runtime=legacy` 仅用于迁移对照。

质量命令：

```bash
npm run lint
npm run typecheck
npm run test
npm run check:architecture
npm run check:assets
npm run build
npm run preview
npm run test:e2e
```

`test:e2e` 使用 Playwright 在桌面、移动和低性能视口检查 legacy 回退几何，以及默认 R3F 的双加载阶段、连续滚动、六景观、FAQ、Restart、网络边界和控制台错误。

## 目录与边界

```text
src/
├── app/                              # React 入口与受控第一加载器
├── content/                          # ExperienceDefinition、诗句、尾部、场景与资源清单
├── features/experience/
│   ├── runtime/                      # 统一运行时契约、reducer、输入、音频与性能分级
│   ├── r3f/                          # R3F 世界、源资源管线与全屏视频景观
│   ├── LegacyRuntimeBridge.tsx       # 旧引擎唯一入口
│   └── OriginalExperienceTail.tsx    # 数据驱动的原版尾部结构
├── styles/                           # 全局约束与主题令牌
└── test/                             # Vitest 环境

tests/e2e/                            # Playwright 双视口回归
public/assets/                        # 新运行时唯一正式资源根目录
public/wp-content/themes/davidwhyte/  # 短期 legacy 回退运行时与兼容资源
scene_workbench/                      # 本地三维资产镜像与 Blender 二创工作区
wiki_memory/                          # ADR、当前状态、知识和任务日志
```

`ExperienceDefinition` 是新运行时的配置入口；`experienceAssets` 和 `sceneManifest` 是 R3F 资源的唯一来源。`npm run check:architecture` 会阻止新代码重新引用 `/wp-content/`、legacy 全局变量或旧 HTML 注入。

## 内容与素材替换

- 诗句和控制文字：`src/content/experience.ts`
- 模型、纹理、字体、音频和基础资源：`src/content/assets.ts`
- 六场景标题与视频：`src/content/scenes.ts`
- 相机、诗句和场景时间线：`src/content/timeline.ts`
- Benefits、FAQ、静态订阅与收尾：`src/content/tail.ts`
- 原版纹理图集切片与图层时序：`src/content/atlas.ts`

当前阶段的目标是技术等价迁移，不是视觉二次创作。替换素材前先建立独立创作分支，并保留 `desktop/mobile`、`base/over`、`1-6` 兼容关系。每次资源变化后至少运行 `npm run check:assets`、`npm run test:e2e` 和 `npm run build`。

## 基线、Git 与版权

完整静态复刻保存在本地标签 `baseline/static-replica-2026-08-22`：

```bash
git show baseline/static-replica-2026-08-22
```

运行开发或测试不会自动提交，也不会自动推送远程。只有明确执行 `git commit` 和 `git push` 才会更新仓库。

原始媒体、字体、模型、音频和文本仅限本地实验与技术参考。公开发布前必须完成品牌替换、素材授权或替换、外链审查和版权清理。

## 三维场景工作区

[`scene_workbench/`](./scene_workbench/) 是与正式网页隔离的本地美术工作区，保存三维体验资产副本、场景清单、重建脚本和 Blender 5.0 主文件。Vite、`src/` 和 `public/` 不引用该目录；原素材副本、生成缓存与 `.blend` 按本地实验策略不进入 Git。

使用和重建说明见 [`scene_workbench/README.md`](./scene_workbench/README.md)。

## 工程记忆

工程记忆集中在 [`wiki_memory/`](./wiki_memory/)，不散落到项目根目录：

```bash
python wiki_memory/工具/memory_lint.py index
python wiki_memory/工具/memory_lint.py check
```
