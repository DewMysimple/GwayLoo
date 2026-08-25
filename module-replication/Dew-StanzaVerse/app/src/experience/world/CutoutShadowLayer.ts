import * as THREE from "three";
import gsap from "gsap";
import { resources } from "../../core/Resources";
import { cutoutShadowFragmentShader, cutoutShadowVertexShader } from "../../shaders/cutoutShadow";

export interface CutoutShadowSource {
  paperIndex: number;
  matrix: THREE.Matrix4;
  sdfAtlasRemap: THREE.Vector4;
  sdfScale: THREE.Vector2;
  sdfOriginSize: THREE.Vector2;
  sdfPlaneSize: THREE.Vector2;
}

interface AlphaState {
  value: number;
}

/** Source `Cutouts`: the SDF cutout shadow consumes the projected shadow map. */
export class CutoutShadowLayer {
  readonly group = new THREE.Group();

  private _mesh: THREE.InstancedMesh | null = null;
  private _material: THREE.ShaderMaterial | null = null;
  private _sources: CutoutShadowSource[] = [];
  private _alphaStates: AlphaState[] = [];
  private _alphaAttribute: THREE.InstancedBufferAttribute | null = null;
  private _renderWidth = window.innerWidth;
  private _renderHeight = window.innerHeight;

  constructor() {
    this.group.name = "SourceCutoutShadowLayer";
  }

  get sources(): CutoutShadowSource[] {
    return this._sources;
  }

  get mesh(): THREE.InstancedMesh | null {
    return this._mesh;
  }

  init(sources: CutoutShadowSource[], shadowMap: THREE.Texture): void {
    this._sources = sources;
    this._alphaStates = sources.map(() => ({ value: 0 }));
    if (!sources.length) return;

    const sdfTexture = resources.get<THREE.Texture>("atlas/sdf");
    const fogNoise = resources.get<THREE.Texture>("noise/rgb-fractal");
    fogNoise.wrapS = fogNoise.wrapT = THREE.RepeatWrapping;

    const sourcePlane = new THREE.PlaneGeometry(1, 1, 1, 1);
    sourcePlane.computeTangents();
    sourcePlane.computeVertexNormals();
    sourcePlane.translate(0, -0.5, 0);
    const geometry = new THREE.InstancedBufferGeometry().copy(sourcePlane);
    sourcePlane.dispose();

    geometry.setAttribute(
      "aSdfAtlasRemap",
      new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfAtlasRemap.toArray())), 4),
    );
    geometry.setAttribute(
      "aSdfScale",
      new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfScale.toArray())), 2),
    );
    geometry.setAttribute(
      "aSdfOriginSize",
      new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfOriginSize.toArray())), 2),
    );
    geometry.setAttribute(
      "aSdfPlaneSize",
      new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfPlaneSize.toArray())), 2),
    );
    this._alphaAttribute = new THREE.InstancedBufferAttribute(new Float32Array(sources.length), 1)
      .setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aAlpha", this._alphaAttribute);

    this._material = new THREE.ShaderMaterial({
      vertexShader: cutoutShadowVertexShader,
      fragmentShader: cutoutShadowFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSdfTexture: { value: sdfTexture },
        uShadowMap: { value: shadowMap },
        uLightColor: { value: new THREE.Color("#ececec") },
        uShadowColor: { value: new THREE.Color("#b6b6b6") },
        uDepth: { value: 0.03 },
        uShadowSize: { value: 0.5 },
        uCutoutShadowIntensity: { value: 0.4 },
        uPaperShadowIntensity: { value: 1.7 },
        uNoise: { value: 0.005 },
        uResolution: { value: new THREE.Vector2(this._renderWidth, this._renderHeight) },
        uTime: { value: 0 },
        tNoiseTexture: { value: fogNoise },
        uFogState: { value: new THREE.Vector2() },
      },
    });

    this._mesh = new THREE.InstancedMesh(geometry, this._material, sources.length);
    this._mesh.frustumCulled = false;
    this._mesh.renderOrder = -1;
    sources.forEach((source, index) => this._mesh!.setMatrixAt(index, source.matrix));
    this._mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this._mesh);
  }

  show(paperIndex: number): void {
    const index = this._sources.findIndex((source) => source.paperIndex === paperIndex);
    if (index < 0) return;
    const state = this._alphaStates[index];
    gsap.killTweensOf(state);
    gsap.fromTo(state, { value: 0 }, { value: 1, duration: 0.4, ease: "sine.inOut" });
  }

  /** Source Cutouts.hideAll(): fade every active SDF cutout in parallel. */
  hideAll(duration = 0.5): gsap.core.Timeline {
    const timeline = gsap.timeline();
    this._alphaStates.forEach((state) => {
      gsap.killTweensOf(state);
      timeline.to(state, { value: 0, duration, ease: "sine.inOut" }, 0);
    });
    return timeline;
  }

  update(time: number, fogState: { opaque: number; occulted: number }): void {
    if (!this._material || !this._alphaAttribute) return;
    this._material.uniforms.uTime.value = time;
    (this._material.uniforms.uFogState.value as THREE.Vector2).set(fogState.opaque, fogState.occulted);
    this._alphaStates.forEach((state, index) => this._alphaAttribute!.setX(index, state.value));
    this._alphaAttribute.needsUpdate = true;
  }

  resize(renderWidth: number, renderHeight: number): void {
    this._renderWidth = renderWidth;
    this._renderHeight = renderHeight;
    (this._material?.uniforms.uResolution.value as THREE.Vector2 | undefined)?.set(renderWidth, renderHeight);
  }

  reset(): void {
    this._alphaStates.forEach((state) => {
      gsap.killTweensOf(state);
      state.value = 0;
    });
    if (this._alphaAttribute) {
      (this._alphaAttribute.array as Float32Array).fill(0);
    }
    if (this._alphaAttribute) this._alphaAttribute.needsUpdate = true;
  }
}
