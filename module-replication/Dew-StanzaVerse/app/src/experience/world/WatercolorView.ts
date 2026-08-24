/**
 * 水彩主视图 —— 体验的核心场景。
 *
 * 组装内容（全部来自 scene.glb + 图集资源）：
 * - 26 个画纸元素：GLB 网格 + Paper 着色器（SDF 裁切 / 墨迹显现 / 流体混色 / LUT）
 * - 每个元素的地面块（hasGround）：地面着色器，绘画时渗色
 * - 世界大地面（GLB "Ground" 网格）：常驻
 * - 树叶粒子（带 leaves 配置的元素）
 * - 烘焙相机：滚动驱动的长镜头
 *
 * The meshes keep their original GLB hierarchy, while every source-derived
 * instance value (atlas/SDF/reveal/ground transform) is restored explicitly.
 */
import * as THREE from "three";
import gsap from "gsap";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resources } from "../../core/Resources";
import type { LutData } from "../../core/Resources";
import type { AtlasSdfEntry, AtlasTextureEntry } from "../../content/atlas";
import type { PaperConfig } from "../../content/papers";
import type {
  PaperGroundContract,
  PaperSdfContract,
  PaperShadowContract,
} from "../../content/paper-layers";
import { experienceDefinition, type ExperienceDefinition } from "../definition";
import { paperVertexShader, paperFragmentShader } from "../../shaders/paper";
import { groundVertexShader, groundFragmentShader } from "../../shaders/ground";
import { ScrollCamera } from "./ScrollCamera";
import { LeavesLayer } from "./LeavesLayer";
import type { FluidSimulation } from "../paint/FluidSimulation";
import { scrollController } from "../scroll/ScrollController";
import { createRevealConfig, getDebugOptions } from "./InkReveal";
import type { PaperInstanceConfig, RaycastHit, RenderPipeline, SimulationRegionInput } from "../types";
import { PaintingTitles } from "./PaintingTitles";
import { GrassLayer } from "./GrassLayer";
import { ShadowProjection } from "./ShadowProjection";
import { CutoutShadowLayer, type CutoutShadowSource } from "./CutoutShadowLayer";
import { GlobalGroundLayer } from "./GlobalGroundLayer";

interface PreparedPaper {
  index: number;
  config: PaperConfig;
  mesh: THREE.Mesh;
  sdfData: AtlasSdfEntry;
  texData: AtlasTextureEntry;
  reveal: ReturnType<typeof createRevealConfig>;
  matrix: THREE.Matrix4;
  simulationBox: THREE.Vector4;
  simulationRemap: THREE.Vector4;
  ground: PaperGroundContract;
  sdf: PaperSdfContract;
  shadow: PaperShadowContract;
}

interface PaperEntry {
  index: number;
  config: PaperConfig;
  /** Hidden GLB authoring mesh retained only for raycasting and transforms. */
  mesh: THREE.Mesh;
  transform: THREE.Object3D;
  state: { alpha: number; curve: number; reveal: number; rotationZ: number };
  revealed: boolean;
  tween: gsap.core.Timeline | null;
  ground: PaperGroundContract;
  sdf: PaperSdfContract;
  shadow: PaperShadowContract;
}

interface GroundEntry {
  paperName: string;
  paperIndex: number;
  size: THREE.Vector2;
  matrix: THREE.Matrix4;
  atlasRemap: THREE.Vector4;
  simulationBox: THREE.Vector4;
  simulationRemap: THREE.Vector4;
}

export class WatercolorView {
  scene = new THREE.Scene();
  scrollCamera = new ScrollCamera();
  paintingTitles: PaintingTitles;
  grassLayer = new GrassLayer();
  shadowProjection = new ShadowProjection();
  cutoutShadow = new CutoutShadowLayer();
  globalGround = new GlobalGroundLayer();

  readonly pipeline: RenderPipeline = {
    shadowProjection: true,
    ground: true,
    paper: true,
    vegetation: true,
    text: true,
    fogComposite: true,
  };

  readonly instanceConfigs: PaperInstanceConfig[] = [];

  /** 全部画纸材质（供 PaintManager 射线检测与 uniform 更新） */
  papers: PaperEntry[] = [];

  private _simulation: FluidSimulation | null = null;
  private _sdfMap: Map<string, AtlasSdfEntry>;
  private _texMap: Map<string, AtlasTextureEntry>;
  private _paperMesh: THREE.InstancedMesh | null = null;
  private _paperMaterial: THREE.ShaderMaterial | null = null;
  private _paperUniforms: Record<string, { value: unknown }> | null = null;
  private _leavesLayer: LeavesLayer | null = null;
  /** Source Grounds owns one instanced batch for all paper ground patches. */
  private _groundMaterial: THREE.ShaderMaterial | null = null;
  private _groundMesh: THREE.InstancedMesh | null = null;
  private _grounds: GroundEntry[] = [];
  private _groundStates: { uAlpha: number }[] = [];
  private _groundVisible: boolean[] = [];
  private _paperSimulationBoxes = new Map<number, THREE.Vector4>();
  private _groundSimulationBoxes = new Map<number, THREE.Vector4>();
  private _time = 0;

  private _definition: ExperienceDefinition;

  constructor(definition: ExperienceDefinition = experienceDefinition) {
    this._definition = definition;
    this._sdfMap = new Map(definition.world.atlas.sdfEntries);
    this._texMap = new Map(definition.world.atlas.textureEntries);
    this.paintingTitles = new PaintingTitles(definition.world.paperLayers.presentation, definition.copy.landscapeCta);
  }

