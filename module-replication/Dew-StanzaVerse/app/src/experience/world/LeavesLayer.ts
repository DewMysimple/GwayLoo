/**
 * 源码树叶层的独立实现。
 *
 * 原站不是每张纸各挂一组 Points，而是一个全局 1024-instance renderer：
 * 每次鼠标命中画面时，把一个实例矩阵写到命中点；speed / angle / lifetime
 * 由 32×32 position pass 保存，顶点着色器再把它展开成飘落叶片。
 */
import * as THREE from "three";
import { resources } from "../../core/Resources";
import { IS_MOBILE } from "../../config/assets";
import type { PaperConfig } from "../../config/papers";
import type { RaycastHit } from "../types";
import {
  leavesFragmentShader,
  leavesPositionFragmentShader,
  leavesPositionVertexShader,
  leavesVertexShader,
} from "../../shaders/world";

const PARTICLE_COUNT = 1024;
const PASS_SIZE = 32;
const PARTICLE_QUEUE_DELAY = 0.02;

interface LeavesIntersection {
  point: THREE.Vector3;
  paperIndex: number;
  uvX: number;
}

export class LeavesLayer {
  readonly count = PARTICLE_COUNT;
  readonly passSize = PASS_SIZE;
  readonly enabled = !IS_MOBILE;

  private _scene: THREE.Scene;
  private _papers: PaperConfig[];
  private _mesh: THREE.InstancedMesh | null = null;
  private _material: THREE.ShaderMaterial | null = null;
  private _positionScene: THREE.Scene | null = null;
  private _positionMaterial: THREE.ShaderMaterial | null = null;
  private _positionTargets: THREE.WebGLRenderTarget[] = [];
  private _baseTexture: THREE.DataTexture | null = null;
  private _inputTexture: THREE.Texture | null = null;
  private _targetIndex = 0;
  private _intersection: LeavesIntersection | null = null;
  private _velocity = new THREE.Vector2();
  private _mouseMoving = false;
  private _queueTime = 0;
  private _lastIndex = -1;
  private _time = 0;
  private _colors = new Map<number, THREE.Color>();

  constructor(scene: THREE.Scene, papers: PaperConfig[]) {
    this._scene = scene;
    this._papers = papers;
    if (!this.enabled) return;
    this._createPositionPass();
    this._createParticles();
  }

  setPaintInfosIntersection(
    hit: RaycastHit | null,
    ndcVelocity = new THREE.Vector2(),
    moving = false,
  ): void {
    if (!hit) {
      this._intersection = null;
      this._mouseMoving = false;
      return;
    }
    this._intersection = {
      point: hit.point.clone(),
      paperIndex: hit.paperIndex,
      uvX: hit.uv.x,
    };
    this._updateTint(hit.paperIndex);
    // F3 computes previousMouse - currentMouse. PaintManager supplies the
    // equivalent damped current - previous delta, so invert it here.
    this._velocity.copy(ndcVelocity).negate();
    this._mouseMoving = moving;
  }

  update(
    time: number,
    delta: number,
    fogState: { opaque: number; occulted: number },
    renderer: THREE.WebGLRenderer,
  ): void {
    if (!this.enabled || !this._material || !this._positionMaterial) return;
    const frameDelta = THREE.MathUtils.clamp(delta, 0, 0.1);
    this._time = time;
    this._material.uniforms.uTime.value = time;
    (this._material.uniforms.uFogState.value as THREE.Vector2).set(fogState.opaque, fogState.occulted);

    if (this._intersection && this._mouseMoving) {
      this._queueTime += frameDelta;
      if (this._queueTime >= PARTICLE_QUEUE_DELAY) {
        this._queueTime = 0;
        this._addParticle(this._intersection);
      }
    }

    this._stepPositionPass(renderer, frameDelta);
  }

  resize(renderWidth: number, renderHeight: number): void {
    const resolution = this._material?.uniforms.uResolution.value as THREE.Vector2 | undefined;
    resolution?.set(renderWidth, renderHeight);
  }

