# GwayLoo

[English](./README.en.md) · 简体中文

GwayLoo 是一个以 React、TypeScript 和 React Three Fiber 构建的沉浸式水彩体验项目。它将连续滚动、诗句、水彩图层、六组景观视频、声音和页面尾部组织成一个可逐步维护与二次创作的网页体验。

[查看 GitHub 仓库](https://github.com/DewMysimple/GwayLoo)

> 当前状态：项目仍在开发中。默认运行时是 legacy 兼容引擎，R3F 运行时通过查询参数预览；两者正在进行视觉和交互回归。

## 项目概览

当前网页包含：

- 连续滚动的沉浸式体验入口；
- 诗句、水彩图层、纸张和地面视觉元素；
- 六组桌面/移动景观视频及 base/over 图层混合；
- 用户手势触发的声音控制；
- 返回、Restart、Benefits、FAQ 和体验收尾内容；
- 可切换的 legacy 与 React Three Fiber 双运行时。

项目不提供账户、商城、支付、订阅后端、CMS、WordPress 服务或独立路由。页面中的订阅、赠送、邮箱和奖项文字属于体验内容的静态展示。

## 当前运行时

| 模式 | 访问方式 | 用途 |
| --- | --- | --- |
| legacy | `http://localhost:5173/` | 默认兼容基线与当前主要体验 |
| legacy（显式） | `http://localhost:5173/?runtime=legacy` | 明确选择兼容运行时 |
| R3F | `http://localhost:5173/?runtime=r3f` | 预览模块化 React Three Fiber 运行时 |

R3F 已具备统一状态、加载器、视频景观、声音、滚动和页面收尾能力，但水彩着色、纸张噪声、SDF 遮罩、地面图层和后处理仍未达到原体验的逐帧视觉等价。因此 legacy 在迁移完成前继续作为默认入口和回退方案。

## 快速开始

要求 Node.js 20.19 或更高版本，并使用 npm：

```bash
npm install
npm run dev
```

开发服务器通常运行在 `http://localhost:5173`。构建并预览生产产物：

```bash
npm run build
npm run preview
```

## 验证命令

```bash
npm run lint
npm run typecheck
npm run test
npm run check:assets
npm run build
npm run test:e2e
```

Playwright 默认只验证当前仓库。维护者如果拥有私有参考基准，可以设置 `GWAYLOO_REFERENCE_ROOT`，恢复可选的参考站点几何对照；普通 GitHub 克隆不需要任何本机目录。

## 项目结构

```text
src/
├── app/                              # React 应用入口与加载器
├── content/                          # 文案、场景、资源与体验配置
├── features/experience/
│   ├── runtime/                      # 运行时契约、状态、输入、音频与性能
│   ├── r3f/                          # React Three Fiber 场景与资源管线
│   ├── LegacyRuntimeBridge.tsx       # legacy 引擎的唯一 React 入口
│   └── OriginalExperienceTail.tsx    # 页面尾部内容
├── styles/                           # 全局样式与主题令牌
└── test/                             # Vitest 测试环境

tests/e2e/                            # Playwright 桌面/移动端回归
public/wp-content/themes/davidwhyte/  # 迁移期保留的兼容运行时资源
blender_scenebench/                   # 独立的 Blender 场景工作区
docs/                                 # 执行计划与维护文档
```

`ExperienceDefinition` 和 `sceneManifest` 是新运行时的主要配置入口。`public/` 中的兼容资源仍被 legacy 使用，R3F 通过类型化资源定义读取网页资产。

## Blender 场景工作区

[`blender_scenebench/`](./blender_scenebench/) 是与网页运行时隔离的 Blender 5.0 场景工作区。Vite、`src/` 和正式网页运行时不会从该目录加载资源；工作区用于场景重建、可编辑美术资产、版本制作和验证。

当前交付版本：

- 完整基准：`blender_scenebench/blender/GwayLoo_Scene_5_0.blend`
- 去除非相机动画版本：`blender_scenebench/versions/no-animation/blender/GwayLoo_Scene_5_0_no_animation.blend`

场景包含 26 个可编辑水彩图层、相机动画、桌面/移动景观入口，以及集中管理的派生版本目录。`no-animation` 版本在第 3586 帧固定非相机状态，同时保留相机动画。

Blender 的构建、资源路径、版本制作和验证命令见 [`blender_scenebench/README.md`](./blender_scenebench/README.md)。

## 开发计划

网页运行时的双轨迁移、资源管线、交互回归和 legacy 清理门槛记录在 [`docs/EXECUTION_PLAN.md`](./docs/EXECUTION_PLAN.md)。在 R3F 通过完整视觉与交互验收前，不会删除 legacy 引擎、兼容 DOM 或 `/wp-content/` 路径。

## 使用边界与版权

- 仓库当前没有声明统一的开源许可证；未看到明确授权时，不应把代码、媒体、字体、模型、音频或文本用于再发布。
- 部分资源和 legacy 运行时用于本地技术研究与兼容性验证，公开发布前仍需完成品牌替换、素材授权和外链审查。
- 本项目不声称拥有原始体验素材或第三方资源的再分发权。

## 项目状态说明

网页代码与 Blender 工作区共用同一个 Git 工程，但 Blender 工作区不属于网页的运行时依赖。生成缓存、源素材快照和本地测试产物按各自 `.gitignore` 规则管理；可交付的源码、配置、文档和版本文件保留在仓库中。
