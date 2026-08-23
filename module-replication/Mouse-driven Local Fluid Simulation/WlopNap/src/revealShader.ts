import * as THREE from 'three';

const REVEAL_POINT_COUNT = 4;
const SOURCE_VISIBLE_PROGRESS = 3.8;

export const revealVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vSimulationUv;

  #define REVEAL_POINTS_COUNT 4
  uniform mat4 uRevealPoints;
  uniform mat4 uRevealPointsPos;
  varying vec4 vRevealPoints[REVEAL_POINTS_COUNT];
  varying vec2 vRevealPointsPos[REVEAL_POINTS_COUNT];

  void main() {
    vec2 simulationUv = uv;
    simulationUv.y = 1.0 - simulationUv.y;

    mat4 revealPoints = uRevealPoints;
    vRevealPoints[0] = revealPoints[0];
    vRevealPoints[1] = revealPoints[1];
    vRevealPoints[2] = revealPoints[2];
    vRevealPoints[3] = revealPoints[3];

    mat4 revealPointsPos = uRevealPointsPos;
    vRevealPointsPos[0] = revealPointsPos[0].xy;
    vRevealPointsPos[1] = revealPointsPos[1].xy;
    vRevealPointsPos[2] = revealPointsPos[2].xy;
    vRevealPointsPos[3] = revealPointsPos[3].xy;

    gl_Position = vec4(position, 1.0);
    vSimulationUv = simulationUv;
    vUv = uv;
  }
