---
type: moc
status: active
kind: process
importance: high
updated: 2026-08-25
topic: work-log-index
source_logs: []
supersedes: null
---

# 工作日志 MOC

> 单一工作日志索引，按更新时间倒序。任务类型通过 `kind` 元数据区分。

| 时间 | 类型 | 目标 | 状态 | 主题 | 日志 |
| --- | --- | --- | --- | --- | --- |
| 2026-08-25 | bug | - | archived | circular-cursor-indicator-fix | [[日志/2026-08-25-自定义光标圆形指示器修复与QA.md|自定义光标圆形指示器修复与 QA]] |
| 2026-08-25 | feature | - | archived | global-ground-background-shadow-reconstruction | [[日志/2026-08-25-全局Ground背景与阴影职责重建及交付QA.md|全局 Ground、Background 与阴影职责重建及交付 QA]] |
| 2026-08-25 | test | - | archived | five-viewport-delivery-regression-and-cursor-gate | [[日志/2026-08-25-五视口交付回归与光标状态门禁修正.md|五视口交付回归与光标状态门禁修正]] |
| 2026-08-25 | feature | - | archived | main-runtime-reducer-boundary-and-five-viewport-qa | [[日志/2026-08-25-主工程运行时Reducer边界迁移与五视口QA.md|主工程运行时 Reducer 边界迁移与五视口 QA]] |
| 2026-08-25 | feature | 继续把主工程的设备能力/移动端降级边界解构到 Branch 的 `ExperienceDefinition`，并修正停笔后的流体 activity 不应被平滑尾帧无限续期的问题。 | archived | device-definition-mobile-degradation-and-idle-brush-qa | [[日志/2026-08-25-主工程设备能力与移动端降级Definition边界及空闲笔刷QA.md|2026-08-25｜主工程设备能力与移动端降级 Definition 边界及空闲笔刷 QA]] |
| 2026-08-25 | feature | - | archived | main-content-definition-dom-adapter-and-five-viewport-qa | [[日志/2026-08-25-主工程内容Definition与DOM适配.md|主工程内容 Definition 与 DOM 适配]] |
| 2026-08-25 | feature | - | archived | main-world-assets-definition-migration-and-five-viewport-qa | [[日志/2026-08-25-主工程World资源定义迁移与QA.md|主工程 World 资源定义迁移与五视口 QA]] |
| 2026-08-25 | feature | - | archived | main-scene-metadata-definition-and-five-viewport-qa | [[日志/2026-08-25-主工程SceneMetadata迁移与QA.md|主工程 Scene Metadata 迁移与五视口 QA]] |
| 2026-08-25 | feature | - | active | runtime-contract-boundary | [[日志/2026-08-25-主工程Runtime输入选择音频契约边界迁移与QA.md|主工程 Runtime 输入、选择、音频与契约边界迁移及 QA]] |
| 2026-08-25 | feature | 继续针对 Branch 复刻主工程的 Definition → runtime contract → reducer 边界，移除 reducer 内仍可能把旧时间线带回运行时的历史 fallback；不调整水彩材质、波纹密度、Reveal profile 或设备策略。 | archived | runtime-reducer-definition-required-contract | [[日志/2026-08-25-主工程RuntimeReducer去除历史默认配置与QA.md|2026-08-25｜主工程 Runtime Reducer 去除历史默认配置与 QA]] |
| 2026-08-25 | feature | 继续移除 WatercolorView 中央纸片实例对完整 PaperConfig 的携带，让 identity、SDF reveal 和 Ground 参数分别归属窄契约。 | archived | paper-identity-reveal-contract | [[日志/2026-08-25-主工程Paper身份与Reveal契约收窄及QA.md|2026-08-25｜主工程 Paper 身份与 Reveal 契约收窄及 QA]] |
| 2026-08-25 | feature | 将 Branch 中宽泛的 PaperConfig 按可观测源码职责拆成 Ground、SDF、vegetation、shadow 四个窄契约，并验证它们与 26 个纸片 manifest 对齐。 | archived | paper-layer-contracts | [[日志/2026-08-25-主工程Paper职责子契约解构与QA.md|2026-08-25｜主工程 Paper 职责子契约解构与 QA]] |
| 2026-08-25 | feature | 消除标题层和 Full Paint 场景选择对完整 `world.papers` 的直接依赖，建立 Paper 场景呈现/主纸绑定窄契约。 | archived | paper-presentation-contract | [[日志/2026-08-25-主工程Paper场景呈现契约与FullPaint映射QA.md|2026-08-25｜主工程 Paper 场景呈现契约与 Full Paint 映射 QA]] |
| 2026-08-25 | feature | - | archived | main-paper-manifest-webgl-boundary | [[日志/2026-08-25-主工程PaperManifest与WebGL职责边界迁移及QA.md|主工程 Paper Manifest 与 WebGL 职责边界迁移及 QA]] |
| 2026-08-25 | feature | - | archived | main-definition-boundary-and-idle-fluid-lifecycle | [[日志/2026-08-25-主工程Definition边界迁移与空闲悬停流体修正.md|主工程 Definition 边界迁移与空闲悬停流体修正]] |
| 2026-08-25 | feature | - | archived | main-atlas-and-rgba-noise-resource-boundary | [[日志/2026-08-25-主工程Atlas与RGBA噪声资源边界迁移及QA.md|主工程 Atlas 与 RGBA Noise 资源边界迁移及 QA]] |
| 2026-08-25 | feature | - | archived | ground-instanced-batch-and-reveal-state-verification | [[日志/2026-08-25-Ground实例批次与Reveal状态验证.md|Ground 实例批次与 Reveal 状态验证]] |
| 2026-08-25 | feature | - | archived | cutout-shadow-layer-reconstruction | [[日志/2026-08-25-Cutouts独立SDF阴影层重建与浏览器QA.md|Cutouts 独立 SDF 阴影层重建与浏览器 QA]] |
| 2026-08-24 | bug | - | archived | fallback-static-interaction-boundary | [[日志/2026-08-24-降级页面静态交互边界.md|降级页面静态交互边界]] |
| 2026-08-24 | bug | - | archived | runtime-init-and-fluid-divergence | [[日志/2026-08-24-运行时初始化与流体散度对齐.md|运行时初始化与流体散度对齐]] |
| 2026-08-24 | bug | - | archived | grass-frustum-bounds-and-architecture-memory | [[日志/2026-08-24-草层裁剪与水彩架构记忆校正.md|草层裁剪与水彩架构记忆校正]] |
| 2026-08-24 | feature | - | archived | background-composite-and-shadow-boundary | [[日志/2026-08-24-背景合成与阴影职责对齐.md|Background 合成与阴影职责对齐]] |
| 2026-08-24 | feature | - | archived | paper-world-yaw-and-fade-reveal-alignment | [[日志/2026-08-24-纸片世界朝向与Fade显现对齐.md|纸片世界朝向与 Fade 显现对齐]] |
| 2026-08-24 | feature | - | archived | baked-camera-entry-pointer | [[日志/2026-08-24-烘焙相机入口与指针视差对齐.md|烘焙相机入口与指针视差对齐]] |
| 2026-08-24 | feature | - | archived | source-leaves-particle-layer | [[日志/2026-08-24-源码树叶全局粒子层与位置Pass重建.md|源码树叶全局粒子层与位置 Pass 重建]] |
| 2026-08-24 | feature | - | archived | reveal-profile-and-delivery-qa | [[日志/2026-08-24-源码Reveal双时序Profile与交付QA.md|源码 Reveal 双时序 Profile 与交付 QA]] |
| 2026-08-24 | feature | - | archived | source-reveal-visual-evidence-and-baseline-limit | [[日志/2026-08-24-源码Reveal中间态视觉证据与原站基线限制.md|源码 Reveal 中间态视觉证据与原站基线限制]] |
| 2026-08-24 | feature | - | archived | fluid-ellipse-brush-sdf | [[日志/2026-08-24-流体椭圆笔触SDF对齐.md|流体椭圆笔触 SDF 对齐]] |
| 2026-08-24 | bug | - | archived | fluid-instance-active-lifecycle | [[日志/2026-08-24-流体实例活跃生命周期对齐.md|流体实例活跃生命周期对齐]] |
| 2026-08-24 | bug | - | archived | fluid-instance-dt-scaling | [[日志/2026-08-24-流体实例时间步长对齐.md|流体实例时间步长对齐]] |
| 2026-08-24 | feature | - | archived | fluid-stencil-active-history | [[日志/2026-08-24-流体Stencil批处理与四帧活跃历史重建.md|流体 stencil 批处理与四帧活跃历史重建]] |
| 2026-08-24 | feature | - | archived | fluid-advection-v2-and-delivery-qa | [[日志/2026-08-24-流体AdvectionV2多步轨迹与交付QA.md|流体 Advection v2 多步轨迹与交付 QA]] |
| 2026-08-24 | discussion | - | archived | root-web-project-vs-main-engineering-project | [[日志/2026-08-24-根目录网页项目与主工程架构内容比较.md|根目录网页项目与主工程架构内容比较]] |
| 2026-08-24 | feature | - | archived | leaves-boundary-webgl-fallback | [[日志/2026-08-24-树叶交互边界与WebGL上下文降级.md|树叶交互边界与 WebGL 上下文降级]] |
| 2026-08-24 | maintenance | - | archived | project-memory-architecture-migration | [[日志/2026-08-24-工程记忆架构迁移.md|2026-08-24｜工程记忆架构迁移]] |
| 2026-08-24 | feature | - | archived | full-paint-lifecycle-tail-delivery-fallback | [[日志/2026-08-24-全屏绘画生命周期与尾部交付降级.md|全屏绘画生命周期与尾部交付降级]] |
| 2026-08-24 | bug | - | archived | full-paint-independent-fluid-instance | [[日志/2026-08-24-全屏绘画独立流体实例与资源完整性.md|全屏绘画独立流体实例与资源完整性]] |
| 2026-08-24 | discussion | - | archived | mainline-vs-branch-reconstruction-gap | [[日志/2026-08-24-主线与Branch复刻架构差距比较.md|主线与 Branch 复刻架构差距比较]] |
| 2026-08-24 | feature | - | archived | poem-textmesh-watercolor-background-reconstruction | [[日志/2026-08-24-Poem视图TextMesh与水彩背景重建.md|Poem 视图 TextMesh 与水彩背景重建]] |
| 2026-08-24 | feature | - | archived | poem-hk-four-tile-texture-contract | [[日志/2026-08-24-Poem恢复hK四瓦片纹理契约.md|Poem 恢复 hK 四瓦片纹理契约]] |
| 2026-08-24 | bug | - | archived | ground-and-render-resolution-contract | [[日志/2026-08-24-Ground与渲染分辨率契约对齐.md|Ground 与渲染分辨率契约对齐]] |
| 2026-08-24 | bug | - | archived | fullpaint-video-resource-failure-boundary | [[日志/2026-08-24-FullPaint视频资源失败边界.md|Full Paint 视频资源失败边界]] |
| 2026-08-24 | feature | - | archived | fullpaint-responsive-visibility-contract | [[日志/2026-08-24-FullPaint移动端比例与可见阈值对齐.md|Full Paint 移动端比例与可见阈值对齐]] |
| 2026-08-24 | feature | - | archived | full-paint-reveal-and-lifecycle-alignment | [[日志/2026-08-24-FullPaint显现与生命周期对齐.md|Full Paint 显现与生命周期对齐]] |
| 2026-08-24 | feature | - | archived | full-paint-video-fallback-and-compatibility-qa | [[日志/2026-08-24-FullPaint双层视频回退与兼容性QA.md|Full Paint 双层视频回退与兼容性 QA]] |
| 2026-08-21 | bug | - | archived | brush-motion-decay | [[日志/2026-08-21-笔触速度与轨迹衰减.md|2026-08-21｜笔触速度与轨迹衰减]] |
| 2026-08-21 | bug | - | archived | layer-edge-integrity | [[日志/2026-08-21-图层边缘完整性.md|2026-08-21｜图层边缘完整性]] |
| 2026-08-21 | bug | - | archived | layer-rise-reveal | [[日志/2026-08-21-图层立起渐进显现.md|2026-08-21｜图层立起渐进显现]] |
| 2026-08-21 | bug | - | archived | layer-timing-edge-catchup | [[日志/2026-08-21-图层时间与边缘追赶.md|2026-08-21｜图层时间与边缘追赶]] |
| 2026-08-21 | maintenance | - | archived | readme-powershell-workflow | [[日志/2026-08-21-README与PowerShell工作流.md|2026-08-21｜README 与 PowerShell 工作流]] |
| 2026-08-21 | maintenance | - | archived | git-proxy-remote | [[日志/2026-08-21-Git代理与远程连接修复.md|2026-08-21｜Git 代理与远程连接修复]] |
| 2026-08-20 | bug | - | archived | source-fidelity-recovery | [[日志/2026-08-20-源码优先恢复.md|2026-08-20｜源码优先恢复]] |
| 2026-08-20 | bug | - | archived | watercolor-audio-regression | [[日志/2026-08-20-水彩与音频回归修复.md|2026-08-20｜水彩与音频回归修复]] |
| 2026-08-20 | maintenance | - | archived | project-memory-initialization | [[日志/2026-08-20-工程记忆初始化.md|2026-08-20｜工程记忆初始化]] |
| 2026-08-20 | bug | - | archived | uv-alignment | [[日志/2026-08-20-UV对齐修复.md|2026-08-20｜UV 对齐修复]] |

## 使用方式

- 由 `python 工具/memory_lint.py index` 生成或刷新。
- 查询时先阅读当前状态，再按关键词定位日志。
- 历史日志是审计记录，不应直接覆盖当前状态。

## 入口

- [[工程记忆README|工程 Agent 记忆系统]]
- [[AGENTS|记忆维护协议]]
- [[日志/README|工作日志说明]]
- [[当前状态/项目概览|当前项目概览]]
- [[当前状态/系统架构|当前系统架构]]
