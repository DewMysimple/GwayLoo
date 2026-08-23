import * as THREE from 'three';

// Single full-screen adaptation of the original BatchInkSimulation.
// The pass order and constants below are taken from the source bundle.
const SOURCE = {
  advection: {
    firstNoiseScale: 1,
    gapAmount: new THREE.Vector2(0.468, 0.51),
    gapVelocityBoost: 3,
    intensityDim: 0.001,
    randomDirection: 0.8,
    secondNoiseScale: 2,
    velocityThreshold: 0.05,
  },
  brushDamping: 8,
  cursorRadius: 0.0831805106,
  dt: 0.008,
  hover: {
    attenuation: 0.96,
    deceleration: 0.98,
    mouseForce: 50,
  },
} as const;

const passVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const externalForceFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D src;
  uniform vec2 force;
  uniform vec2 center;
  uniform vec2 lastCenter;
  uniform float scale;
  uniform float lastScale;
  uniform float intensity;
  uniform float planeRatio;
  uniform float uActive;

  varying vec2 vUv;

  float sdEllipse(in vec2 p, in vec2 ab) {
    p = abs(p);
    if (p.x > p.y) {
      p = p.yx;
      ab = ab.yx;
    }
    float l = ab.y * ab.y - ab.x * ab.x;
    float m = ab.x * p.x / l;
    float m2 = m * m;
    float n = ab.y * p.y / l;
    float n2 = n * n;
    float c = (m2 + n2 - 1.0) / 3.0;
    float c3 = c * c * c;
    float q = c3 + m2 * n2 * 2.0;
    float d = c3 + m2 * n2;
    float g = m + m * n2;
    float co;

    if (d < 0.0) {
      float h = acos(q / c3) / 3.0;
      float s = cos(h);
      float t = sin(h) * sqrt(3.0);
      float rx = sqrt(-c * (s + t + 2.0) + m2);
      float ry = sqrt(-c * (s - t + 2.0) + m2);
      co = (ry + sign(l) * rx + abs(g) / (rx * ry) - m) / 2.0;
    } else {
      float h = 2.0 * m * n * sqrt(d);
      float s = sign(q + h) * pow(abs(q + h), 1.0 / 3.0);
      float u = sign(q - h) * pow(abs(q - h), 1.0 / 3.0);
      float rx = -s - u - c * 4.0 + 2.0 * m2;
      float ry = (s - u) * sqrt(3.0);
      float rm = sqrt(rx * rx + ry * ry);
      co = (ry / sqrt(rm - rx) + 2.0 * g / rm - m) / 2.0;
    }

    vec2 r = ab * vec2(co, sqrt(1.0 - co * co));
    return length(r - p) * sign(p.y - r.y);
  }

  void main() {
    vec3 previousData = texture2D(src, vUv).xyz;
    if (uActive < 0.5) {
      gl_FragColor = vec4(previousData, 1.0);
      return;
    }

    float forceLength = length(force);
    float sdf = sdEllipse(
      vUv - center,
      vec2(scale, scale * (1.0 + (planeRatio - 1.0) * 0.5))
    );
    sdf = -sdf / max(lastScale, scale);
    sdf = max(0.0, sdf);

    vec2 direction = normalize((vUv - center) / scale) * forceLength;
    float shouldUpdateIntensity = step(0.0001, sdf) * step(0.0001, forceLength);
    float inputIntensity = min(previousData.z + intensity, 1.0);
    float newIntensity = mix(previousData.z, inputIntensity, shouldUpdateIntensity);
    vec2 newVelocity = mix(force, direction, 0.2) * sdf;

    gl_FragColor = vec4(previousData.xy + newVelocity, newIntensity, 1.0);
  }