`;

export const revealFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec2 vSimulationUv;

  uniform sampler2D uSimulation;
  uniform vec2 uResolution;
  uniform vec2 uPaintTextureSize;
  uniform vec3 uColor;
  uniform sampler2D uPaintTexture;
  uniform sampler2D uPaintTexture2;
  uniform sampler2D uNoiseTexture;
  uniform float uVisibleProgress;

  #define REVEAL_POINTS_COUNT 4
  varying vec4 vRevealPoints[REVEAL_POINTS_COUNT];
  varying vec2 vRevealPointsPos[REVEAL_POINTS_COUNT];

  #ifndef lt
  #define lt(x, y) (1.0 - step(y, x))
  #endif

  #ifndef ge
  #define ge(x, y) step(y, x)
  #endif

  float cremap(float value, float start1, float stop1, float start2, float stop2) {
    float result = start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
    return clamp(result, min(start2, stop2), max(start2, stop2));
  }

  vec2 getTextureCoverUv(
    vec2 baseUv,
    vec2 resolution,
    vec2 textureInfos,
    vec2 textureScale
  ) {
    vec2 uv = baseUv;
    vec2 scale = textureScale;
    vec2 offset = vec2(0.0);
    float textureRatio = resolution.x / resolution.y;
    float imageRatio = textureInfos.x / textureInfos.y;
    float diffRatio = imageRatio / textureRatio;

    scale.x *= lt(diffRatio, 1.0) + ge(diffRatio, 1.0) * diffRatio;
    scale.y *= lt(diffRatio, 1.0) / diffRatio + ge(diffRatio, 1.0);
    offset.x += (scale.x - 1.0) * 0.5;
    offset.y += (scale.y - 1.0) * 0.5;
    uv /= scale;
    uv += offset / scale;
    return uv;
  }

  vec2 rotateUV(vec2 uv, float rotation) {
    float mid = 0.5;
    return vec2(
      cos(rotation) * (uv.x - mid) + sin(rotation) * (uv.y - mid) + mid,
      cos(rotation) * (uv.y - mid) - sin(rotation) * (uv.x - mid) + mid
    );
  }

  float easeQuartOut(float t) {
    float inverseT = t - 1.0;
    return inverseT * inverseT * inverseT * (1.0 - t) + 1.0;
  }

  float ifGreater(float value1, float value2, float result1, float result2) {
    float coefficient = 1.0 - step(value1, value2);
    return mix(result2, result1, coefficient);
  }

  float circle(vec2 difference, float radius) {
    return length(difference) - radius;
  }

  float getInkMask(
    float noise,
    vec2 position,
    vec2 startPoint,
    float progress,
    float power,
    float sharpRatioMin,
    float sharpRatioMax
  ) {
    float sdf = -circle(position + startPoint, 1.0) + progress;
    float baseSdf = sdf;
    float intensity = pow(sdf, power) * noise;
    if (baseSdf < 0.0) intensity = 0.0;
    return cremap(intensity, sharpRatioMin, sharpRatioMax, 0.0, 1.0);
  }

  float getInkIntensity(
    vec2 position,
    vec2 startPoint,
    float progressMask,
    float progressIntensity
  ) {
    float sdf = -circle(position + startPoint, 0.0) + progressMask;
    float distanceValue = max(0.0, 1.0 - sdf);
    distanceValue = cremap(distanceValue, 0.6, 1.0, 0.0, 1.0) * (1.0 - progressIntensity);
    return 0.8 + 1.2 * pow(distanceValue, 4.0);
  }

  vec4 computeInkReveal(
    vec3 backgroundColor,
    vec3 paintColor,
    vec2 uv,
    float progress,
    float planeRatio,
    sampler2D noiseTexture,
    vec4 points[REVEAL_POINTS_COUNT],
    vec2 pointsPos[REVEAL_POINTS_COUNT],
    float progressMax
  ) {
    vec2 position = uv;
    position.x *= planeRatio;
    position.x -= planeRatio * 0.5 - 0.5;

    vec4 noiseColor = texture2D(noiseTexture, position);
    float noise1 = noiseColor.x;
    float noise2 = noiseColor.y;
    float noise3 = noiseColor.z;
    float power = 5.0;
    float sharpRatioMin = 0.90;
    float sharpRatioMax = 1.0;
    vec3 inkColor = backgroundColor;
    float globalIntensity = 0.0;

    for (int i = 0; i < REVEAL_POINTS_COUNT; ++i) {
      vec4 point = points[i];
      vec2 startPoint = -pointsPos[i];
      startPoint.x *= planeRatio;
      startPoint.x += planeRatio * 0.5 - 0.5;
      float pointScale = point.x;
      float startTime = point.y;
      float stepDuration = point.z;
      float progressMask = cremap(
        progress,
        startTime,
        startTime + stepDuration,
        0.0,
        progressMax
      );
      progressMask = easeQuartOut(progressMask / progressMax) * progressMax;
      progressMask *= pointScale;
      float oddCoefficient = mod(float(i), 2.0);
      float pointNoise1 = mix(noise1, noise2, oddCoefficient);
      float pointNoise2 = mix(noise2, noise3, oddCoefficient);
      float progress2Coefficient = mix(0.85, 0.92, oddCoefficient);
      float intensity1 = getInkMask(
        pointNoise1,
        position,
        startPoint,
        progressMask,
        power,
        sharpRatioMin,
        sharpRatioMax
      );
      float intensity2 = getInkMask(
        pointNoise2,
        position,
        startPoint,
        progressMask * progress2Coefficient,
        power,
        sharpRatioMin,
        sharpRatioMax
      );
      float progressIntensity = cremap(
        progress,
        startTime + stepDuration * 0.5,
        startTime + stepDuration,
        0.0,
        1.0
      );
      intensity1 *= getInkIntensity(position, startPoint, progressMask, progressIntensity);
      intensity2 *= getInkIntensity(position, startPoint, progressMask, progressIntensity);
      float alpha = 0.5 + 0.5 * float(i) / float(REVEAL_POINTS_COUNT);
      inkColor = mix(inkColor, paintColor, intensity1 * alpha);
      inkColor = mix(inkColor, paintColor, intensity2 * alpha);
      float pointIntensity = (intensity1 + intensity2) * alpha;
      globalIntensity = ifGreater(
        pointIntensity,
        globalIntensity,
        pointIntensity,
        globalIntensity
      );
    }

    return vec4(inkColor, globalIntensity);
  }

  void main() {
    vec4 data = texture2D(uSimulation, vSimulationUv);
    float velocity = data.b;
    float blend = smoothstep(0.0, 0.1, velocity);
    float ratio = uResolution.x / uResolution.y;
    vec2 paintUv = getTextureCoverUv(
      vUv,
      uResolution,
      uPaintTextureSize,
      vec2(1.0)
    );
    vec3 paintColor = texture2D(uPaintTexture, paintUv).rgb;
    vec3 paintColor2 = texture2D(uPaintTexture2, paintUv).rgb;

    // Exact local interaction from the source full-paint material.
    vec3 color = mix(paintColor, paintColor2, blend);
    color *= 1.0 + (blend - 0.5) * 0.1;

    vec4 inkColor = computeInkReveal(
      uColor,
      color,
      vUv,
      uVisibleProgress,
      ratio,
      uNoiseTexture,
      vRevealPoints,
      vRevealPointsPos,
      0.65
    );
    gl_FragColor = inkColor;
  }
`;

