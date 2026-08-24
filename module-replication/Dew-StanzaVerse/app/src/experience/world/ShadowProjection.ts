import * as THREE from "three";
import { resources } from "../../core/Resources";
import { shadowFragmentShader, shadowVertexShader } from "../../shaders/shadow";
import { GLSL_FOG, GLSL_UTILS } from "../../shaders/chunks";
import type { ShadowProjectionPipeline } from "../types";

export interface ShadowSource {
  paperIndex: number;
  matrix: THREE.Matrix4;
  sdfAtlasRemap: THREE.Vector4;
  sdfScale: THREE.Vector2;
  sdfOriginSize: THREE.Vector2;
  sdfPlaneSize: THREE.Vector2;
  alpha: number;
}

export class ShadowProjection implements ShadowProjectionPipeline {
  private _scene = new THREE.Scene();
  private _mesh: THREE.InstancedMesh | null = null;
  private _sources: ShadowSource[] = [];
  private _target: THREE.WebGLRenderTarget;
  private _compositeScene = new THREE.Scene();
  private _compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private _compositeMaterial: THREE.ShaderMaterial;
  private _compositeTime = 0;
  private _compositeFog = new THREE.Vector2();

  constructor() {
    this._target = this._createTarget(window.innerWidth, window.innerHeight);
    const material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying float vFogDepth;
        uniform mat4 uProjectionInverse;
        uniform mat4 uViewMatrixInv;
        uniform mat4 uViewMatrix;

        vec3 worldPosFromDepth(float depth) {
          float z = depth * 2.0 - 1.0;
          vec4 clipSpacePosition = vec4(vUv * 2.0 - 1.0, z, 1.0);
          vec4 viewSpacePosition = uProjectionInverse * clipSpacePosition;
          viewSpacePosition /= viewSpacePosition.w;
          vec4 worldSpacePosition = uViewMatrixInv * viewSpacePosition;
          return worldSpacePosition.xyz;
        }

        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Background is authored as a 2x2 plane at world z=0. Its fog
          // depth comes from that plane in the main camera view, while the
          // fog noise position is reconstructed from the far clip point,
          // matching the source Background vertex contract.
          vFogDepth = -(uViewMatrix * vec4(position, 1.0)).z;
          vWorldPosition = worldPosFromDepth(1.0);
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        ${GLSL_UTILS}
        ${GLSL_FOG}
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying float vFogDepth;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform vec2 uFogState;
        uniform sampler2D tNoiseTexture;
        uniform vec3 uGroundColor;
        uniform vec3 uSkyColor;
        uniform vec2 uProgressRemap;
        float sineInOut(float t){return -0.5*(cos(3.141592653589793*t)-1.0);}
        void main(){
          vec2 screenUv=gl_FragCoord.xy/uResolution;
          float base=cremap(screenUv.y,uProgressRemap.x,uProgressRemap.y,0.0,1.0);
          float progress=sineInOut(1.0-abs((base-0.5)*2.0));
          vec3 color=mix(uGroundColor,uSkyColor,progress);
          vec2 specular=(screenUv-vec2(1.2,0.7))/vec2(0.82,0.67);
          specular.x*=uResolution.x/uResolution.y;
          float light=sineInOut(1.0-min(length(specular),1.0))*0.18;
          color+=light;
          color=getFogColorWithRatio(uTime,vFogDepth,screenUv,uResolution,vWorldPosition,color,tNoiseTexture,uFogState.x,uFogState.y);
          gl_FragColor=linearToSrgb(vec4(color,1.0));
        }
      `,
      uniforms: {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uProjectionInverse: { value: new THREE.Matrix4() },
        uViewMatrixInv: { value: new THREE.Matrix4() },
        uViewMatrix: { value: new THREE.Matrix4() },
        uTime: { value: 0 },
        uFogState: { value: this._compositeFog },
        tNoiseTexture: { value: null },
        uGroundColor: { value: new THREE.Color("#b4b4b4") },
        uSkyColor: { value: new THREE.Color("#e4e4e4") },
        uProgressRemap: { value: new THREE.Vector2(0.5, 1) },
      },
    });
    this._compositeMaterial = material;
    this._compositeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._compositeMaterial));
  }

  get texture(): THREE.Texture { return this._target.texture; }

  init(sources: ShadowSource[]): void {
    this._sources = sources;
    const fogNoise = resources.get<THREE.Texture>("noise/rgb-fractal");
    fogNoise.wrapS = fogNoise.wrapT = THREE.RepeatWrapping;
    this._compositeMaterial.uniforms.tNoiseTexture.value = fogNoise;
    const plane = new THREE.PlaneGeometry(1, 1, 5, 5);
    plane.translate(0, -0.5, 0);
    plane.rotateX(Math.PI);
    plane.rotateY(Math.PI * 0.5);
    const geometry = new THREE.InstancedBufferGeometry().copy(plane);
    geometry.setAttribute("aSdfAtlasRemap", new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfAtlasRemap.toArray())), 4));
    geometry.setAttribute("aSdfScale", new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfScale.toArray())), 2));
    geometry.setAttribute("aSdfOriginSize", new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfOriginSize.toArray())), 2));
    geometry.setAttribute("aSdfPlaneSize", new THREE.InstancedBufferAttribute(new Float32Array(sources.flatMap((source) => source.sdfPlaneSize.toArray())), 2));
    geometry.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(new Float32Array(sources.map((source) => source.alpha)), 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.ShaderMaterial({
      vertexShader: shadowVertexShader,
      fragmentShader: shadowFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uSdfTexture: { value: resources.get<THREE.Texture>("atlas/sdf") },
        // Source directional light: target(0, 0, 90.3) - position(-1.16, .41, -.34) * 300.
        uLightDirection: { value: new THREE.Vector3(348, -123, 192.3).normalize() },
        uNoise: { value: 0 },
        uShadowSpread: { value: 3 },
        uShadowAttenuation: { value: 15 },
        uShadowSkew: { value: 0.4 },
      },
    });
    this._mesh = new THREE.InstancedMesh(geometry, material, sources.length);
    this._mesh.frustumCulled = false;
    sources.forEach((source, index) => this._mesh!.setMatrixAt(index, source.matrix));
    this._mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._scene.add(this._mesh);
  }

  updateSource(paperIndex: number, matrix: THREE.Matrix4, alpha: number): void {
    const index = this._sources.findIndex((source) => source.paperIndex === paperIndex);
    if (index < 0 || !this._mesh) return;
    this._sources[index].matrix.copy(matrix);
    this._sources[index].alpha = alpha;
    this._mesh.setMatrixAt(index, matrix);
    const attribute = this._mesh.geometry.getAttribute("aAlpha") as THREE.InstancedBufferAttribute;
    attribute.setX(index, alpha);
    attribute.needsUpdate = true;
    this._mesh.instanceMatrix.needsUpdate = true;
  }

  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
    if (!this._mesh) return;
    const previous = renderer.getRenderTarget();
    const color = renderer.getClearColor(new THREE.Color()).clone();
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this._target);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear(true, false, false);
    renderer.render(this._scene, camera);
    renderer.setRenderTarget(previous);
    renderer.setClearColor(color, alpha);
  }

  renderComposite(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    time: number,
    fogState: { opaque: number; occulted: number },
  ): void {
    camera.updateMatrixWorld();
    this._compositeTime = time;
    this._compositeFog.set(fogState.opaque, fogState.occulted);
    const uniforms = this._compositeMaterial.uniforms;
    uniforms.uTime.value = this._compositeTime;
    (uniforms.uFogState.value as THREE.Vector2).copy(this._compositeFog);
    (uniforms.uProjectionInverse.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (uniforms.uViewMatrixInv.value as THREE.Matrix4).copy(camera.matrixWorld);
    (uniforms.uViewMatrix.value as THREE.Matrix4).copy(camera.matrixWorldInverse);
    renderer.render(this._compositeScene, this._compositeCamera);
  }

  resize(width: number, height: number): void {
    // The source resize contract passes renderer drawing-buffer dimensions,
    // not CSS layout dimensions. WebGL gl_FragCoord and this target must share
    // that same physical pixel space on DPR>1 screens.
    this._target.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
    this._compositeMaterial.uniforms.uResolution.value.set(width, height);
  }

  reset(): void {
    this._sources.forEach((source) => { source.alpha = 0; });
    if (this._mesh) {
      const attribute = this._mesh.geometry.getAttribute("aAlpha") as THREE.InstancedBufferAttribute;
      this._sources.forEach((source, index) => attribute.setX(index, source.alpha));
      attribute.needsUpdate = true;
    }
  }

  private _createTarget(width: number, height: number): THREE.WebGLRenderTarget {
    const target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
    });
    target.texture.name = "source-shadow-projection";
    return target;
  }
}
