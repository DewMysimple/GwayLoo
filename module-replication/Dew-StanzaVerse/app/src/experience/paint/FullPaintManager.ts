/**
 * 全幅绘画模式（Full Paint）。
 * 长按画纸（桌面 0.3s / 移动端 0.6s）进入：该画作的 base/over 两层
 * 动态绘画视频铺满屏幕，墨迹晕开展现，此时在屏幕上涂抹直接驱动
 * 该画作对应的流体模拟区域 —— 视频随笔触"活"起来。
 * 对应原站 FullPaintManager + 全屏绘画四边形（29/30 号着色器）。
 */
import * as THREE from "three";
import gsap from "gsap";
import { fullpaintVertexShader, fullpaintFragmentShader } from "../../shaders/fullpaint";
import { audioManager } from "../audio/AudioManager";
import type { FluidSimulation } from "./FluidSimulation";
import { bus } from "../../core/EventBus";
import { resources } from "../../core/Resources";
import { createRevealConfig } from "../world/InkReveal";
import { experienceDefinition, type ExperienceDefinition } from "../definition";

export const FULLPAINT_EVENTS = {
  SHOW: "fullpaint-show",
  HIDE: "fullpaint-hide",
  ERROR: "fullpaint-error",
} as const;

export class FullPaintManager {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);

  private _material: THREE.ShaderMaterial;
  private _simulation: FluidSimulation;
  private _visible = false;
  private _rendering = false;
  private _forced = false;
  private _sceneIndex: number | null = null;
  private _showTimeline: gsap.core.Timeline | null = null;
  private _hideTimeline: gsap.core.Timeline | null = null;
  private _videoBase: HTMLVideoElement | null = null;
  private _videoOver: HTMLVideoElement | null = null;
  private _texBase: THREE.VideoTexture | null = null;
  private _texOver: THREE.VideoTexture | null = null;
  private _videoFailure: { sceneIndex: number; layer: "base" | "over"; src: string } | null = null;
  private _videoFallback: { sceneIndex: number; from: "over"; to: "base" } | null = null;
  private _definition: ExperienceDefinition;

  constructor(simulation: FluidSimulation, definition: ExperienceDefinition = experienceDefinition) {
    this._simulation = simulation;
    this._definition = definition;

    const noise = resources.get<THREE.Texture>("noise/rgb-generated");
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;

    const reveal = createRevealConfig(window.innerWidth / window.innerHeight, "full-paint", 1.5);
    this._material = new THREE.ShaderMaterial({
      vertexShader: fullpaintVertexShader,
      fragmentShader: fullpaintFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uAlpha: { value: 1 },
        uScale: { value: 1.4 },
        uVisibleProgress: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uPaintTextureSize: { value: new THREE.Vector2(1920, 1080) },
        uColor: { value: new THREE.Color("#fff7e5") },
        uPaintTexture: { value: null },
        uPaintTexture2: { value: null },
        uNoiseTexture: { value: noise },
        uSimulation: { value: null },
        uSimulationRemap: { value: new THREE.Vector4(0, 0, 1, 1) },
        uRevealPoints: { value: reveal.infos },
        uRevealPointsPos: { value: reveal.positions },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  get isVisible(): boolean {
    // The source manager becomes visible only after the reveal has crossed
    // 0.8. Keeping this threshold during hide also prevents ordinary paper
    // tiles from becoming active while the full-paint layer is retracting.
    return Number(this._material.uniforms.uVisibleProgress.value) > 0.8;
  }

  /** Keep the mesh composited while the source hide timeline retracts it. */
  get isRendering(): boolean {
    return this._rendering;
  }

  get isForced(): boolean {
    return this._forced;
  }

  get sceneIndex(): number | null {
    return this._sceneIndex;
  }

  get videoFailure(): { sceneIndex: number; layer: "base" | "over"; src: string } | null {
    return this._videoFailure;
  }

  get videoFallback(): { sceneIndex: number; from: "over"; to: "base" } | null {
    return this._videoFallback;
  }

  /** 视频元素缓存（懒加载，进入全幅绘画时才拉取） */
  private _videoCache = new Map<string, HTMLVideoElement>();

  private _getVideo(sceneIndex: number, layer: "base" | "over"): HTMLVideoElement {
    const key = `${layer}/${sceneIndex}`;
    let video = this._videoCache.get(key);
    if (!video) {
      const platform = this._definition.assets.device;
      video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.addEventListener("error", () => this._handleVideoError(sceneIndex, layer));
      const scene = this._definition.scenes.find((entry) => entry.id === sceneIndex);
      const source = scene?.videos[platform][layer];
      if (!source) throw new Error(`Missing ${platform}/${layer} video for scene ${sceneIndex}`);
      video.src = source;
      video.load();
      this._videoCache.set(key, video);
    }
    return video;
  }

  /** 进入全幅绘画 */
  show(sceneIndex: number): void {
    if (this._visible) return;
    this._showTimeline?.kill();
    this._hideTimeline?.kill();
    this._showTimeline = null;
    this._hideTimeline = null;
    this._visible = true;
    this._rendering = true;
    this._sceneIndex = sceneIndex;
    this._videoFailure = null;
    this._videoFallback = null;
    this._simulation.resetFullPaint(sceneIndex);

    this._disposeVideoTextures();

    // 绑定该画作的两层视频纹理
    this._videoBase = this._getVideo(sceneIndex, "base");
    this._videoOver = this._getVideo(sceneIndex, "over");
    if (this._videoBase) {
      const video = this._videoBase;
      video.load();
      this._texBase = new THREE.VideoTexture(video);
      this._texBase.encoding = THREE.sRGBEncoding;
      this._material.uniforms.uPaintTexture.value = this._texBase;
      const setSize = () =>
        this._material.uniforms.uPaintTextureSize.value.set(
          video.videoWidth || 1920,
          video.videoHeight || 1080,
        );
      if (video.readyState >= 1) setSize();
      else video.addEventListener("loadedmetadata", setSize, { once: true });
      video.play().catch(() => {});
    }
    if (this._videoOver) {
      const video = this._videoOver;
      video.load();
      this._texOver = new THREE.VideoTexture(video);
      this._texOver.encoding = THREE.sRGBEncoding;
      this._material.uniforms.uPaintTexture2.value = this._texOver;
      video.play().catch(() => {});
    }

    this._material.uniforms.uSimulationRemap.value = this._simulation.fullPaintRegionRemap();

    const u = this._material.uniforms;
    const remainingProgress = Math.max(0, 3.8 - Number(u.uVisibleProgress.value));
    u.uAlpha.value = 1;
    const timeline = gsap.timeline();
    timeline.to(u.uScale, { value: 1, duration: 3, ease: "power1.out" }, 0);
    timeline.to(u.uVisibleProgress, { value: 3.8, duration: remainingProgress, ease: "none" }, 0.42);
    timeline.timeScale(2);
    this._showTimeline = timeline;

    audioManager.switchThemeTo("loop-painting");
    bus.emit(FULLPAINT_EVENTS.SHOW);
  }

  /** 退出全幅绘画 */
  hide(): void {
    if (!this._visible && !this._rendering) return;
    this._visible = false;
    this._showTimeline?.kill();
    this._showTimeline = null;
    this._hideTimeline?.kill();
    const u = this._material.uniforms;
    const retractDuration = Math.max(0, 2.5 * Number(u.uVisibleProgress.value) / 3.8);
    const timeline = gsap.timeline({
      onComplete: () => {
        this._rendering = false;
        this._disposeVideoTextures();
        this._sceneIndex = null;
      },
    });
    timeline.to(u.uVisibleProgress, { value: 0, duration: retractDuration, ease: "none" }, 0);
    timeline.to(u.uScale, { value: 1.4, duration: 3, ease: "power1.inOut" }, 0.25);
    timeline.timeScale(2);
    this._hideTimeline = timeline;
    audioManager.switchThemeTo("loop-main");
    bus.emit(FULLPAINT_EVENTS.HIDE);
  }

  update(): void {
    if (!this._rendering) return;
    const sim = this._simulation.texture;
    if (this._material.uniforms.uSimulation.value !== sim) {
      this._material.uniforms.uSimulation.value = sim;
    }
    this._texBase && (this._texBase.needsUpdate = true);
    this._texOver && (this._texOver.needsUpdate = true);
  }

  resize(width: number, height: number, renderWidth = width, renderHeight = height): void {
    this._material.uniforms.uResolution.value.set(renderWidth, renderHeight);
    const reveal = createRevealConfig(width / Math.max(height, 1), "full-paint", 1.5);
    this._material.uniforms.uRevealPoints.value = reveal.infos;
    this._material.uniforms.uRevealPointsPos.value = reveal.positions;
  }

  private _disposeVideoTextures(): void {
    this._videoBase?.pause();
    this._videoOver?.pause();
    this._texBase?.dispose();
    this._texOver?.dispose();
    this._texBase = this._texOver = null;
    this._videoBase = this._videoOver = null;
    this._material.uniforms.uPaintTexture.value = null;
    this._material.uniforms.uPaintTexture2.value = null;
  }

  private _handleVideoError(sceneIndex: number, layer: "base" | "over"): void {
    if (!this._visible || this._sceneIndex !== sceneIndex) return;

    const video = layer === "base" ? this._videoBase : this._videoOver;
    if (layer === "over" && this._texBase) {
      // The source accepts an optional second texture and falls back to the
      // base video when it is absent. Keep that delivery contract when a
      // locally mirrored over-layer fails to decode or is missing: the
      // painting remains interactive and the base watercolor is still useful.
      this._videoFallback = { sceneIndex, from: "over", to: "base" };
      video?.pause();
      this._texOver?.dispose();
      this._texOver = null;
      this._videoOver = null;
      this._material.uniforms.uPaintTexture2.value = this._texBase;
      return;
    }
    this._videoFailure = { sceneIndex, layer, src: video?.currentSrc || video?.src || "" };
    this._showTimeline?.kill();
    this._hideTimeline?.kill();
    this._showTimeline = null;
    this._hideTimeline = null;
    this._visible = false;
    this._rendering = false;
    this._material.uniforms.uAlpha.value = 0;
    this._material.uniforms.uVisibleProgress.value = 0;
    this._material.uniforms.uScale.value = 1.4;
    this._disposeVideoTextures();
    this._sceneIndex = null;
    audioManager.switchThemeTo("loop-main");
    bus.emit(FULLPAINT_EVENTS.HIDE);
    bus.emit(FULLPAINT_EVENTS.ERROR, this._videoFailure);
  }
}
