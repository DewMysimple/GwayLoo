# GwayLoo 旧版 WebGL 运行时可维护化执行套餐

## 1. 任务目标

将当前旧版压缩 WebGL 运行时重构为可维护的 TypeScript/React Three Fiber 模块，同时尽量保持默认 legacy 页面已有的视觉、鼠标、滚动、加载、视频、音频和场景切换行为。

本计划针对后续 Sol 执行，不要求 Sol 直接反混淆后照搬压缩代码。旧版运行时应作为可运行行为基线，新实现应通过资源清单、运行时观测、类型化状态和浏览器回归重新建立。

目标范围包括：

- 双阶段加载器和运行时启动流程；
- GLB、纹理、视频、音频、LUT、KTX2 和 MSDF 资源管线；
- 相机动画、滚动进度、图层 reveal 和六组景观；
- 水彩 atlas、mask、SDF、纸张、噪声、墨水和后处理；
- 鼠标光标、Canvas 坐标、Raycaster、图层悬停和点击反馈；
- base/over 视频层、音频解锁、全屏景观、返回和 Restart；
- 桌面/移动响应式行为、性能降级和资源错误处理；
- Benefits、FAQ 和页面尾部与体验运行时的状态衔接。

## 2. 当前事实与不可违反的边界

- 当前默认入口是 legacy；`?runtime=r3f` 只是新运行时验收入口。
- 旧运行时入口是 `public/wp-content/themes/davidwhyte/app.js`，约 3.8 MB，为打包压缩产物，不直接编辑。
- `src/features/experience/LegacyRuntimeBridge.tsx` 是旧运行时唯一 React 入口；`legacy-runtime.ts` 只负责注入旧脚本。
- 新实现放在 `src/features/experience/r3f/`、`src/features/experience/runtime/` 和 `src/content/`。
- 在新实现达到视觉和交互验收标准前，不切换默认运行时，不删除 `app.js`、旧样式、兼容 DOM 或 `/wp-content/` 资源路径。
- `blender_scenebench/` 是本地美术和 Blender 工作区，不作为 Vite 正式运行时资源来源。
- 公开仓库不依赖外部参考目录；维护者如设置 `GWAYLOO_REFERENCE_ROOT`，该目录只用于只读启动、测量和可选对照。
- 保留当前工作区已有修改；不得执行 `git reset`、`git checkout` 或批量删除。
- `app.js` 引用了 `/wp-content/themes/davidwhyte/app/427.js`，但当前仓库和只读基线均未发现该文件。第一阶段必须确认它是否属于实际可达路径；不能自行伪造或静默忽略。

## 3. 新旧运行时的对应关系

| 旧版行为 | 新实现位置 | 要求 |
| --- | --- | --- |
| 旧脚本启动与 DOM 契约 | `LegacyRuntimeBridge.tsx`、`legacy-runtime.ts` | 迁移期保持不变 |
| 运行时选择 | `runtime/selection.ts` | 默认 legacy，R3F 通过查询参数启用 |
| 资源定义 | `src/content/definition.ts`、`scenes.ts`、`atlas.ts` | 保持强类型、路径集中管理 |
| 场景/相机/图层 | `r3f/LandscapeWorld.tsx` | 不依赖压缩变量名；使用稳定对象 ID/名称 |
| 资源预加载 | `r3f/SourceAssetPipeline.tsx` | 统一进度、错误和缓存行为 |
| 状态和时间线 | `runtime/reducer.ts`、`runtime/input.ts` | 使用可测试的纯状态转换 |
| 鼠标和 Canvas 交互 | 新增/重构 R3F 交互模块 | 用明确的 pointer/raycast 事件和配置驱动 |
| 全屏视频景观 | `r3f/VideoLandscape.tsx` | 保留 desktop/mobile、base/over、1-6 命名契约 |
| 音频 | `runtime/audio.ts`、`SourceSoundControl.tsx` | 用户手势后解锁，禁止自动绕过浏览器策略 |
| 页面尾部 | `OriginalExperienceTail.tsx` | legacy 与 React 所有权分离，避免双重事件 |

## 4. 实施阶段

### 阶段 A：只读审计和基线记录

1. 读取项目记忆、README、ADR-006、资源清单、R3F 代码和 Playwright 测试。
2. 对 `app.js` 做格式化副本或 AST/静态分析副本，但不覆盖正式文件。
3. 建立模块地图：启动、加载、资源、WebGL、Shader、相机、滚动、鼠标、Raycaster、视频、音频、FAQ 和尾部。
4. 使用默认 legacy 页面记录桌面/移动截图、加载阶段、滚动节点、鼠标轨迹、点击结果、媒体状态和控制台输出。
5. 分析 `app/427.js` 引用的可达性；若无法获得，应在计划和最终报告中明确列为未确认依赖。

输出：审计报告、资源依赖图、旧行为清单、不可确认项和逐项验收指标。此阶段不得修改业务代码。

### 阶段 B：契约和资源验证

1. 保留现有 `ExperienceDefinition`，仅按实际需要扩展图层、材质、时间线和交互类型。
2. 为 GLB 节点、相机、26 个水彩图层、`Ground`、atlas remap、reveal 时间、场景标题和视频资源建立类型化契约。
3. 增加或完善资源检查：缺失文件、错误扩展名、desktop/mobile 对称性、base/over 对称性、1-6 编号完整性和 GLB 关键节点。
4. 保持资源 URL 兼容，不改变旧目录和文件名。

输出：稳定的类型和资源检查，不改变默认 legacy 的可见行为。

### 阶段 C：R3F 场景和材质重写