`;

const advectionFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D velocity;
  uniform sampler2D noise;
  uniform vec2 fboSize;
  uniform float deceleration;
  uniform float dt;
  uniform float randomDirection;
  uniform float firstNoiseScale;
  uniform float secondNoiseScale;
  uniform float velocityThreshold;
  uniform float gapVelocityBoost;
  uniform vec2 gapAmount;
  uniform float intensityDim;

  varying vec2 vUv;

  float cubicInOut(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
  }

  void main() {
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    vec4 baseData = texture2D(velocity, vUv);
    vec2 fluidVelocity = baseData.xy;
    float sourceIntensity = baseData.z;
    float speed = length(fluidVelocity);
    vec3 noiseData = texture2D(noise, vUv * firstNoiseScale).rgb;
    vec3 noiseData2 = texture2D(noise, vUv * secondNoiseScale).rgb;
    vec2 noiseDirection = normalize((noiseData.gb - 0.5) * 2.0);
    float threshold = cubicInOut(noiseData.r) * velocityThreshold;
    bool isAboveThreshold = speed < threshold;

    if (isAboveThreshold) {
      fluidVelocity *= smoothstep(gapAmount.x, gapAmount.y, noiseData2.r);
    }

    vec2 nextVelocityOffset = mix(
      fluidVelocity,
      noiseDirection * length(fluidVelocity),
      randomDirection
    ) * dt * ratio;
    if (isAboveThreshold) {
      nextVelocityOffset *= mix(0.0, gapVelocityBoost, noiseData.r);
    }

    vec2 nextUv = clamp(vUv - nextVelocityOffset, 0.0, 1.0);
    vec3 newData = texture2D(velocity, nextUv).xyz;
    float newIntensity = newData.z;
    fluidVelocity = newData.xy;
    float dimFactor = 1.0 + smoothstep(0.001, 0.0, length(nextVelocityOffset)) * 3.0;
    newIntensity = max(max(newIntensity, sourceIntensity) - intensityDim * dimFactor, 0.0);

    gl_FragColor = vec4(fluidVelocity * deceleration, newIntensity, 0.0);
  }
`;

const divergenceFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D velocity;
  uniform vec2 pixel;
  uniform float dt;

  varying vec2 vUv;

  void main() {
    vec2 clampMin = pixel;
    vec2 clampMax = vec2(1.0) - pixel;
    float x0 = texture2D(velocity, clamp(vUv - vec2(pixel.x, 0.0), clampMin, clampMax)).x;
    float x1 = texture2D(velocity, clamp(vUv + vec2(pixel.x, 0.0), clampMin, clampMax)).x;
    float y0 = texture2D(velocity, clamp(vUv - vec2(0.0, pixel.y), clampMin, clampMax)).y;
    float y1 = texture2D(velocity, clamp(vUv + vec2(0.0, pixel.y), clampMin, clampMax)).y;
    float divergence = (x1 - x0 + y1 - y0) / 2.0;
    gl_FragColor = vec4(divergence / dt);
  }
`;

const pressureFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D pressure;
  uniform sampler2D divergence;
  uniform vec2 pixel;

  varying vec2 vUv;

  void main() {
    vec2 clampMin = pixel;
    vec2 clampMax = vec2(1.0) - pixel;
    float p0 = texture2D(pressure, clamp(vUv + vec2(pixel.x * 2.0, 0.0), clampMin, clampMax)).r;
    float p1 = texture2D(pressure, clamp(vUv - vec2(pixel.x * 2.0, 0.0), clampMin, clampMax)).r;
    float p2 = texture2D(pressure, clamp(vUv + vec2(0.0, pixel.y * 2.0), clampMin, clampMax)).r;
    float p3 = texture2D(pressure, clamp(vUv - vec2(0.0, pixel.y * 2.0), clampMin, clampMax)).r;
    float div = texture2D(divergence, vUv).r;
    float nextPressure = (p0 + p1 + p2 + p3) / 4.0 - div;
    gl_FragColor = vec4(nextPressure);
  }
`;

const gradientSubtractFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D pressure;
  uniform sampler2D velocity;
  uniform vec2 pixel;
  uniform float dt;

  varying vec2 vUv;

  void main() {
    vec2 clampMin = pixel;
    vec2 clampMax = vec2(1.0) - pixel;
    float p0 = texture2D(pressure, clamp(vUv + vec2(pixel.x, 0.0), clampMin, clampMax)).r;
    float p1 = texture2D(pressure, clamp(vUv - vec2(pixel.x, 0.0), clampMin, clampMax)).r;
    float p2 = texture2D(pressure, clamp(vUv + vec2(0.0, pixel.y), clampMin, clampMax)).r;
    float p3 = texture2D(pressure, clamp(vUv - vec2(0.0, pixel.y), clampMin, clampMax)).r;
    vec3 data = texture2D(velocity, vUv).xyz;
    vec2 gradient = vec2(p0 - p1, p2 - p3) * 0.5;
    vec2 projectedVelocity = data.xy - gradient * dt;
    gl_FragColor = vec4(projectedVelocity, data.z, 1.0);
  }
`;

const accumulationFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D velocity;
  uniform sampler2D accumulation;
  uniform float attenuation;

  varying vec2 vUv;

  void main() {
    vec4 velocityData = texture2D(velocity, vUv);
    vec2 sourceDirection = velocityData.xy;
    float sourceVelocity = length(velocityData.xy);
    float intensity = velocityData.z;
    vec4 previousData = texture2D(accumulation, vUv);
    float previousVelocity = previousData.b * attenuation;
    vec2 previousDirection = previousData.rg;
    float storedVelocity = max(smoothstep(sourceVelocity, 0.0, 0.01), previousVelocity);
    vec2 storedDirection = sourceVelocity > 0.001 ? sourceDirection : previousDirection;
    gl_FragColor = vec4(storedDirection, storedVelocity, intensity);
  }
`;