  reset(): void {
    this._intersection = null;
    this._mouseMoving = false;
    this._queueTime = 0;
    this._lastIndex = -1;
    if (!this._mesh) return;
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let index = 0; index < this.count; index++) this._mesh.setMatrixAt(index, hidden);
    this._mesh.instanceMatrix.needsUpdate = true;
  }

  getDebugState(): {
    enabled: boolean;
    count: number;
    passSize: number;
    hasPositionPass: boolean;
    activePaperIndex: number | null;
    lastIndex: number;
  } {
    return {
      enabled: this.enabled,
      count: this.count,
      passSize: this.passSize,
      hasPositionPass: Boolean(this._positionMaterial && this._positionTargets.length === 2),
      activePaperIndex: this._intersection?.paperIndex ?? null,
      lastIndex: this._lastIndex,
    };
  }

  private _createPositionPass(): void {
    const baseData = new Float32Array(this.passSize * this.passSize * 4);
    for (let index = 0; index < this.passSize * this.passSize; index++) {
      baseData[index * 4] = 0;
      baseData[index * 4 + 1] = 0;
      baseData[index * 4 + 2] = 1;
      baseData[index * 4 + 3] = Math.random() + 0.5;
    }
    this._baseTexture = new THREE.DataTexture(
      baseData,
      this.passSize,
      this.passSize,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    this._baseTexture.needsUpdate = true;
    this._baseTexture.name = "source-leaves-base-state";
    this._inputTexture = this._baseTexture;

    const targetOptions: THREE.WebGLRenderTargetOptions = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    };
    this._positionTargets = [
      new THREE.WebGLRenderTarget(this.passSize, this.passSize, targetOptions),
      new THREE.WebGLRenderTarget(this.passSize, this.passSize, targetOptions),
    ];
    this._positionTargets[0].texture.name = "source-leaves-position-a";
    this._positionTargets[1].texture.name = "source-leaves-position-b";

    this._positionMaterial = new THREE.ShaderMaterial({
      vertexShader: leavesPositionVertexShader,
      fragmentShader: leavesPositionFragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uDelta: { value: 0 },
        uSize: { value: this.passSize },
        uCurrentIndex: { value: -1 },
        uAngle: { value: 0 },
        uVelocity: { value: 0 },
        uMaxForce: { value: 0.0045 },
        uInputTexture: { value: this._inputTexture },
        uBaseTexture: { value: this._baseTexture },
      },
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this._positionMaterial);
    this._positionScene = new THREE.Scene();
    this._positionScene.add(plane);
  }

  private _createParticles(): void {
    const sourcePlane = new THREE.PlaneGeometry(0.5, 0.5, 1, 1);
    sourcePlane.rotateY(-0.5 * Math.PI);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.copy(sourcePlane);
    geometry.instanceCount = this.count;

    const indices = new Float32Array(this.count);
    const randomScale = new Float32Array(this.count);
    const randomTexture = new Float32Array(this.count);
    const randomRotate = new Float32Array(this.count * 3);
    for (let index = 0; index < this.count; index++) {
      indices[index] = index;
      randomScale[index] = Math.random() + 0.75;
      randomTexture[index] = Math.trunc(5 * Math.random()) / 5;
      randomRotate[index * 3] = Math.random() * Math.PI * 2;
      randomRotate[index * 3 + 1] = Math.random() * Math.PI * 2;
      randomRotate[index * 3 + 2] = Math.random() * Math.PI * 2;
    }
    geometry.setAttribute("aIndices", new THREE.InstancedBufferAttribute(indices, 1));
    geometry.setAttribute("aRandomScale", new THREE.InstancedBufferAttribute(randomScale, 1));
    geometry.setAttribute("aRandomTexture", new THREE.InstancedBufferAttribute(randomTexture, 1));
    geometry.setAttribute("aRandomRotate", new THREE.InstancedBufferAttribute(randomRotate, 3));

    const noiseTexture = resources.get<THREE.Texture>("noise/rgb-fractal");
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
    const leafTexture = resources.get<THREE.Texture>("leave/texture");
    const material = new THREE.ShaderMaterial({
      vertexShader: leavesVertexShader,
      fragmentShader: leavesFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        tNoiseTexture: { value: noiseTexture },
        uSize: { value: this.passSize },
        uParticleSize: { value: 1 },
        uAmplitude: { value: 2 },
        uDuration: { value: 1.04 },
        uRotationSpeed: { value: 2.5 },
        uMovementForce: { value: 10 },
        uLifeTime: { value: 35 },
        uSpeedReveal: { value: 52.5 },
        uTintColor: { value: new THREE.Color("#000000") },
        uPass1Texture: { value: this._inputTexture },
        uTexture: { value: leafTexture },
        uFogState: { value: new THREE.Vector2() },
      },
    });
    const mesh = new THREE.InstancedMesh(geometry, material, this.count);
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let index = 0; index < this.count; index++) mesh.setMatrixAt(index, hidden);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    this._material = material;
    this._mesh = mesh;
    this._scene.add(mesh);
  }

  private _addParticle(intersection: LeavesIntersection): void {
    const config = this._papers[intersection.paperIndex];
    if (intersection.uvX <= 0 || !config?.leaves || !this._mesh || !this._positionMaterial || !this._material) return;
    this._lastIndex = (this._lastIndex + 1) % this.count;
    const object = new THREE.Object3D();
    object.position.set(intersection.point.x - 0.2, intersection.point.y, intersection.point.z);
    object.scale.setScalar(config.leaves.size);
    object.updateMatrix();
    this._mesh.setMatrixAt(this._lastIndex, object.matrix);
    this._mesh.instanceMatrix.needsUpdate = true;

    this._updateTint(intersection.paperIndex);
    this._positionMaterial.uniforms.uCurrentIndex.value = this._lastIndex;
    this._positionMaterial.uniforms.uVelocity.value = this._velocity.length();
    this._positionMaterial.uniforms.uAngle.value = this._velocity.angle();
  }

  private _updateTint(paperIndex: number): void {
    const leaves = this._papers[paperIndex]?.leaves;
    if (!leaves || !this._material) return;
    const color = this._colors.get(paperIndex) ?? new THREE.Color(leaves.color);
    this._colors.set(paperIndex, color);
    (this._material.uniforms.uTintColor.value as THREE.Color).lerp(color, 0.1);
  }

  private _stepPositionPass(renderer: THREE.WebGLRenderer, delta: number): void {
    if (!this._positionScene || !this._positionMaterial || !this._inputTexture || !this._material) return;
    const target = this._positionTargets[this._targetIndex];
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    this._positionMaterial.uniforms.uTime.value = this._time;
    this._positionMaterial.uniforms.uDelta.value = delta;
    this._positionMaterial.uniforms.uInputTexture.value = this._inputTexture;
    renderer.autoClear = true;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this._positionScene, this._positionCamera);
    renderer.setRenderTarget(previousTarget);
    renderer.autoClear = previousAutoClear;

    this._inputTexture = target.texture;
    this._targetIndex = 1 - this._targetIndex;
    const material = this._material;
    material.uniforms.uPass1Texture.value = this._inputTexture;
    this._positionMaterial.uniforms.uCurrentIndex.value = -1;
  }

  private _positionCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}