1. 以 `scene.glb` 为几何和相机基础，不把 Blender 材质直接当作网页最终材质。
2. 将 atlas、mask、SDF、纸张、噪声、grass、ground、LUT 和 MSDF 作为明确输入。
3. 重写水彩材质、透明边缘、纸张弯曲、墨水 reveal、ground 管线和后处理；每个效果必须有独立参数和关闭/降级路径。
4. 保留 `Camera_Animation_Baked`、图层对象名和必要层级；新增对象必须有稳定 ID 和材质映射。
5. 逐帧时间线以滚动进度为输入，禁止将核心行为依赖随机不可复现的副作用；若旧版确实使用随机墨水场，需记录随机种子或接受视觉容差。

输出：R3F 版本不再是“破损预览”，能独立显示完整沉浸式场景。

### 阶段 D：滚动、鼠标和场景交互

1. 将鼠标坐标转换、Raycaster 命中、hover/active/pressed 状态和全局光标拆成可测试模块。
2. 图层交互按对象 ID/语义配置工作，不依赖压缩代码中的变量名。
3. 实现鼠标移动引起的图层、材质、透明度或光标反馈，并保留桌面无鼠标和触摸设备降级。
4. 将滚动进度、相机时间、图层 reveal、诗句状态和全屏景观状态接入现有 reducer。
5. 验证移动端 touch、滚动、返回、Restart 和浏览器手势冲突。

输出：鼠标、滚动、点击和触摸交互与 legacy 基线一致，且有 Playwright 覆盖。

### 阶段 E：视频、音频、加载和错误恢复

1. 统一 desktop/mobile 和 base/over 视频选择、预加载、播放、暂停、释放和透明度混合。
2. 保留用户手势后音频解锁和反馈音效行为。
3. 统一第一加载器、资源加载进度、第二阶段延迟、运行时错误和低性能降级。
4. 确认资源失败时页面不会永久空白，并提供可诊断错误信息。

输出：完整运行时生命周期和资源失败路径。

### 阶段 F：双轨对照、切换和清理门槛

1. 默认页面继续使用 legacy；R3F 通过 `?runtime=r3f` 对照。
2. 在桌面和移动视口对比截图、几何、滚动范围、动画阶段、鼠标轨迹、视频和音频行为。
3. 只有全部验收通过后才修改默认选择；修改前保留可回退开关。
4. 旧文件、兼容路径和 `LegacyRuntimeBridge` 只有在确认无异步 chunk、隐藏 DOM、资源 URL 和行为依赖后才允许删除。

## 5. 验证命令与验收标准

每个阶段根据影响范围运行相关命令，最终必须全部通过：

```text
npm run lint
npm run typecheck
npm run test
npm run check:assets
npm run build
npm run test:e2e
```

验收必须包括：

- 默认 legacy 页面行为未被意外改变；
- R3F 页面无白屏、资源加载错误或未处理异常；
- 加载器、诗句、滚动、相机、26 个图层、六组景观、视频、音频、鼠标、返回、Restart、FAQ 和页面尾部均有明确结果；
- 桌面和移动视口均验证；
- 关键 GLB 节点名、材质映射、视频路径和音频路径均经过自动检查；
- 视觉差异、交互差异和未解决依赖必须在最终报告中逐项列出；
- 未达到逐帧等价前不得删除 legacy。

## 6. 交给 Sol 的执行提示词

```text
请先读取：
- docs/EXECUTION_PLAN.md
- AGENTS.md
- README.md
- wiki_memory/AGENTS.md
- wiki_memory/当前状态/项目概览.md
- wiki_memory/当前状态/系统架构.md
- wiki_memory/当前状态/当前约束.md
- wiki_memory/决策/ADR-006-React-Three-Fiber双轨迁移.md
- blender_scenebench/reports/rendering-boundaries.md

你负责执行 docs/EXECUTION_PLAN.md，不重新做完整规划。

执行规则：
- 先验证计划与当前代码、资源和测试是否一致。
- 旧 app.js 只读，不格式化覆盖、不直接修改、不删除。
- 默认 legacy 保持为行为和视觉基线；新实现先通过 ?runtime=r3f 验收。
- 所有新行为写入 src/ 下可维护的 TypeScript、React Three Fiber、配置和测试模块。
- 不删除 LegacyRuntimeBridge、兼容 DOM、旧样式、/wp-content/ 资源路径或现有用户修改。
- 不执行 git reset、git checkout、批量删除或无关格式化。
- 先完成阶段 A 的审计和资源契约，再按阶段 B-F 执行。
- app.js 引用的 /wp-content/themes/davidwhyte/app/427.js 当前可能缺失；必须先确认其可达性和影响，不能自行伪造。
- 每完成一个阶段运行该阶段相关测试，并汇报修改文件、测试结果和剩余差异。
- 如果计划与实际代码、资源或旧版行为冲突，暂停当前阶段，记录冲突和需要确认的选项，不擅自扩大范围。

最终报告必须包含：
- 修改文件和新增模块；
- 新旧运行时的行为映射；
- 所有验证命令及结果；
- 桌面/移动视觉与交互差异；
- 未解决的资源、异步 chunk、Shader 或兼容性问题；
- 是否满足切换默认运行时的门槛。
```

## 7. 当前默认假设

- 目标是完整体验引擎的视觉与交互等价重写，不是只替换 GLB。
- legacy 在整个迁移期保留并作为回退。
- 新实现以 R3F 为主，但不强行复用旧压缩代码的内部结构。
- 计划阶段可以生成静态分析副本和报告；不得修改压缩产物本身。
- 原始素材和旧运行时仅用于本地技术研究，公开发布前仍需完成品牌、授权和外链审查。
