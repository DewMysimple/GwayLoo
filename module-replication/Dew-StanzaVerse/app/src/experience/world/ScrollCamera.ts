/**
 * 滚动相机。
 * 原站把约克郡山谷场景中的相机运动烘焙进了 scene.glb 的
 * `Camera_Action_Baked` 动画（59.77 秒，仅 translation + rotation 两条轨道），
 * 滚动进度直接采样这条动画曲线 —— 这是"滚动即长镜头"的关键手法。
 *
 * 复刻版用 AnimationMixer 在暂停状态下按时间采样，再把动画节点的
 * 世界变换拷贝给渲染相机。
 */
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { DeviceKind } from "../definition";

// The source force values are retained below, but the delivery page keeps
// the effective parallax inside a small central NDC window. With this narrow
// FOV, applying the raw full-viewport NDC at an edge moves the composition
// farther than the accepted page framing even though the source camera math
// is otherwise correct.
const POINTER_NDC_LIMIT = 0.2;

export class ScrollCamera {
  camera!: THREE.PerspectiveCamera; // 在 init() 中创建

  private _mixer: THREE.AnimationMixer | null = null;
  private _action: THREE.AnimationAction | null = null;
  /** Source hierarchy: the baked clip animates this parent; pointer motion
   * only rotates the child camera in its local space. */
  private _container: THREE.Object3D | null = null;
  private _duration = 0;
  private _pointerTarget = new THREE.Vector2();
  private _pointerCurrent = new THREE.Vector2();
  private _pointerEuler = new THREE.Euler();
  private _pointerQuaternion = new THREE.Quaternion();
  private _reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  private _device: DeviceKind;
  private readonly _entryDuration = 5;
  private readonly _pointerForceX = 2.55;
  private readonly _pointerForceY = 9.2;
  private readonly _pointerDamping = 0.3;

  constructor(device: DeviceKind = "desktop") {
    this._device = device;
  }

  /** 从 GLTF 场景初始化（gltf.scene 会被整体放进水彩场景） */
  init(gltf: GLTF): void {
    // The original creates a new container + render camera. Its baked tracks
    // are named after Camera_Animation_Baked; Three's PropertyBinding falls
    // back to the mixer root when that node is not under the new container,
    // so the translation/quaternion tracks animate this container itself.
    const gltfCamera = gltf.cameras[0] as THREE.PerspectiveCamera | undefined;
    const fov = gltfCamera ? gltfCamera.fov : 20.1;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      gltfCamera?.near ?? 0.1,
      gltfCamera?.far ?? 3200,
    );
    this._container = new THREE.Object3D();
    this._container.add(this.camera);
    gltf.scene.add(this._container);

    const clip = gltf.animations.find((a) => a.name === "Camera_Action_Baked") ?? gltf.animations[0];
    if (clip) {
      this._duration = clip.duration;
      this._mixer = new THREE.AnimationMixer(this._container);
      this._action = this._mixer.clipAction(clip);
      this._action.play();
      this._mixer.setTime(0);
    }
  }

  get duration(): number {
    return this._duration;
  }

  getDebugState(): {
    duration: number;
    entryDuration: number;
    pointerForceX: number;
    pointerForceY: number;
    pointerDamping: number;
    pointerNdcLimit: number;
    touchParallaxDisabled: boolean;
  } {
    return {
      duration: this._duration,
      entryDuration: this._entryDuration,
      pointerForceX: this._pointerForceX,
      pointerForceY: this._pointerForceY,
      pointerDamping: this._pointerDamping,
      pointerNdcLimit: POINTER_NDC_LIMIT,
      touchParallaxDisabled: this._touchParallaxDisabled(),
    };
  }

  private _touchParallaxDisabled(): boolean {
    return this._device === "mobile"
      || window.matchMedia("(pointer: coarse)").matches;
  }

  setPointer(clientX: number, clientY: number): void {
    this._pointerTarget.set(
      THREE.MathUtils.clamp((clientX / window.innerWidth) * 2 - 1, -POINTER_NDC_LIMIT, POINTER_NDC_LIMIT),
      THREE.MathUtils.clamp(1 - (clientY / window.innerHeight) * 2, -POINTER_NDC_LIMIT, POINTER_NDC_LIMIT),
    );
  }

  /** 按动画时间采样，并叠加原站开场镜头与轻量鼠标视差。 */
  update(time: number, delta: number, cameraTime: number): void {
    if (!this._mixer || !this._container) return;
    // Match the source update loop: assign the baked action time and flush
    // the mixer with a zero delta before applying local camera animation.
    this._action!.time = Math.min(Math.max(cameraTime, 0), this._duration - 0.001);
    this._mixer.update(0);

    // Source `loaderAnimation` is a five-second sine.out track on the
    // camera instance. Reduced motion keeps the final camera pose without
    // spending five seconds moving the scene into place.
    const entryLinear = this._reducedMotion ? 1 : Math.min(Math.max(time / this._entryDuration, 0), 1);
    const entry = Math.sin(entryLinear * Math.PI * 0.5);
    this.camera.position.set(
      THREE.MathUtils.lerp(0.25, 0, entry),
      0,
      THREE.MathUtils.lerp(-0.85, 0.4, entry),
    );

    if (!this._reducedMotion && !this._touchParallaxDisabled()) {
      // Source maps pointer NDC to degrees (x/y intentionally use different
      // forces), then approaches the target with coefRotate = 0.3.
      const alpha = 1 - Math.exp(-this._pointerDamping * Math.max(delta, 0));
      this._pointerCurrent.lerp(this._pointerTarget, alpha);
      this._pointerEuler.set(
        THREE.MathUtils.degToRad(this._pointerCurrent.y * this._pointerForceX),
        THREE.MathUtils.lerp(-0.037 * Math.PI, 0, entry)
          + THREE.MathUtils.degToRad(-this._pointerCurrent.x * this._pointerForceY),
        0,
        "XYZ",
      );
      this._pointerQuaternion.setFromEuler(this._pointerEuler);
      this.camera.quaternion.copy(this._pointerQuaternion);
    } else {
      this.camera.rotation.set(0, THREE.MathUtils.lerp(-0.037 * Math.PI, 0, entry), 0);
    }
    this._container.updateMatrixWorld(true);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