export interface RevealMaterialAssets {
  base: THREE.Texture;
  fluid: THREE.Texture;
  image: THREE.Texture;
  noise: THREE.Texture;
}

function clampedRemap(
  value: number,
  start1: number,
  stop1: number,
  start2: number,
  stop2: number,
) {
  const result = start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  return THREE.MathUtils.clamp(result, Math.min(start2, stop2), Math.max(start2, stop2));
}

function createRevealPointMatrices(ratio: number) {
  const positions = Array.from({ length: REVEAL_POINT_COUNT }, () => new THREE.Vector2());
  const information = Array.from({ length: REVEAL_POINT_COUNT }, () => new THREE.Vector4());
  const startTimes = [0, 0.2, 0.4, 0.6];
  const ratioFactor = Math.max(0, clampedRemap(ratio, 1, 4, 0, 1));
  const usedStartTimes: number[] = [];

  information.forEach((point, index) => {
    const position = positions[index];
    if (index === information.length - 1) {
      position.set(0.5, 0.5);
      point.x = 0.95 * (1 + 2.5 * ratioFactor) * 1.5;
      point.y = 1.5 * startTimes[startTimes.length - 1];
      point.z = Math.min(8, point.y + 4 * (1 + ratioFactor)) - point.y;
      return;
    }

    position.x = 0.1 + (0.9 * index) / (information.length - 1);
    position.x += 0.2 * Math.random() - 0.1;
    const lowerY = 0.4 + 0.3 * ratioFactor;
    position.y = lowerY + (1 - lowerY) * Math.random();
    point.x = (0.6 + 0.4 * Math.random()) * (1 + ratioFactor);
    do {
      point.y = startTimes[Math.floor(Math.random() * startTimes.length)];
    } while (usedStartTimes.includes(point.y));
    usedStartTimes.push(point.y);
    point.z = Math.min(5, point.y + 2.4 * (1 + ratioFactor)) - point.y;
  });

  const positionsMatrix = new THREE.Matrix4().set(
    positions[0].x, positions[1].x, positions[2].x, positions[3].x,
    positions[0].y, positions[1].y, positions[2].y, positions[3].y,
    0, 0, 0, 0,
    0, 0, 0, 0,
  );
  const informationMatrix = new THREE.Matrix4().set(
    information[0].x, information[1].x, information[2].x, information[3].x,
    information[0].y, information[1].y, information[2].y, information[3].y,
    information[0].z, information[1].z, information[2].z, information[3].z,
    information[0].w, information[1].w, information[2].w, information[3].w,
  );
  return { informationMatrix, positionsMatrix };
}

export function createRevealMaterial(assets: RevealMaterialAssets) {
  const revealPoints = createRevealPointMatrices(16 / 9);
  return new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    fragmentShader: revealFragmentShader,
    transparent: true,
    uniforms: {
      uColor: { value: new THREE.Color('#fff7e5') },
      uNoiseTexture: { value: assets.noise },
      // In the source, idle accumulation.B is 1 and local fluid motion drives
      // it toward 0. Put the requested white-gray state in slot 2 and the
      // untouched source RGB in slot 1 so the original mix formula reveals it.
      uPaintTexture: { value: assets.image },
      uPaintTexture2: { value: assets.base },
      uPaintTextureSize: { value: new THREE.Vector2(3840, 2160) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uRevealPoints: { value: revealPoints.informationMatrix },
      uRevealPointsPos: { value: revealPoints.positionsMatrix },
      uSimulation: { value: assets.fluid },
      uVisibleProgress: { value: SOURCE_VISIBLE_PROGRESS },
    },
    vertexShader: revealVertexShader,
  });
}

export function updateRevealPointMatrices(material: THREE.ShaderMaterial, ratio: number) {
  const revealPoints = createRevealPointMatrices(ratio);
  material.uniforms.uRevealPoints.value.copy(revealPoints.informationMatrix);
  material.uniforms.uRevealPointsPos.value.copy(revealPoints.positionsMatrix);
}
