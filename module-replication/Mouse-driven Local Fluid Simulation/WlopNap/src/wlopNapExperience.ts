import * as THREE from 'three';
import { FluidSimulation } from './fluidSimulation';
import { createRevealMaterial, updateRevealPointMatrices } from './revealShader';
import { createWhiteGrayBaseTexture } from './whiteGrayBaseTexture';

const imageUrl = '/assets/wlop-nap.png';
const sourceSimulationWidth = 1024;

export class WlopNapExperience {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new THREE.PlaneGeometry(2, 2);
  private fluid?: FluidSimulation;
  private material?: THREE.ShaderMaterial;
  private image?: THREE.Texture;
  private baseTexture?: THREE.Texture;
  private readonly ownedTextures: THREE.Texture[] = [];
  private frame = 0;
  private previousTime = performance.now();

  constructor(canvas: HTMLCanvasElement, onReady: () => void) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xffffff, 1);

    this.loadAssets(onReady);
    this.bindEvents();
    this.resize();
    this.render(performance.now());
  }

  private async loadAssets(onReady: () => void) {
    try {
      const loader = new THREE.TextureLoader();
      const [image, fluidNoise, revealNoise] = await Promise.all([
        loader.loadAsync(imageUrl),
        loader.loadAsync('/assets/fluid-noise.png'),
        loader.loadAsync('/assets/watercolor-noise.png'),
      ]);

      image.colorSpace = THREE.SRGBColorSpace;
      image.generateMipmaps = false;
      image.minFilter = THREE.LinearFilter;
      image.magFilter = THREE.LinearFilter;

      fluidNoise.colorSpace = THREE.NoColorSpace;
      fluidNoise.wrapS = THREE.RepeatWrapping;
      fluidNoise.wrapT = THREE.RepeatWrapping;
      fluidNoise.minFilter = THREE.LinearFilter;
      fluidNoise.magFilter = THREE.LinearFilter;

      revealNoise.colorSpace = THREE.NoColorSpace;
      revealNoise.wrapS = THREE.RepeatWrapping;
      revealNoise.wrapT = THREE.RepeatWrapping;
      revealNoise.minFilter = THREE.LinearFilter;
      revealNoise.magFilter = THREE.LinearFilter;

      const sourceImage = image.image as HTMLImageElement;
      const baseTexture = createWhiteGrayBaseTexture(sourceImage);
      const viewportWidth = Math.max(1, this.canvas.clientWidth);
      const viewportHeight = Math.max(1, this.canvas.clientHeight);
      const viewportRatio = viewportWidth / viewportHeight;
      const simulationWidth = viewportRatio > 1
        ? sourceSimulationWidth
        : Math.max(1, Math.round(sourceSimulationWidth * viewportRatio));
      const simulationHeight = viewportRatio > 1
        ? Math.max(1, Math.round(sourceSimulationWidth / viewportRatio))
        : sourceSimulationWidth;
      const fluid = new FluidSimulation(
        this.renderer,
        fluidNoise,
        simulationWidth,
        simulationHeight,
      );
      const material = createRevealMaterial({
        base: baseTexture,
        fluid: fluid.texture,
        image,
        noise: revealNoise,
      });
      material.uniforms.uPaintTextureSize.value.set(sourceImage.naturalWidth, sourceImage.naturalHeight);
      material.uniforms.uResolution.value.set(viewportWidth, viewportHeight);
      updateRevealPointMatrices(material, viewportRatio);

      this.image = image;
      this.baseTexture = baseTexture;
      this.ownedTextures.push(fluidNoise, revealNoise);
      this.fluid = fluid;
      this.material = material;
      this.scene.add(new THREE.Mesh(this.geometry, material));
      onReady();
    } catch (error) {
      console.error('Unable to load WLOP - Nap source-derived full-paint assets.', error);
    }
  }

  private bindEvents() {
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    window.addEventListener('resize', this.resize);
  }

  private handlePointerMove = (event: PointerEvent) => {
    const bounds = this.canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const yFromTop = (event.clientY - bounds.top) / bounds.height;
    this.fluid?.setPointer(x, yFromTop);
  };

  private handlePointerLeave = () => {
    this.fluid?.setInactive();
  };

  private resize = () => {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.material?.uniforms.uResolution.value.set(width, height);
  };

  reset() {
    this.fluid?.clear();
  }

  private render = (now: number) => {
    const deltaSeconds = Math.min(0.05, Math.max(0.001, (now - this.previousTime) / 1000));
    this.previousTime = now;
    this.fluid?.update(deltaSeconds);
    if (this.fluid && this.material) {
      this.material.uniforms.uSimulation.value = this.fluid.texture;
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = window.requestAnimationFrame(this.render);
  };

  dispose() {
    window.cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    window.removeEventListener('resize', this.resize);
    this.geometry.dispose();
    this.material?.dispose();
    this.image?.dispose();
    this.baseTexture?.dispose();
    this.ownedTextures.forEach((texture) => texture.dispose());
    this.fluid?.dispose();
    this.renderer.dispose();
  }
}
