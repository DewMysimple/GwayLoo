/**
 * 入口 —— 串联整个体验：
 *
 *   1. 创建唯一的 WebGL 渲染器（KTX2 转码器需要它 detectSupport）
 *   2. 初始化 DOM 组件（加载画面 / 光标 / 权益区 / 音频）
 *   3. 预载静态资源（视频在全幅绘画时才懒加载），进度喂给加载画面
 *   4. 等字体就绪、绘制文字画布
 *   5. 资源齐 → 构建体验模块；用户点击 Enter → START_WATERCOLOR 启动
 */
import "./style.css";
import * as THREE from "three";
import gsap from "gsap";
import { bus, EVENTS } from "./core/EventBus";
import { resources } from "./core/Resources";
import { experienceDefinition } from "./experience/definition";
import { scrollController } from "./experience/scroll/ScrollController";
import { audioManager } from "./experience/audio/AudioManager";
import { experienceManager } from "./experience/ExperienceManager";
import { loaderExperience } from "./dom/LoaderExperience";
import { cursor } from "./dom/Cursor";
import { advantages } from "./dom/Advantages";
import { debugController } from "./dom/DebugController";

/** 移动端 100vh 修正（与原站 --vh 约定一致） */
function setVhVar(): void {
  document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
}
setVhVar();
window.addEventListener("resize", setVhVar);

const canvas = document.getElementById("xp-canvas") as HTMLCanvasElement;

function activateFallback(reason: string): void {
  experienceManager.reportFailure(reason);
  document.documentElement.classList.add("is-fallback");
  document.documentElement.dataset.experiencePhase = "fallback";
  const fallback = document.getElementById("webgl-fallback");
  if (fallback) fallback.hidden = false;
  document.querySelectorAll<HTMLElement>(".advantages-header, .advantages-content .a-title, .a-step-wrapper, .a-cta-wrapper")
    .forEach((element) => element.classList.add("show"));
  console.info(`[experience fallback] ${reason}`);
}

// The written page must remain interactive even when WebGL is skipped by
// reduced-motion or cannot be created. Bind these controls before the renderer
// branch so FAQ and the fallback Restart path do not depend on the canvas.
let staticDomReady = true;
try {
  advantages.init();
} catch (error) {
  staticDomReady = false;
  activateFallback(error instanceof Error ? error.message : "Static page initialization failed");
}

// 唯一渲染器：alpha 透明清屏，CSS 渐变背景透出（对应原站 .xp-canvas 的 background）
let renderer: THREE.WebGLRenderer | null = null;
let runtimeUnavailable = false;
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  activateFallback("reduced motion preference");
} else {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    activateFallback(error instanceof Error ? error.message : "WebGL unavailable");
  }
}

function initializeRuntime(activeRenderer: THREE.WebGLRenderer): boolean {
  try {
    activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    activeRenderer.setSize(window.innerWidth, window.innerHeight);
    activeRenderer.setClearColor(0x000000, 0);
    activeRenderer.outputEncoding = THREE.LinearEncoding; // 着色器内自行 linearToSrgb
    activeRenderer.autoClear = false;

    // KTX2 转码器（地面图集）与 DOM 组件都属于运行时初始化边界；
    // 任一项失败都必须进入可读 fallback，而不是让顶层模块异常中断。
    resources.setupKtx2(activeRenderer);
    loaderExperience.init();
    cursor.init();
    debugController.init(() => experienceManager.state);
    audioManager.init();
    scrollController.init();
    return true;
  } catch (error) {
    activeRenderer.dispose();
    activateFallback(error instanceof Error ? error.message : "Experience runtime initialization failed");
    return false;
  }
}

if (staticDomReady && renderer && initializeRuntime(renderer)) {
  const activeRenderer = renderer;

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    runtimeUnavailable = true;
    experienceManager.handleWebglContextLost();
    activateFallback("WebGL context lost; the written experience remains available");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    // Existing Three.js materials and FBOs are not rebuilt in place. Keep the
    // explicit fallback visible and require a reload for a clean GPU graph.
    runtimeUnavailable = true;
    activateFallback("WebGL context restored; reload required for the watercolor scene");
  });

// 启动流程：资源预载 + 文字画布准备 → 构建体验模块
async function boot(): Promise<void> {
  try {
    await Promise.all([resources.preload(experienceDefinition.assets.staticResources), experienceManager.textCanvas.prepare()]);
    if (runtimeUnavailable) return;
    if (resources.hasFailures) {
      const failedNames = resources.failures.map((failure) => failure.name).join(", ");
      runtimeUnavailable = true;
      activateFallback(`Required resources unavailable: ${failedNames}`);
      return;
    }
    experienceManager.init(canvas, activeRenderer);
    // Align screen-space uniforms with the renderer drawing buffer before
    // the first frame (the source performs the same resize handshake).
    experienceManager.onResize(window.innerWidth, window.innerHeight);
    // Development-only shortcut is scheduled from the completed boot promise,
    // avoiding a cache-dependent race with RESOURCES_COMPLETE.
    if (location.hash === "#autostart") {
      setTimeout(() => bus.emit(EVENTS.START_WATERCOLOR), 500);
    }
  } catch (err) {
    console.error("[boot] 初始化失败", err);
    runtimeUnavailable = true;
    activateFallback(err instanceof Error ? err.message : "Experience initialization failed");
  }
}
boot();

// 全局事件
bus.on(EVENTS.START_WATERCOLOR, () => experienceManager.start());
bus.on(EVENTS.RESTART_WATERCOLOR, () => experienceManager.restart());

  // 尺寸变化
  window.addEventListener("resize", () => {
    if (runtimeUnavailable) return;
    activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    experienceManager.onResize(window.innerWidth, window.innerHeight);
  });

// 每帧把 ExperienceManager 的雾状态同步进渲染循环
gsap.ticker.add(() => experienceManager.syncFrame());

// 调试句柄只在开发环境存在，生产构建不暴露内部状态。
if (import.meta.env.DEV) {
  (window as unknown as { __xp: unknown }).__xp = {
    experienceManager,
    experienceDefinition,
    scrollController,
    resources,
    audioManager,
    bus,
    EVENTS,
  };
}
}
