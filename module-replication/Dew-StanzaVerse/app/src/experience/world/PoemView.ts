/**
 * Poem 全屏视图。
 *
 * 原站这里不是一张独立的 poem/text.png 全屏贴图，而是两个同属 UI
 * 相机的组件：
 *   1. Background：Full Screen simulation + watercolor paper；
 *   2. TextMesh：复用 TextCanvas 的源码四瓦片文字纹理（采样前三个
 *      sharp/low/high boxes）与书写/淡出 shader。
 *
 * 保留这两个职责边界，才能让诗歌转场继续消费同一份流体状态和文字
 * Canvas，而不是在进入 Poem 时切换到另一套静态渲染模型。
 */
import * as THREE from "three";
import gsap from "gsap";
import { resources } from "../../core/Resources";
import {
  poemBackgroundFragmentShader,
  poemBackgroundVertexShader,
  poemTextFragmentShader,
} from "../../shaders/poem";
import { TextCanvas } from "./TextCanvas";
import type { FluidSimulation } from "../paint/FluidSimulation";

interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class PoemView {
  scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;

  private _textCanvas: TextCanvas;
  private _simulation: FluidSimulation;
  private _backgroundMaterial: THREE.ShaderMaterial;
  private _textMaterial: THREE.ShaderMaterial;
  private _backgroundMesh: THREE.Mesh;
  private _textMesh: THREE.Mesh;
  private _visible = false;
  private _elementRect: RectLike = { left: 0, top: 0, width: 1, height: 1 };
  private _timeline: gsap.core.Timeline | null = null;

  constructor(textCanvas: TextCanvas, simulation: FluidSimulation) {
    this._textCanvas = textCanvas;
    this._simulation = simulation;
    this.camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      -window.innerHeight / 2,
      -1,
      1,
    );

    const paperTexture = resources.get<THREE.Texture>("watercolor/paper/texture");
    paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
    const noise = resources.get<THREE.Texture>("noise/rgb-fractal");
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;

    this._backgroundMaterial = new THREE.ShaderMaterial({
      vertexShader: poemBackgroundVertexShader,
      fragmentShader: poemBackgroundFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSimulation: { value: this._simulation.texture },
        uSimulationRemap: { value: this._simulation.fullPaintRegionRemap() },
        uSimulationAlpha: { value: 0 },
        uPaperTexture: { value: paperTexture },
        uRatio: { value: 1 },
        uColor: { value: new THREE.Color("#dcdcdc") },
        uPaintColor1: { value: new THREE.Color("#cdcdd1") },
        uPaintColor2: { value: new THREE.Color("#bec1c6") },
      },
    });
    this._backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._backgroundMaterial);
    this._backgroundMesh.frustumCulled = false;
    this._backgroundMesh.renderOrder = -10;
    this.scene.add(this._backgroundMesh);

    this._textMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `,
      fragmentShader: poemTextFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        map: { value: this._textCanvas.poemTexture ?? this._textCanvas.texture },
        uTileRatio: { value: 1 },
        uTextRatio: { value: 1 },
        uQuadRatio: { value: 1 },
        uCursorPosition: { value: new THREE.Vector2(1000, 1000) },
        uCursorFactor: { value: 0 },
        uScrollProgress: { value: -0.06 },
        uUvScrollProgress: { value: 0 },
        uVisibleArea: { value: 1.25 },
        uFadeProgress: { value: 0 },
        uWriteProgress: { value: 0 },
        uClampFadeOverride: { value: 0 },
        uSharpUvs: { value: new THREE.Vector4() },
        uLowBlurUvs: { value: new THREE.Vector4() },
        uHighBlurUvs: { value: new THREE.Vector4() },
        uNoise: { value: noise },
        uFadeNoiseSize: { value: 0.07 },
      },
    });
    this._textMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this._textMaterial);
    this._textMesh.frustumCulled = false;
    this._textMesh.renderOrder = 1;
    this.scene.add(this._textMesh);

    this._layout(window.innerWidth, window.innerHeight);
    this._syncTextCanvas();
  }

  get isVisible(): boolean {
    return this._visible;
  }

  /** 原始 Poem show：文字 writeFadeIn 与 simulation 背景 fadeIn 同时开始。 */
  show(): gsap.core.Timeline {
    this._timeline?.kill();
    this._visible = true;
    // .xp-fulltext 位于可滚动的体验区内；进入 Poem 时重新读取 rect，
    // 让当前滚动位置仍能按原始 TextMesh 的 CSS→UI 相机换算定位。
    this._layout(window.innerWidth, window.innerHeight);
    this._syncTextCanvas();
    const backgroundAlpha = this._backgroundMaterial.uniforms.uSimulationAlpha;
    const text = this._textMaterial.uniforms;
    const timeline = gsap.timeline();
    timeline.fromTo(backgroundAlpha, { value: 0 }, { value: 1, duration: 4, ease: "linear" }, 0);
    timeline.fromTo(text.uWriteProgress, { value: 0.7 }, { value: 0, duration: 1, ease: "power1.out" }, 0);
    timeline.set(text.uFadeProgress, { value: 0 }, 0);
    timeline.set(text.uClampFadeOverride, { value: 0 }, 0);
    this._timeline = timeline;
    return timeline;
  }

  /** 原始 Poem hide：保留场景渲染直到文字与背景完成收拢。 */
  hide(): gsap.core.Timeline {
    this._timeline?.kill();
    const text = this._textMaterial.uniforms;
    const timeline = gsap.timeline({
      onComplete: () => {
        this._visible = false;
        this._timeline = null;
      },
    });
    timeline.to(text.uFadeProgress, { value: 0.97, duration: 1, ease: "none" }, 0);
    timeline.to(this._backgroundMaterial.uniforms.uSimulationAlpha, { value: 0, duration: 3.5, ease: "none" }, 0);
    this._timeline = timeline;
    return timeline;
  }

  reset(): void {
    this._timeline?.kill();
    this._timeline = null;
    this._visible = false;
    const text = this._textMaterial.uniforms;
    text.uFadeProgress.value = 0;
    text.uWriteProgress.value = 0;
    text.uClampFadeOverride.value = 0;
    this._backgroundMaterial.uniforms.uSimulationAlpha.value = 0;
  }

  /** 每帧同步 Full Screen simulation 与原始 TextMesh 的滚动窗口。 */
  update(_time: number, scrollProgress: number): void {
    this._backgroundMaterial.uniforms.uSimulation.value = this._simulation.texture;
    this._backgroundMaterial.uniforms.uSimulationRemap.value = this._simulation.fullPaintRegionRemap();
    this._syncTextCanvas();
    this._textMaterial.uniforms.uScrollProgress.value = scrollProgress - 0.06;
    this._textMaterial.uniforms.uUvScrollProgress.value =
      (scrollProgress * this._textCanvas.poemCanvasPixelHeight) / Math.max(this._elementRect.height, 1);
  }

  resize(width: number, height: number, _renderWidth = width, _renderHeight = height): void {
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this._layout(width, height);
    this._syncTextCanvas();
  }

  private _layout(width: number, height: number): void {
    const element = document.querySelector<HTMLElement>(".xp-fulltext");
    const rect = element?.getBoundingClientRect();
    this._elementRect = {
      left: rect?.left ?? width * 0.26,
      top: rect?.top ?? 0,
      width: rect?.width || width * 0.42,
      height: rect?.height || height,
    };

    const textWidth = this._elementRect.width + 200;
    this._textMesh.position.set(
      -(width - this._elementRect.width) / 2 + this._elementRect.left,
      (height - this._elementRect.height) / 2 - this._elementRect.top - window.scrollY,
      0,
    );
    this._textMesh.scale.set(textWidth, this._elementRect.height, 1);
    this._textMaterial.uniforms.uQuadRatio.value = textWidth / Math.max(this._elementRect.height, 1);
    this._textMaterial.uniforms.uTextRatio.value = this._elementRect.width / Math.max(this._elementRect.height, 1);
  }

  private _syncTextCanvas(): void {
    const texture = this._textCanvas.poemTexture ?? this._textCanvas.texture;
    if (texture) this._textMaterial.uniforms.map.value = texture;
    const boxes = this._textCanvas.poemUvBoxes;
    if (boxes.length >= 3) {
      const setBox = (target: THREE.Vector4, box: { min: THREE.Vector2; max: THREE.Vector2 }) =>
        target.set(box.min.x, box.min.y, box.max.x, box.max.y);
      setBox(this._textMaterial.uniforms.uSharpUvs.value, boxes[0]);
      setBox(this._textMaterial.uniforms.uLowBlurUvs.value, boxes[1]);
      setBox(this._textMaterial.uniforms.uHighBlurUvs.value, boxes[2]);
    }
    this._textMaterial.uniforms.uTileRatio.value =
      this._textCanvas.poemTileRatio;
  }
}
