---
type: log
status: archived
kind: feature
importance: high
updated: 2026-08-25
topic: main-content-definition-dom-adapter-and-five-viewport-qa
source_logs:
  - "[[日志/2026-08-25-主工程运行时Reducer边界迁移与五视口QA|主工程运行时 Reducer 边界迁移与五视口 QA]]"
  - "[[日志/2026-08-24-主线与Branch复刻架构差距比较|主线与 Branch 复刻架构差距比较]]"
supersedes: null
---

# 主工程内容 Definition 与 DOM 适配

## 目标

继续把根目录主工程的内容层事实迁入 Branch 的独立架构边界，重点处理之前仍硬编码在 app/index.html 的加载文案、诗句 DOM、尾部权益、FAQ、分享/奖项和字体契约。保持 Branch 自有 /assets、WebGL、shader、legacy DOM 交互和本地交付边界，不引用根目录运行时路径。

## 主工程与 Branch 差距

| 内容职责 | 根目录主工程 | Branch 本轮处理 |
| --- | --- | --- |
| 内容聚合 | src/content/definition.ts 聚合 copy、fonts、tail、scenes、sounds、world | app/src/experience/definition.ts 增加 copy、fonts、tail，内容文件复制到 Branch 自有 app/src/content/ |
| 诗句 DOM | ExperienceCopy.poems[].sourceMarkup 是 TextCanvas 测量的可信 div/p/br 结构，第三段含完整 Despair 段落 | ContentDefinitionAdapter 在 TextCanvas 准备前把两份 .xp-text DOM 替换为同一份本地 definition markup，并保留 line-break |
| 尾部内容 | tailCopy 含完整 5 条 FAQ、Substack 4 段、gift/email/static award token | adapter 按主工程 copy 重建本地 FAQ 段落和静态 token，不建立远程链接或购买动作 |
| 字体 | 主工程声明 Canela Thin 与 Roobert 资源契约 | Branch 用本地 /assets/fonts 路径与 family/weight 元数据；TextCanvas 从 definition.fonts.canelaThin.family 测量和绘制 |
| 交互文案 | sound、back、scroll、restart、landscape CTA 属于 copy 边界 | Loader、AudioManager、PaintingTitles、DOM adapter 消费 definition，视觉结果保持当前稳定版本 |

## 已实施变更

- 新增 app/src/content/experience.ts、tail.ts、fonts.ts，内容取自主工程只读基线并保留 Branch 的本地边界。
- 新增 app/src/dom/ContentDefinitionAdapter.ts，在 Advantages.init() 与 TextCanvas.prepare() 之前应用加载文案、诗句 markup、权益/offer、FAQ 和 footer copy。
- LoaderExperience、TextCanvas、AudioManager、PaintingTitles、WatercolorView 改为消费 definition 的内容/字体/CTA 字段；未替换已验证的 WebGL 参数。
- QA 新增 definition 内容断言，覆盖 intro、3 份 poem DOM、主工程尾页标题、5 条 FAQ、Substack 4 段、静态 awards token 和 Canela family。

## 验证

- npx tsc --noEmit：通过。
- npm run build：通过；65 modules，JS 约 867 KB，仅保留已有大 chunk 警告。
- npm run verify:integrity：73/73 通过。
- node --check scripts/qa-experience.mjs 与 git diff --check：通过。
- 复用 Chrome 9333 现有唯一页面执行五视口 QA：passed: true、sourceRevealProfilePassed: true、5 cases、console errors 0、remote resources 0。
- 同一轮保留流体、Cutouts SDF 阴影、Ground batch、Full Paint、Poem、音频、context loss、reduced-motion、FAQ、Restart 和 cursor 门禁通过。
- Chrome 最终盘点：9333 只有 1 个 Branch 页面；9334、9336、9337 均关闭；没有创建重复页面。

## 遗留与下一步

- 当前内容已经从 index.html 硬编码迁入 definition 适配边界，但 DOM 仍是 Branch 为保证交付稳定而保留的 legacy 壳；后续可继续比较主工程 tail 的语义属性、动画状态与 pixel-level 排版。
- 主工程与 Branch 尚未完成同 seed、同 viewport、同时间点像素差分；本轮只证明内容契约、运行时结构与 Branch 自身交付行为。
- Start.cmd 是用户工作树未跟踪文件，本轮未修改、未加入提交。