  private get _papers(): readonly PaperConfig[] {
    return this._definition.world.papers;
  }

  private get _isMobile(): boolean {
    return this._definition.assets.device === "mobile";
  }

  private get _revealTiming() {
    return this._definition.world.revealTiming;
  }

  init(simulation: FluidSimulation): void {
    this._simulation = simulation;
    const gltf = resources.get<GLTF>("watercolor/scene");
    if (!gltf) {
      console.error("[WatercolorView] scene.glb 未加载");
      return;
    }

    this.scrollCamera.init(gltf);
    scrollController.setCameraDuration(this.scrollCamera.duration);
    this.scene.add(gltf.scene);
    this.paintingTitles.init(gltf);
    this.scene.add(this.paintingTitles.group);
    this.grassLayer.init();
    this.scene.add(this.grassLayer.group);
    // Source F3 owns one global particle renderer (1024 instances + 32×32
    // position pass), rather than one simplified Points cloud per paper.
    this._leavesLayer = new LeavesLayer(this.scene, this._definition.world.paperLayers.vegetation);

    // 共享纹理
    const atlasTexture = resources.get<THREE.Texture>("atlas/texture");
    atlasTexture.encoding = THREE.sRGBEncoding;
    atlasTexture.flipY = false;
    const maskTexture = resources.get<THREE.Texture>("atlas/texture_mask");
    maskTexture.flipY = false;
    const sdfTexture = resources.get<THREE.Texture>("atlas/sdf");
    sdfTexture.flipY = false;
    const normalTexture = resources.get<THREE.Texture>("watercolor/paper/normal");
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
    const noiseTexture = resources.get<THREE.Texture>("noise/greyscale-fractal");
    noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
    const noiseFinalTexture = resources.get<THREE.Texture>("noise/rgb-generated");
    noiseFinalTexture.wrapS = noiseFinalTexture.wrapT = THREE.RepeatWrapping;
    const inkLut = resources.get<LutData>("lut/ink");
    const dryLut = resources.get<LutData>("lut/dry");
    const inkLut3d = this._createLut3d(inkLut);
    const dryLut3d = this._createLut3d(dryLut);
    const groundAtlas = resources.get<THREE.Texture>("watercolor/ground");

    const prepared: PreparedPaper[] = [];

    // Source layout: every tile covers the paper plus its optional ground.
    // The fluid atlas is configured before instance attributes request remaps.
    // Source Full Screen instance keeps one authored axis at 512/1024 and
    // derives the other from the viewport ratio. In portrait this means a
    // fixed 512px height, not a fixed width; preserving that orientation is
    // required for the full-paint UV and video cover to agree on mobile.
    const fullScreenSize = this._isMobile ? 512 : 1024;
    const viewportRatio = window.innerWidth / Math.max(window.innerHeight, 1);
    const fullScreenWidth = viewportRatio > 1
      ? fullScreenSize
      : Math.max(64, Math.round(fullScreenSize * viewportRatio));
    const fullScreenHeight = viewportRatio > 1
      ? Math.max(64, Math.round(fullScreenSize / viewportRatio))
      : fullScreenSize;
    const paperRegionInputs: SimulationRegionInput[] = this._papers.map((config, index) => {
      const mesh = gltf.scene.getObjectByName(config.name) as THREE.Mesh | undefined;
      if (!mesh?.isMesh) return { paperIndex: index, width: 1, height: 1 };
      mesh.geometry.computeBoundingBox();
      const size = mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
      const boxes = this._computeSimulationBoxes(this._definition.world.paperLayers.ground[index], size.z, size.y);
      return { paperIndex: index, width: boxes.fullSize.x, height: boxes.fullSize.y };
    });
    simulation.configureRegions(paperRegionInputs.concat({
      // The source creates one additional instance for FullPaint. Keeping it
      // in the same packed atlas preserves the same pass chain while isolating
      // full-screen strokes from the selected paper's local paint history.
      paperIndex: this._papers.length,
      width: fullScreenWidth,
      height: fullScreenHeight,
      resolution: { width: fullScreenWidth, height: fullScreenHeight },
    }));

    // GLB meshes remain hidden authoring proxies. The visible papers are built
    // below from the source's single subdivided plane and instance matrices.
    this._papers.forEach((config, index) => {
      const mesh = gltf.scene.getObjectByName(config.name) as THREE.Mesh | undefined;
      if (!mesh || !(mesh as THREE.Mesh).isMesh) {
        console.warn(`[WatercolorView] GLB 中找不到网格: ${config.name}`);
        return;
      }
      const sdfData = this._sdfMap.get(config.name);
      const texData = this._texMap.get(config.name);
      const ground = this._definition.world.paperLayers.ground[index];
      const sdf = this._definition.world.paperLayers.sdf[index];
      const shadow = this._definition.world.paperLayers.shadow[index];
      if (!sdfData || !texData || !ground || !sdf || !shadow) return;

      const reveal = createRevealConfig(sdfData.planeSize.y / sdfData.planeSize.x, config.name);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox!;
      const width = Math.abs(bounds.min.z) + Math.abs(bounds.max.z);
      const height = Math.abs(bounds.min.y) + Math.abs(bounds.max.y);
      const transform = new THREE.Object3D();
      transform.position.copy(mesh.position);
      if (mesh.parent) transform.position.add(mesh.parent.position);
      transform.scale.set(1, height, width);
      // The source prepares each visible instance from the paper container's
      // world quaternion. Using only the `layers` parent's yaw silently drops
      // authored rotations on nodes such as tree_1 and viaduc_1, leaving the
      // visible paper out of alignment with its GLB raycast proxy, ground and
      // shadow projection.
      const worldQuaternion = new THREE.Quaternion();
      mesh.getWorldQuaternion(worldQuaternion);
      const worldEuler = new THREE.Euler().setFromQuaternion(worldQuaternion, "XYZ");
      transform.rotation.y = -worldEuler.y;
      transform.rotation.x -= Math.PI;
      transform.rotation.z = Math.PI / 2;
      transform.updateMatrix();

      const boxes = this._computeSimulationBoxes(ground, width, height);
      const simulationBox = boxes.paperBox;
      const simulationRemap = simulation.regionRemapForPaper(index);
      this._paperSimulationBoxes.set(index, boxes.paperBox.clone());
      this._groundSimulationBoxes.set(index, boxes.groundBox.clone());
      const state = { alpha: 0, curve: 1, reveal: 0, rotationZ: -Math.PI / 2 };
      this.papers.push({ index, config, mesh, transform, state, revealed: false, tween: null, ground, sdf, shadow });
      prepared.push({ index, config, mesh, sdfData, texData, reveal, matrix: transform.matrix.clone(), simulationBox, simulationRemap, ground, sdf, shadow });
      this.instanceConfigs.push({
        index,
        config,
        matrix: transform.matrix.clone(),
        proxy: mesh,
        paintAtlasRemap: new THREE.Vector4(
          texData.atlasRemap.x,
          texData.atlasRemap.y,
          texData.atlasRemap.z,
          texData.atlasRemap.w,
        ),
        sdfAtlasRemap: new THREE.Vector4(
          sdfData.atlasRemap.x,
          sdfData.atlasRemap.y,
          sdfData.atlasRemap.z,
          sdfData.atlasRemap.w,
        ),
        simulationBox,
        simulationRemap,
        reveal,
        initialRotationZ: -Math.PI / 2,
        isTransparent: sdf.transparency,
        renderGroup: sdf.transparency ? "transparent" : "paint",
      });

      if (ground.hasGround) this._prepareGround(ground, mesh, index);
    });

    // The source Ground component is a single InstancedMesh with one instance
    // slot per paper, including papers whose uVisible flag stays false.
    this._createGroundBatch(prepared, groundAtlas, noiseTexture);

    const geometry = this._createPaperGeometry(prepared);
    this._paperMaterial = this._createPaperMaterial(
      prepared,
      atlasTexture,
      maskTexture,
      sdfTexture,
      normalTexture,
      noiseTexture,
      noiseFinalTexture,
      inkLut3d,
      dryLut3d,
    );
    this._paperMesh = new THREE.InstancedMesh(geometry, this._paperMaterial, prepared.length);
    this._paperMesh.frustumCulled = false;
    this._paperMesh.renderOrder = 1;
    prepared.forEach((paper, index) => this._paperMesh!.setMatrixAt(index, paper.matrix));
    this._paperMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this._paperMesh);
    this.shadowProjection.init(prepared
      .filter((paper) => paper.shadow.castShadow)
      .map((paper) => {
        const entry = this.papers[paper.index];
        return {
          paperIndex: paper.index,
          matrix: this._createShadowMatrix(entry),
          sdfAtlasRemap: new THREE.Vector4(
            paper.sdfData.atlasRemap.x,
            paper.sdfData.atlasRemap.y,
            paper.sdfData.atlasRemap.z,
            paper.sdfData.atlasRemap.w,
          ),
          sdfScale: new THREE.Vector2(paper.sdfData.scale.x, paper.sdfData.scale.y),
          sdfOriginSize: new THREE.Vector2(paper.sdfData.originSize.x, paper.sdfData.originSize.y),
          sdfPlaneSize: new THREE.Vector2(paper.sdfData.planeSize.x, paper.sdfData.planeSize.y),
          alpha: 0,
        };
      }));
    const cutoutSources: CutoutShadowSource[] = prepared
      .filter((paper) => paper.shadow.hasHole)
      .map((paper) => {
        const size = paper.mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
        const position = paper.mesh.getWorldPosition(new THREE.Vector3());
        const quaternion = paper.mesh.getWorldQuaternion(new THREE.Quaternion());
        const yaw = new THREE.Euler().setFromQuaternion(quaternion, "YXZ").y;
        const object = new THREE.Object3D();
        object.position.copy(position);
        object.position.y += 0.012;
        object.scale.set(size.z, size.y, 1);
        object.rotation.set(-0.5 * Math.PI, 0, 0.5 * Math.PI + yaw);
        object.updateMatrix();
        return {
          paperIndex: paper.index,
          matrix: object.matrix.clone(),
          sdfAtlasRemap: new THREE.Vector4(
            paper.sdfData.atlasRemap.x,
            paper.sdfData.atlasRemap.y,
            paper.sdfData.atlasRemap.z,
            paper.sdfData.atlasRemap.w,
          ),
          sdfScale: new THREE.Vector2(paper.sdfData.scale.x, paper.sdfData.scale.y),
          sdfOriginSize: new THREE.Vector2(paper.sdfData.originSize.x, paper.sdfData.originSize.y),
          sdfPlaneSize: new THREE.Vector2(paper.sdfData.planeSize.x, paper.sdfData.planeSize.y),
        };
      });
    this.cutoutShadow.init(cutoutSources, this.shadowProjection.texture);
    this.scene.add(this.cutoutShadow.group);

