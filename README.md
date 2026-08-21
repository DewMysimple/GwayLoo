# David Whyte Experience — 本地模板副本

从 https://davidwhyte.com/experience/ 完整抓取的静态站点模板,已本地化,可离线运行、二次修改。

## 快速开始

```bash
# 方式一:直接双击 index.html 打开(部分浏览器对本地 file:// 有限制,推荐方式二)
# 方式二:本地服务器(推荐)
python -m http.server 8787
# 然后访问 http://127.0.0.1:8787/index.html
```

> 注意:必须通过 HTTP 服务访问,直接双击 file:// 打开时 WebGL 纹理(ktx2/basis 转码)可能无法加载。

## 目录结构

```
davidwhyte-template/
├── index.html                          # 主页面(入口,可直接编辑)
├── wp-content/
│   ├── themes/davidwhyte/
│   │   ├── style.css                   # 全站样式(536KB)
│   │   ├── loader.css                  # 加载动画样式
│   │   ├── app.js                      # 核心脚本(4MB,含 WebGL 水彩引擎)
│   │   └── resources/assets/
│   │       ├── fonts/                  # CanelaText + Roobert 字体(woff2/woff)
│   │       ├── xp/
│   │       │   ├── models/scene.glb    # 3D 水彩场景模型
│   │       │   ├── textures/           # 纸张/噪声/草地/纹理图集
│   │       │   ├── msdf/               # MSDF 文字纹理
│   │       │   ├── videos/             # 24 个水彩视频纹理(desktop+mobile, base+over, 1-6)
│   │       │   ├── sounds/             # 背景音效(mp3)
│   │       │   ├── libs/basis/         # KTX2 纹理转码器
│   │       │   └── lut/                # 调色 LUT(ink/dry)
│   │       └── detect-gpu/benchmarks/  # GPU 性能检测基准数据(本地化)
│   ├── plugins/                        # WooCommerce/MemberPress 样式与脚本
│   └── uploads/                        # 站点图标
├── mapbox-gl-js/                       # Mapbox GL(本地化,当前页面未用)
├── dash.js/                            # DASH 播放器(本地化)
├── npm/                                # tarteaucitron 弹窗(本地化)
└── clover/                             # Stripe(本地化)
```

## 已做的本地化改造

1. 删除 `<base href>` 标签,所有资源改为相对路径
2. 移除 Google Analytics、Cloudflare email-decode、hCaptcha 外链脚本
3. CDN 依赖(mapbox、dash.js、tarteaucitron、stripe)全部下载到本地
4. **GPU 检测基准数据本地化**:原站依赖 unpkg.com 拉取 detect-gpu 数据,已改为读取本地 `wp-content/themes/davidwhyte/resources/assets/detect-gpu/benchmarks/`
5. **修复 hcaptcha ReferenceError**:联系表单的 `data-is-captcha-active` 已改为 `false`,避免组件初始化链中断
6. 补充下载 MSDF 字体纹理(`/xp/msdf/CanelaText-Light/`)

## 二次修改要点

- **首页文字(水彩场景中的诗句)**:编辑 index.html 中 `.xp-text-w` / `.xp-text-w-inside` 下的 `.xp-text` 块(共 3 段)
- **页面文案**:搜索 "Become a companion"、"Subscriber Benefits" 等标题直接替换
- **FAQ**:`.internal-module.faq` 中的 `.question` 块,可复制增加
- **按钮/链接**:`Subscribe - $75 / year` 等链接指向 `./register/membership/`,需改为你自己的落地页
- **品牌名**:全局替换 "David Whyte" → 你的名字
- **水彩背景素材**:替换 `wp-content/themes/davidwhyte/resources/assets/xp/videos/desktop/` 下的 mp4(1-6 号 base/over 成对替换),注意保持同样文件名
- **样式**:主样式在 `wp-content/themes/davidwhyte/style.css`(已压缩,可用 Prettier 展开后编辑)
- **核心动画逻辑**:`wp-content/themes/davidwhyte/app.js`(压缩混淆,一般只改数据不碰它)

## 工程记忆

工程记忆统一存放在 [`工程记忆/`](./工程记忆/) 目录中，不与项目源代码和资源混放。

```bash
python 工程记忆/工具/memory_lint.py check
python 工程记忆/工具/memory_lint.py index
```

## 依赖说明

- 页面运行时无外网依赖,离线可完整运行水彩 WebGL 动画
- 社交分享按钮、Awwwards 等外链仍指向原站(仅链接,不加载资源)
- 视频纹理在进入具体水彩场景时才由 JS 按需加载(`_setSceneTexture`),初始加载页无视频属正常

## 原始来源

- 站点:https://davidwhyte.com/experience/
- 抓取日期:2026-08-21
- 版权:模板归原网站所有,仅用于学习与二次创作参考