function createTarget(width: number, height: number) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: false,
    format: THREE.RGBAFormat,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    stencilBuffer: false,
    type: THREE.HalfFloatType,
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  target.texture.generateMipmaps = false;
  return target;
}

class SimulationPass {
  readonly material: THREE.ShaderMaterial;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly geometry = new THREE.PlaneGeometry(2, 2);

  constructor(
    renderer: THREE.WebGLRenderer,
    fragmentShader: string,
    uniforms: THREE.ShaderMaterialParameters['uniforms'],
  ) {
    this.renderer = renderer;
    this.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader,
      uniforms,
      vertexShader: passVertexShader,
    });
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
  }

  render(target: THREE.WebGLRenderTarget) {
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class FluidSimulation {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly size: THREE.Vector2;
  private readonly pixel: THREE.Vector2;
  private readonly targetCenter = new THREE.Vector2(0.5, 0.5);
  private readonly center = new THREE.Vector2(0.5, 0.5);
  private readonly lastCenter = new THREE.Vector2(0.5, 0.5);
  private readonly force = new THREE.Vector2();
  private readonly savedClearColor = new THREE.Color();
  private pointerActive = false;

  private velocityCurrent: THREE.WebGLRenderTarget;
  private velocityScratch: THREE.WebGLRenderTarget;
  private accumulationCurrent: THREE.WebGLRenderTarget;
  private accumulationScratch: THREE.WebGLRenderTarget;
  private readonly divergence: THREE.WebGLRenderTarget;
  private readonly pressure: THREE.WebGLRenderTarget;
  private readonly zeroPressure: THREE.WebGLRenderTarget;

  private readonly externalForce: SimulationPass;
  private readonly advection: SimulationPass;
  private readonly divergencePass: SimulationPass;
  private readonly pressurePass: SimulationPass;
  private readonly gradientSubtract: SimulationPass;
  private readonly accumulation: SimulationPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    noise: THREE.Texture,
    width: number,
    height: number,
  ) {
    this.renderer = renderer;
    this.size = new THREE.Vector2(width, height);
    this.pixel = new THREE.Vector2(1 / width, 1 / height);
    this.velocityCurrent = createTarget(width, height);
    this.velocityScratch = createTarget(width, height);
    this.accumulationCurrent = createTarget(width, height);
    this.accumulationScratch = createTarget(width, height);
    this.divergence = createTarget(width, height);
    this.pressure = createTarget(width, height);
    this.zeroPressure = createTarget(width, height);

    this.externalForce = new SimulationPass(renderer, externalForceFragmentShader, {
      uActive: { value: 0 },
      center: { value: this.center },
      force: { value: this.force },
      intensity: { value: 1 },
      lastCenter: { value: this.lastCenter },
      lastScale: { value: SOURCE.cursorRadius },
      planeRatio: { value: width / height },
      scale: { value: SOURCE.cursorRadius },
      src: { value: this.velocityCurrent.texture },
    });
    this.advection = new SimulationPass(renderer, advectionFragmentShader, {
      deceleration: { value: SOURCE.hover.deceleration },
      dt: { value: SOURCE.dt },
      fboSize: { value: this.size },
      firstNoiseScale: { value: SOURCE.advection.firstNoiseScale },
      gapAmount: { value: SOURCE.advection.gapAmount },
      gapVelocityBoost: { value: SOURCE.advection.gapVelocityBoost },
      intensityDim: { value: SOURCE.advection.intensityDim },
      noise: { value: noise },
      randomDirection: { value: SOURCE.advection.randomDirection },
      secondNoiseScale: { value: SOURCE.advection.secondNoiseScale },
      velocity: { value: this.velocityScratch.texture },
      velocityThreshold: { value: SOURCE.advection.velocityThreshold },
    });
    this.divergencePass = new SimulationPass(renderer, divergenceFragmentShader, {
      dt: { value: SOURCE.dt },
      pixel: { value: this.pixel },
      velocity: { value: this.velocityCurrent.texture },
    });
    this.pressurePass = new SimulationPass(renderer, pressureFragmentShader, {
      divergence: { value: this.divergence.texture },
      pixel: { value: this.pixel },
      pressure: { value: this.zeroPressure.texture },
    });
    this.gradientSubtract = new SimulationPass(renderer, gradientSubtractFragmentShader, {
      dt: { value: SOURCE.dt },
      pixel: { value: this.pixel },
      pressure: { value: this.pressure.texture },
      velocity: { value: this.velocityCurrent.texture },
    });
    this.accumulation = new SimulationPass(renderer, accumulationFragmentShader, {
      accumulation: { value: this.accumulationCurrent.texture },
      attenuation: { value: SOURCE.hover.attenuation },
      velocity: { value: this.velocityScratch.texture },
    });
    this.clear();
  }

  get texture() {
    return this.accumulationCurrent.texture;
  }

  setPointer(x: number, yFromTop: number) {
    this.targetCenter.set(
      THREE.MathUtils.clamp(x, 0, 1),
      THREE.MathUtils.clamp(yFromTop, 0, 1),
    );
    this.pointerActive = true;
  }

  setInactive() {
    this.pointerActive = false;
  }

  update(deltaSeconds: number) {
    this.updatePointer(deltaSeconds);

    const externalUniforms = this.externalForce.material.uniforms;
    externalUniforms.src.value = this.velocityCurrent.texture;
    externalUniforms.uActive.value = this.pointerActive && this.force.lengthSq() > 1e-9 ? 1 : 0;
    this.externalForce.render(this.velocityScratch);

    const advectionUniforms = this.advection.material.uniforms;
    advectionUniforms.velocity.value = this.velocityScratch.texture;
    this.advection.render(this.velocityCurrent);

    const divergenceUniforms = this.divergencePass.material.uniforms;
    divergenceUniforms.velocity.value = this.velocityCurrent.texture;
    this.divergencePass.render(this.divergence);

    const pressureUniforms = this.pressurePass.material.uniforms;
    pressureUniforms.divergence.value = this.divergence.texture;
    pressureUniforms.pressure.value = this.zeroPressure.texture;
    this.pressurePass.render(this.pressure);

    const gradientUniforms = this.gradientSubtract.material.uniforms;
    gradientUniforms.pressure.value = this.pressure.texture;
    gradientUniforms.velocity.value = this.velocityCurrent.texture;
    this.gradientSubtract.render(this.velocityScratch);

    const accumulationUniforms = this.accumulation.material.uniforms;
    accumulationUniforms.accumulation.value = this.accumulationCurrent.texture;
    accumulationUniforms.velocity.value = this.velocityScratch.texture;
    this.accumulation.render(this.accumulationScratch);

    const previousVelocity = this.velocityCurrent;
    this.velocityCurrent = this.velocityScratch;
    this.velocityScratch = previousVelocity;

    const previousAccumulation = this.accumulationCurrent;
    this.accumulationCurrent = this.accumulationScratch;
    this.accumulationScratch = previousAccumulation;
  }

  clear() {
    this.clearTarget(this.velocityCurrent);
    this.clearTarget(this.velocityScratch);
    this.clearTarget(this.accumulationCurrent);
    this.clearTarget(this.accumulationScratch);
    this.clearTarget(this.divergence);
    this.clearTarget(this.pressure);
    this.clearTarget(this.zeroPressure);
    this.center.copy(this.targetCenter);
    this.lastCenter.copy(this.targetCenter);
    this.force.set(0, 0);
  }

  private updatePointer(deltaSeconds: number) {
    this.lastCenter.copy(this.center);
    if (!this.pointerActive) {
      this.force.set(0, 0);
      return;
    }

    const delta = Math.min(deltaSeconds, 0.04);
    const damping = 1 - Math.exp(-SOURCE.brushDamping * delta);
    this.center.lerp(this.targetCenter, damping);
    this.force.copy(this.center).sub(this.lastCenter).multiplyScalar(SOURCE.hover.mouseForce);
  }

  private clearTarget(target: THREE.WebGLRenderTarget) {
    this.renderer.getClearColor(this.savedClearColor);
    const savedClearAlpha = this.renderer.getClearAlpha();
    this.renderer.setRenderTarget(target);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear(true, true, true);
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(this.savedClearColor, savedClearAlpha);
  }

  dispose() {
    this.externalForce.dispose();
    this.advection.dispose();
    this.divergencePass.dispose();
    this.pressurePass.dispose();
    this.gradientSubtract.dispose();
    this.accumulation.dispose();
    this.velocityCurrent.dispose();
    this.velocityScratch.dispose();
    this.accumulationCurrent.dispose();
    this.accumulationScratch.dispose();
    this.divergence.dispose();
    this.pressure.dispose();
    this.zeroPressure.dispose();
  }
}