    // Source Ground is a separate 2000×2000 GLB-transformed plane. Background
    // remains the preceding fullscreen pass; this layer adds source ground
    // specular and projected-shadow subtraction without duplicating it there.
    const groundMesh = gltf.scene.getObjectByName("Ground") as THREE.Mesh | undefined;
    if (groundMesh && this._paperMaterial) {
      this.globalGround.init(
        groundMesh,
        this._paperMaterial.uniforms.uBackground,
        this._paperMaterial.uniforms.uLighting,
        this.shadowProjection.texture,
      );
      this.scene.add(this.globalGround.group);
      groundMesh.visible = false;
    }

    // Raw authoring helpers are replaced by the runtime vegetation layer.
    ["Ribblehead-Viaduct-herb1", "Ribblehead-Viaduct-herb2"].forEach((name) => {
      const herb = gltf.scene.getObjectByName(name);
      if (herb) herb.visible = false;
    });
  }

  /** 每帧更新：阻尼相机使用 cameraTime，显现触发使用未阻尼 triggerTime。 */
  update(
    time: number,
    delta: number,
    cameraTime: number,
    triggerTime: number,
    fogState: { opaque: number; occulted: number },
    renderer: THREE.WebGLRenderer,
  ): void {
    const frozenTime = getDebugOptions().freezeTime;
    this._time = frozenTime ?? time;
    this.scrollCamera.update(this._time, delta, cameraTime);
    this.paintingTitles.update(this._time, delta, this.scrollCamera.camera, fogState);
    this.grassLayer.update(this._time, delta, fogState);
    this._leavesLayer?.update(this._time, delta, fogState, renderer);
    this.cutoutShadow.update(this._time, fogState);
    this.globalGround.update(this._time, fogState);

    const simTexture = this._simulation?.texture ?? null;
    const uniforms = this._paperMaterial?.uniforms;
    if (uniforms) {
      uniforms.uTime.value = this._time;
      (uniforms.uFogState.value as THREE.Vector2).set(fogState.opaque, fogState.occulted);
      if (simTexture && uniforms.uSimulationTexture.value !== simTexture) {
        uniforms.uSimulationTexture.value = simTexture;
      }
    }
    this.papers.forEach((paper) => {
      if (uniforms) {
        (uniforms.uAlpha.value as number[])[paper.index] = paper.state.alpha;
        (uniforms.uCurveCoef.value as number[])[paper.index] = paper.state.curve;
        (uniforms.uRevealProgress.value as number[])[paper.index] = paper.state.reveal;
      }
      const scheduledStart = this._definition.world.atlas.layerSchedule[paper.sdf.name] ?? paper.sdf.startAt;
      if (!paper.revealed && triggerTime >= scheduledStart) {
        this._reveal(paper);
      }
      paper.transform.rotation.z = -paper.state.rotationZ;
      paper.transform.updateMatrix();
      this._paperMesh?.setMatrixAt(paper.index, paper.transform.matrix);
      if (paper.shadow.castShadow) {
        this.shadowProjection.updateSource(paper.index, this._createShadowMatrix(paper), paper.state.alpha);
      }
    });
    if (this._paperMesh) this._paperMesh.instanceMatrix.needsUpdate = true;

    if (this._groundMaterial) {
      this._groundMaterial.uniforms.uTime.value = this._time;
      this._groundMaterial.uniforms.uFogState.value.set(fogState.opaque, fogState.occulted);
      if (simTexture && this._groundMaterial.uniforms.uSimulation.value !== simTexture) {
        this._groundMaterial.uniforms.uSimulation.value = simTexture;
      }
      const alpha = this._groundMaterial.uniforms.uAlpha.value as number[];
      this._groundStates.forEach((state, index) => { alpha[index] = state.uAlpha; });
    }
  }

  /** 全部隐藏（重启用） */
  hideAll(): void {
    this.papers.forEach((paper) => {
      paper.revealed = false;
      paper.tween?.kill();
      paper.state.alpha = 0;
      paper.state.curve = 1;
      paper.state.reveal = 0;
      paper.state.rotationZ = -Math.PI / 2;
    });
    this._groundStates.forEach((state) => { state.uAlpha = 0; });
    this._groundVisible.fill(false);
    if (this._groundMaterial) {
      (this._groundMaterial.uniforms.uAlpha.value as number[]).fill(0);
      (this._groundMaterial.uniforms.uVisible.value as boolean[]).fill(false);
    }
    this.paintingTitles.hideAll();
    this.grassLayer.reset();
    this._leavesLayer?.reset();
    this.cutoutShadow.reset();
    this.shadowProjection.reset();
  }

  resize(width: number, height: number, renderWidth = width, renderHeight = height): void {
    this.scrollCamera.resize(width, height);
    this.paintingTitles.resize(width, height, renderWidth, renderHeight);
    this.grassLayer.resize(renderWidth, renderHeight);
    this._leavesLayer?.resize(renderWidth, renderHeight);
    this.shadowProjection.resize(renderWidth, renderHeight);
    this.cutoutShadow.resize(renderWidth, renderHeight);
    this.globalGround.resize(renderWidth, renderHeight);
    (this._paperMaterial?.uniforms.uResolution.value as THREE.Vector2 | undefined)?.set(renderWidth, renderHeight);
    (this._groundMaterial?.uniforms.uResolution.value as THREE.Vector2 | undefined)?.set(renderWidth, renderHeight);
  }

  setPointer(clientX: number, clientY: number): void {
    this.scrollCamera.setPointer(clientX, clientY);
    this.paintingTitles.setPointer(clientX, clientY);
  }

  hitTestTitle(ndc: THREE.Vector2): { sceneIndex: number } | null {
    return this.paintingTitles.hitTest(ndc);
  }

  setHoveredTitle(sceneIndex: number | null): void {
    this.paintingTitles.setHovered(sceneIndex);
  }

  setPaintInfosIntersection(
    hit: RaycastHit | null,
    ndcVelocity = new THREE.Vector2(),
    moving = false,
  ): void {
    this._leavesLayer?.setPaintInfosIntersection(hit, ndcVelocity, moving);
  }

  get leavesLayer(): LeavesLayer | null {
    return this._leavesLayer;
  }

  getRaycastPapers(camera: THREE.Camera): PaperEntry[] {
    const projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(projection);
    return this.papers.filter((paper) => paper.revealed && frustum.intersectsObject(paper.mesh));
  }

  raycastPaper(
    raycaster: THREE.Raycaster,
  ): RaycastHit | null {
    const paperProxies = this.getRaycastPapers(this.scrollCamera.camera)
      .filter((paper) => paper.state.alpha >= 0.01)
      .map((paper) => paper.mesh);
    // Source PaintManager intersects all visible paper meshes plus one Ground
    // batch. Hidden instances are filtered by their instanceId below; the
    // shader's uVisible flag alone cannot affect Three's CPU raycaster.
    const targets: THREE.Object3D[] = this._groundMesh
      ? [...paperProxies, this._groundMesh]
      : paperProxies;
    const hits = raycaster.intersectObjects(targets, false);
    for (const hit of hits) {
      if (!hit.uv) continue;
      if (this._groundMesh && hit.object === this._groundMesh) {
        const instanceId = hit.instanceId;
        const ground = typeof instanceId === "number"
          ? this._grounds.find((entry) => entry.paperIndex === instanceId)
          : undefined;
        if (!ground || !this._groundVisible[ground.paperIndex]) continue;
        const paper = this.papers[ground.paperIndex];
        if (!paper) continue;
        const uv = hit.uv.clone();
        uv.y = 1 - uv.y;
        this.grassLayer.setGroundHit(ground.paperIndex, hit.point);
        return {
          kind: "ground",
          paperIndex: ground.paperIndex,
          sceneIndex: paper.config.sceneIndex,
          proxy: this._groundMesh,
          uv,
          point: hit.point.clone(),
          distance: hit.distance,
        };
      }
      const paper = this.papers.find((entry) => entry.mesh === hit.object);
      if (!paper) continue;
      this.grassLayer.setGroundHit(null, null);
      const uv = hit.uv.clone();
      uv.x = 1 - uv.x;
      return {
        kind: "paper",
        paperIndex: paper.index,
        sceneIndex: paper.config.sceneIndex,
        proxy: hit.object,
        uv,
        point: hit.point.clone(),
        distance: hit.distance,
      };
    }
    this.grassLayer.setGroundHit(null, null);
    return null;
  }

  getPaperProjectedSize(paperIndex: number, camera: THREE.Camera): THREE.Vector2 {
    const paper = this.papers[paperIndex];
    if (!paper) return new THREE.Vector2(window.innerWidth, window.innerHeight);
    const corners = [
      new THREE.Vector3(0, -1, -0.5),
      new THREE.Vector3(0, -1, 0.5),
      new THREE.Vector3(0, 0, -0.5),
      new THREE.Vector3(0, 0, 0.5),
    ].map((corner) => corner.applyMatrix4(paper.transform.matrix).project(camera));
    const xs = corners.map((corner) => (corner.x * 0.5 + 0.5) * window.innerWidth);
    const ys = corners.map((corner) => (-corner.y * 0.5 + 0.5) * window.innerHeight);
    return new THREE.Vector2(
      Math.max(Math.max(...xs) - Math.min(...xs), 1),
      Math.max(Math.max(...ys) - Math.min(...ys), 1),
    );
  }

  getHitProjectedSize(hit: RaycastHit, camera: THREE.Camera): THREE.Vector2 {
    if (hit.kind === "paper") return this.getPaperProjectedSize(hit.paperIndex, camera);
    const ground = this._grounds.find((entry) => entry.paperIndex === hit.paperIndex);
    if (!ground) return this.getPaperProjectedSize(hit.paperIndex, camera);
    const corners = [
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0),
      new THREE.Vector3(-0.5, 0.5, 0),
      new THREE.Vector3(0.5, 0.5, 0),
    ].map((corner) => corner.applyMatrix4(ground.matrix).project(camera));
    const xs = corners.map((corner) => (corner.x * 0.5 + 0.5) * window.innerWidth);
    const ys = corners.map((corner) => (-corner.y * 0.5 + 0.5) * window.innerHeight);
    return new THREE.Vector2(
      Math.max(Math.max(...xs) - Math.min(...xs), 1),
      Math.max(Math.max(...ys) - Math.min(...ys), 1),
    );
  }

  mapPaperUvToSimulation(paperIndex: number, paperUv: THREE.Vector2): THREE.Vector2 {
    const box = this._paperSimulationBoxes.get(paperIndex) ?? new THREE.Vector4(0, 0, 1, 1);
    return new THREE.Vector2(
      THREE.MathUtils.lerp(box.x, box.z, paperUv.x),
      THREE.MathUtils.lerp(box.y, box.w, paperUv.y),
    );
  }

  mapHitUvToSimulation(hit: RaycastHit): THREE.Vector2 {
    const box = hit.kind === "ground"
      ? this._groundSimulationBoxes.get(hit.paperIndex)
      : this._paperSimulationBoxes.get(hit.paperIndex);
    const safe = box ?? new THREE.Vector4(0, 0, 1, 1);
    // The source performs two paper-X conversions: PaintManager flips the GLB
    // proxy intersection, then SimulationInstance flips it back before mapping
    // into paperBox. Keeping both stages is intentional; omitting this second
    // conversion mirrors the visible brush response around the paper centre.
    // Ground intersections have a separate Y conversion and must not use this.
    const x = hit.kind === "paper" ? 1 - hit.uv.x : hit.uv.x;
    return new THREE.Vector2(
      THREE.MathUtils.lerp(safe.x, safe.z, x),
      THREE.MathUtils.lerp(safe.y, safe.w, hit.uv.y),
    );
  }

  getSimulationBox(hit: RaycastHit): THREE.Vector4 {
    return (hit.kind === "ground"
      ? this._groundSimulationBoxes.get(hit.paperIndex)
      : this._paperSimulationBoxes.get(hit.paperIndex)
    )?.clone() ?? new THREE.Vector4(0, 0, 1, 1);
  }

  getPaperSimulationBox(paperIndex: number): THREE.Vector4 {
    return (this._paperSimulationBoxes.get(paperIndex) ?? new THREE.Vector4(0, 0, 1, 1)).clone();
  }

  /** Exposes the active reveal profile to deterministic browser QA. */
  getRevealTiming() {
    return { ...this._revealTiming };
  }

  private _reveal(paper: PaperEntry): void {
    paper.revealed = true;
    if (paper.shadow.hasHole) this.cutoutShadow.show(paper.index);
    const tl = gsap.timeline();
    if (paper.sdf.revealType === "fade") {
      // Source fade layers (background_2) stay flat and reveal through a
      // three-second opacity ramp; they do not use the ordinary paper's
      // curve/rise tracks.
      paper.state.rotationZ = 0;
      paper.state.curve = 1;
      tl.set(paper.state, { rotationZ: 0, curve: 1 }, 0);
      tl.fromTo(paper.state, { alpha: 0 }, { alpha: 1, duration: 3, ease: "sine.inOut" }, 0);
    } else {
      tl.fromTo(paper.state, { alpha: 0 }, { alpha: 1, duration: 0.01, ease: "none" }, 0);
      tl.fromTo(
        paper.state,
        { curve: 0 },
        { curve: 1, duration: this._revealTiming.curveSeconds, ease: "quart.out" },
        0,
      );
      tl.fromTo(
        paper.state,
        { rotationZ: -Math.PI / 2 },
        { rotationZ: 0, duration: this._revealTiming.riseSeconds, ease: "back.out" },
        0,
      );
    }
    tl.to(
      paper.state,
      {
        reveal: this._revealTiming.revealProgressMax,
        duration: this._revealTiming.revealSeconds,
        ease: "none",
      },
      0,
    );
    const ground = this._grounds.find((entry) => entry.paperName === paper.config.name);
    if (ground && this._groundMaterial) {
      this._groundVisible[paper.index] = true;
      (this._groundMaterial.uniforms.uVisible.value as boolean[])[paper.index] = true;
      tl.fromTo(
        this._groundStates[paper.index],
        { uAlpha: 0 },
        { uAlpha: 1, duration: 0.4, ease: "sine.inOut" },
        0,
      );
    }
    paper.tween = tl;
  }

  private _createPaperGeometry(papers: PreparedPaper[]): THREE.InstancedBufferGeometry {
    const plane = new THREE.PlaneGeometry(1, 1, 10, 10);
    plane.translate(0, -0.5, 0);
    plane.rotateY(-0.5 * Math.PI);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.copy(plane);
    geometry.instanceCount = papers.length;
    geometry.setAttribute("instance", new THREE.InstancedBufferAttribute(new Float32Array(papers.map((paper) => paper.index)), 1));
    geometry.setAttribute(
      "simulationBox",
      new THREE.InstancedBufferAttribute(new Float32Array(papers.flatMap((paper) => paper.simulationBox.toArray())), 4),
    );
    geometry.setAttribute(
      "simulationRemap",
      new THREE.InstancedBufferAttribute(new Float32Array(papers.flatMap((paper) => paper.simulationRemap.toArray())), 4),
    );
    geometry.setAttribute(
      "transparency",
      new THREE.InstancedBufferAttribute(new Float32Array(papers.map((paper) => paper.sdf.transparency ? 1 : 0)), 1),
    );
    plane.dispose();
    return geometry;
  }

  private _createPaperMaterial(
    papers: PreparedPaper[],
    atlasTexture: THREE.Texture,
    maskTexture: THREE.Texture,
    sdfTexture: THREE.Texture,
    normalTexture: THREE.Texture,
    noiseTexture: THREE.Texture,
    noiseFinalTexture: THREE.Texture,
    inkLut3d: THREE.Data3DTexture,
    dryLut3d: THREE.Data3DTexture,
  ): THREE.ShaderMaterial {
    const revealMatrices = papers.map((paper) => new THREE.Matrix4().fromArray(paper.reveal.infos.flatMap((point) => point.toArray())));
    const revealPositionMatrices = papers.map((paper) => new THREE.Matrix4().fromArray(
      paper.reveal.positions.flatMap((point) => [point.x, point.y, 0, 0]),
    ));
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      tNoiseTexture: { value: noiseTexture },
      uLighterColor: { value: new THREE.Color("#e4e4ea") },
      uNormalMapStrength: { value: 13 },
      uNormalMapScale: { value: 3 },
      uSdfPlaneSize: { value: papers.map((paper) => new THREE.Vector2(paper.sdfData.planeSize.x, paper.sdfData.planeSize.y)) },
      uSdfScale: { value: papers.map((paper) => new THREE.Vector2(paper.sdfData.scale.x, paper.sdfData.scale.y)) },
      uSdfOriginSize: { value: papers.map((paper) => new THREE.Vector2(paper.sdfData.originSize.x, paper.sdfData.originSize.y)) },
      uSdfAtlasRemap: { value: papers.map((paper) => new THREE.Vector4(
        paper.sdfData.atlasRemap.x,
        paper.sdfData.atlasRemap.y,
        paper.sdfData.atlasRemap.z,
        paper.sdfData.atlasRemap.w,
      )) },
      uSdfAtlasTexture: { value: sdfTexture },
      uInkLut3d: { value: inkLut3d },
      uDryLut3d: { value: dryLut3d },
      uLutEnable: { value: 1 },
      uLutSize: { value: inkLut3d.image.width },
      uPaintAtlasRemap: { value: papers.map((paper) => new THREE.Vector4(
        paper.texData.atlasRemap.x,
        paper.texData.atlasRemap.y,
        paper.texData.atlasRemap.z,
        paper.texData.atlasRemap.w,
      )) },
      uPaintAtlasTexture: { value: atlasTexture },
      uMaskAtlasTexture: { value: maskTexture },
      uPaintIntensity: { value: new THREE.Vector2(0.8, 1.4) },
      // Branch delivery keeps the accepted ordinary-layer edge catch-up. The
      // source profile sets this to zero, making the extra path a no-op while
      // retaining one shader/material contract for both comparison modes.
      uCompleteLayerBaseline: { value: this._revealTiming.completeLayerBaseline },
      uNormalMapTexture: { value: normalTexture },
      uLighting: { value: {
        // Exact source Background component values (u5), merged into Paper
        // uniforms by the original material factory.
        groundSpecularScale: new THREE.Vector2(27.5, 10.7),
        groundSpecularOffset: new THREE.Vector2(8.12, 0.38),
        groundSpecularStrength: 0.47,
        specularCenter: new THREE.Vector2(1.2, 0.7),
        specularScale: new THREE.Vector2(0.82, 0.67),
        specularOffset: new THREE.Vector2(0, 0),
        specularStrength: 0.18,
      } },
      uBackground: { value: {
        groundColor: new THREE.Color("#b4b4b4"),
        skyColor: new THREE.Color("#e4e4e4"),
        progressRemap: new THREE.Vector2(0.5, 1),
      } },
      uNoiseTexture: { value: noiseTexture },
      uNoiseFinalTexture: { value: noiseFinalTexture },
      uRevealProgress: { value: new Array(papers.length).fill(0) },
      uRevealPoints: { value: revealMatrices },
      uRevealPointsPos: { value: revealPositionMatrices },
      uSimulationTexture: { value: null },
      uFogState: { value: new THREE.Vector2(0, 0) },
      uAlpha: { value: new Array(papers.length).fill(0) },
      uCurveCoef: { value: new Array(papers.length).fill(0) },
    };
    this._paperUniforms = uniforms;
    return new THREE.ShaderMaterial({
      vertexShader: paperVertexShader,
      fragmentShader: paperFragmentShader,
      defines: { INSTANCE_COUNT: papers.length },
      transparent: true,
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
      uniforms,
    });
  }

  /** Collect one source Ground instance and its transform metadata. */
  private _prepareGround(
    config: PaperGroundContract,
    paperMesh: THREE.Mesh,
    paperIndex: number,
  ): void {
    const atlasEntry = this._definition.world.groundAtlas.find((g) => g.name === config.ground.texture)!;
    paperMesh.geometry.computeBoundingBox();
    const sourceSize = paperMesh.geometry.boundingBox!.getSize(new THREE.Vector3());
    // Exact production _computeSizes(): source geometry uses Z as its paper width.
    const width = sourceSize.z + 2 * config.ground.edges;
    const depth = config.ground.depth;

    const paperPos = new THREE.Vector3();
    paperMesh.getWorldPosition(paperPos);

    // 对应原站：rotation.x = 1.5π, rotation.z = -0.5π + 纸张朝向
    const paperQuat = new THREE.Quaternion();
    paperMesh.getWorldQuaternion(paperQuat);
    const euler = new THREE.Euler().setFromQuaternion(paperQuat, "YXZ");
    const transform = new THREE.Object3D();
    transform.position.copy(paperPos);
    transform.position.y += 0.01;
    transform.rotation.set(1.5 * Math.PI, 0, -0.5 * Math.PI + euler.y);
    transform.scale.set(width, depth, 1);
    transform.updateMatrix();

    const entry: GroundEntry = {
      paperName: config.name,
      paperIndex,
      size: new THREE.Vector2(width, depth),
      matrix: transform.matrix.clone(),
      atlasRemap: new THREE.Vector4(atlasEntry.offset.x, atlasEntry.offset.y, atlasEntry.size.x, atlasEntry.size.y),
      simulationBox: (this._groundSimulationBoxes.get(paperIndex) ?? new THREE.Vector4(0, 0, 0, 0)).clone(),
      simulationRemap: this._simulation!.regionRemapForPaper(paperIndex).clone(),
    };
    this._grounds.push(entry);
    this.grassLayer.addGround(paperIndex, paperPos, transform.rotation.z, entry.size);
  }

  /** Build the single instanced Ground batch used by the source component. */
  private _createGroundBatch(
    papers: PreparedPaper[],
    groundAtlas: THREE.Texture,
    noiseTexture: THREE.Texture,
  ): void {
    const count = papers.length;
    const groundByPaper = new Map(this._grounds.map((ground) => [ground.paperIndex, ground]));
    const base = new THREE.BoxGeometry(1, 1, 1, 1);
    base.translate(0, -0.5, 0);
    const geometry = new THREE.InstancedBufferGeometry().copy(base);
    base.dispose();

    geometry.setAttribute("instance", new THREE.InstancedBufferAttribute(
      new Float32Array(papers.map((paper) => paper.index)), 1,
    ));
    geometry.setAttribute("size", new THREE.InstancedBufferAttribute(
      new Float32Array(papers.flatMap((paper) => {
        const ground = groundByPaper.get(paper.index);
        return ground?.size.toArray() ?? [0.001, 0.001];
      })), 2,
    ));
    geometry.setAttribute("simulationBox", new THREE.InstancedBufferAttribute(
      new Float32Array(papers.flatMap((paper) => (
        groundByPaper.get(paper.index)?.simulationBox.toArray() ?? [0, 0, 0, 0]
      ))), 4,
    ));
    geometry.setAttribute("simulationRemap", new THREE.InstancedBufferAttribute(
      new Float32Array(papers.flatMap((paper) => (
        groundByPaper.get(paper.index)?.simulationRemap.toArray() ?? paper.simulationRemap.toArray()
      ))), 4,
    ));

    const atlasRemaps = papers.map((paper) => (
      groundByPaper.get(paper.index)?.atlasRemap.clone() ?? new THREE.Vector4(0, 0, 1, 1)
    ));
    const visible = new Array<boolean>(count).fill(false);
    const alpha = new Array<number>(count).fill(0);
    this._groundStates = papers.map(() => ({ uAlpha: 0 }));
    this._groundVisible = visible;
    this._groundMaterial = new THREE.ShaderMaterial({
      vertexShader: groundVertexShader,
      fragmentShader: groundFragmentShader,
      defines: { INSTANCE_COUNT: count },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uAtlasTexture: { value: groundAtlas },
        uAtlasRemap: { value: atlasRemaps },
        uVisible: { value: visible },
        uAlpha: { value: alpha },
        uSimulation: { value: null },
        uNoise: { value: noiseTexture },
        uNoiseIntensity: { value: 1.31 },
        uNoiseScale: { value: 0.4 },
        uDimSlope: { value: 1.46 },
        uSimulationIntensity: { value: 1 },
        uShadowIntensity: { value: 0.2 },
        uShadowMap: { value: this.shadowProjection.texture },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 },
        uFogState: { value: new THREE.Vector2(0, 0) },
        tNoiseTexture: { value: noiseTexture },
      },
    });
    this._groundMesh = new THREE.InstancedMesh(geometry, this._groundMaterial, count);
    this._groundMesh.name = "SourceGroundsBatch";
    this._groundMesh.frustumCulled = false;
    this._groundMesh.renderOrder = -1;
    papers.forEach((paper) => {
      const ground = groundByPaper.get(paper.index);
      this._groundMesh!.setMatrixAt(paper.index, ground?.matrix ?? paper.matrix);
    });
    this._groundMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this._groundMesh);
  }

  /** Source projection uses its own instance transform, not the visible paper matrix. */
  private _createShadowMatrix(paper: PaperEntry): THREE.Matrix4 {
    paper.mesh.geometry.computeBoundingBox();
    const size = paper.mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
    const object = new THREE.Object3D();
    paper.mesh.getWorldPosition(object.position);
    const quaternion = new THREE.Quaternion();
    paper.mesh.getWorldQuaternion(quaternion);
    object.rotation.setFromQuaternion(quaternion);
    object.rotation.z = paper.state.rotationZ;
    object.scale.set(size.z, size.y, size.x);
    object.updateMatrix();
    return object.matrix.clone();
  }

  private _computeSimulationBoxes(
    config: PaperGroundContract,
    paperWidth: number,
    paperHeight: number,
  ): { paperBox: THREE.Vector4; groundBox: THREE.Vector4; fullSize: THREE.Vector2 } {
    const groundWidth = config.hasGround ? Math.max(0, paperWidth + 2 * config.ground.edges) : 0;
    const groundHeight = config.hasGround ? Math.max(0, config.ground.depth) : 0;
    const fullWidth = Math.max(paperWidth, groundWidth, 0.001);
    const fullHeight = Math.max(paperHeight + groundHeight, 0.001);
    const paperMinX = (fullWidth - paperWidth) * 0.5 / fullWidth;
    const paperMaxX = paperMinX + paperWidth / fullWidth;
    const paperMaxY = paperHeight / fullHeight;
    const groundMinX = (fullWidth - groundWidth) * 0.5 / fullWidth;
    const groundMaxX = groundMinX + groundWidth / fullWidth;
    return {
      paperBox: new THREE.Vector4(paperMinX, 0, paperMaxX, paperMaxY),
      groundBox: config.hasGround
        ? new THREE.Vector4(groundMinX, paperMaxY, groundMaxX, 1)
        : new THREE.Vector4(0, 0, 0, 0),
      fullSize: new THREE.Vector2(fullWidth, fullHeight),
    };
  }

  private _createLut3d(lut: LutData): THREE.Data3DTexture {
    const texture = new THREE.Data3DTexture(lut.data, lut.size, lut.size, lut.size);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = texture.wrapT = texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }
}
