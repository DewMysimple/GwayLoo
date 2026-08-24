import * as THREE from "three";
import { resources } from "../../core/Resources";
import { globalGroundFragmentShader, globalGroundVertexShader } from "../../shaders/globalGround";

type Uniform = { value: unknown };

/**
 * Source global Ground component.
 *
 * Background remains a separate full-screen pass; this plane owns the source
 * ground lighting and projected-shadow subtraction.
 */
export class GlobalGroundLayer {
  readonly group = new THREE.Group();

  private _mesh: THREE.Mesh | null = null;
  private _material: THREE.ShaderMaterial | null = null;
  private _renderWidth = window.innerWidth;
  private _renderHeight = window.innerHeight;

  constructor() {
    this.group.name = "SourceGlobalGroundLayer";
  }

  get mesh(): THREE.Mesh | null {
    return this._mesh;
  }

  get material(): THREE.ShaderMaterial | null {
    return this._material;
  }

  init(
    sourceGround: THREE.Object3D,
    backgroundUniform: Uniform,
    lightingUniform: Uniform,
    shadowMap: THREE.Texture,
  ): void {
    const noiseTexture = resources.get<THREE.Texture>("noise/rgb-fractal");
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.ShaderMaterial({
      vertexShader: globalGroundVertexShader,
      fragmentShader: globalGroundFragmentShader,
      transparent: true,
      uniforms: {
        uShadowMap: { value: shadowMap },
        uShadowStrength: { value: 0.9 },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(this._renderWidth, this._renderHeight) },
        tNoiseTexture: { value: noiseTexture },
        uFogState: { value: new THREE.Vector2() },
        // These are shared with the source-derived Background/Paper uniforms
        // so debug/config changes affect both source consumers together.
        uBackground: backgroundUniform,
        uLighting: lightingUniform,
      },
    });

    const geometry = new THREE.PlaneGeometry(2000, 2000, 1, 1);
    geometry.rotateX(-0.5 * Math.PI);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -3;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    sourceGround.getWorldPosition(mesh.position);
    sourceGround.getWorldScale(mesh.scale);
    sourceGround.getWorldQuaternion(mesh.quaternion);

    this._material = material;
    this._mesh = mesh;
    this.group.add(mesh);
  }

  update(time: number, fogState: { opaque: number; occulted: number }): void {
    if (!this._material) return;
    this._material.uniforms.uTime.value = time;
    (this._material.uniforms.uFogState.value as THREE.Vector2).set(fogState.opaque, fogState.occulted);
  }

  resize(renderWidth: number, renderHeight: number): void {
    this._renderWidth = renderWidth;
    this._renderHeight = renderHeight;
    (this._material?.uniforms.uResolution.value as THREE.Vector2 | undefined)?.set(renderWidth, renderHeight);
  }
}
