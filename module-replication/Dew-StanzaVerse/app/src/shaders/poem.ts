/**
 * Poem 专用 shader：TextMesh 的三瓦片文字 pass 与 Full Screen 背景 pass。
 * 两者都直接对应原始 Poem view 的独立组件，而不是静态 poem/text.png。
 */

/**
 * 原始 TextMesh 使用的 Poem 文字 pass。
 * 与主 UI 的窗口采样不同，这里直接消费 TextCanvas 的三个 UV 瓦片，
 * 由 uTextRatio/uTileRatio 复现原始元素尺寸与 Canvas 尺寸之间的映射。
 */
export const poemTextFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D map;
uniform sampler2D uNoise;

uniform vec2 uCursorPosition;
uniform float uCursorFactor;
uniform float uTileRatio;
uniform float uQuadRatio;
uniform float uTextRatio;
uniform float uScrollProgress;
uniform float uUvScrollProgress;
uniform float uVisibleArea;

uniform vec4 uSharpUvs;
uniform vec4 uLowBlurUvs;
uniform vec4 uHighBlurUvs;

uniform float uClampFadeOverride;
uniform float uFadeProgress;
uniform float uFadeNoiseSize;
uniform float uWriteProgress;

varying vec2 vUv;

float remapLocal(float value, float start1, float stop1, float start2, float stop2) {
  float r = start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  return clamp(r, min(start2, stop2), max(start2, stop2));
}

float remapRawLocal(float value, float start1, float stop1, float start2, float stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

float quarticInOutLocal(float t) {
  return t < 0.5
    ? +8.0 * pow(t, 4.0)
    : -8.0 * pow(t - 1.0, 4.0) + 1.0;
}

float cubicInLocal(float t) { return t * t * t; }
float cubicOutLocal(float t) {
  float f = t - 1.0;
  return f * f * f + 1.0;
}
float quadraticOutLocal(float t) { return -t * (t - 2.0); }

float sampleAlpha(vec2 uv, vec4 uvRemap) {
  float quadToTextRatio = uQuadRatio / uTextRatio;
  vec2 sampleUvs = uv;
  sampleUvs.x = ((sampleUvs.x - 0.5) * quadToTextRatio) + 0.5;
  vec2 boundUvs = sampleUvs;
  sampleUvs.x = remapRawLocal(sampleUvs.x, 0., 1., uvRemap.x, uvRemap.z);
  sampleUvs.y = remapRawLocal(sampleUvs.y, 0., 1., uvRemap.y, uvRemap.w);
  sampleUvs.y = 1. - sampleUvs.y;
  sampleUvs.y /= uTextRatio;
  sampleUvs.y *= uTileRatio;
  sampleUvs.y += uScrollProgress * (uvRemap.w - uvRemap.y);
  float texel = texture2D(map, sampleUvs).a;
  if (boundUvs.x < -0.05 || boundUvs.x > 0.95) return 0.;
  return texel;
}

void main() {
  float quadToTextRatio = uQuadRatio / uTextRatio;
  vec2 noiseBaseUv = vUv;
  noiseBaseUv.x = ((noiseBaseUv.x - 0.5) * quadToTextRatio) + 0.5;

  vec4 distNoise = texture2D(uNoise, (noiseBaseUv - vec2(0.6, uUvScrollProgress)) * 1.2);
  float distNoiseR = quarticInOutLocal(distNoise.r);
  float size = 0.05;
  float dist = length((vUv - uCursorPosition) / vec2(1., uQuadRatio));
  dist = abs(0.15 - dist);
  dist = remapLocal(dist, 0., size / 2. + distNoiseR * size * 4., 1., 0.);
  dist = smoothstep(0., 1., dist) * distNoise.g;

  float clampFadeNoise = texture2D(uNoise, noiseBaseUv * 0.7).r;
  clampFadeNoise = (clampFadeNoise - 0.5) * 2. * 0.2;
  float clampFade = abs(vUv.y + clampFadeNoise - 0.5) * 2. / uVisibleArea;
  float baseClampFade = clampFade;
  clampFade = mix(clampFade, 1., uClampFadeOverride);
  clampFade = cubicInLocal(clampFade);

  vec4 fadeDisplacementNoise = texture2D(uNoise, (noiseBaseUv - vec2(0., uUvScrollProgress)) * uFadeNoiseSize);
  float writeAnimationProgress = min(
    uWriteProgress + quarticInOutLocal(fadeDisplacementNoise.r) * 0.5 * cubicInLocal(uWriteProgress),
    1.
  );

  float fadeDisplacementAmount = 0.2;
  float fadeProgress = pow(max(uFadeProgress - quarticInOutLocal(fadeDisplacementNoise.b) * 0.5, 0.), 2.) * 4.;
  vec2 fadeDisplacement = (fadeDisplacementNoise.rg - 0.5) * 2. * fadeProgress * fadeDisplacementAmount;
  fadeDisplacement += (fadeDisplacementNoise.gb - 0.5) * 2. * writeAnimationProgress * fadeDisplacementAmount;
  dist *= smoothstep(0.5, 0., fadeProgress) * smoothstep(0.5, 0., writeAnimationProgress) * uCursorFactor;

  vec2 displacement = -(fadeDisplacementNoise.br - 0.5) * 2. * vec2(1., mix(0.1, 1., writeAnimationProgress));
  float displacementAmount = max(clampFade * 0.4, dist * 0.2) * 0.15;
  displacement = displacement * displacementAmount - vec2(0.01, 0.);

  float noiseBlur = quarticInOutLocal(texture2D(uNoise, (noiseBaseUv - vec2(0.3, uUvScrollProgress)) * 0.44).g);
  float clampFadeWithDist = mix(baseClampFade, 1., dist);
  float blurAmount = smoothstep(
    mix(0.5, 0.3, smoothstep(0.1, 0.4, clampFadeWithDist * clampFadeWithDist)),
    1.,
    noiseBlur
  ) * mix(clampFadeWithDist, 0.7, dist);
  blurAmount = max(clampFade * 0.7, blurAmount);
  blurAmount = max(cubicOutLocal(length(fadeDisplacement) * 15.), blurAmount);
  blurAmount = max(writeAnimationProgress, blurAmount);

  vec2 uv = vUv + displacement + fadeDisplacement * 0.5;
  float sharpTexture = sampleAlpha(uv, uSharpUvs);
  sharpTexture = sharpTexture - 0.5;
  sharpTexture = clamp(sharpTexture / max(fwidth(sharpTexture), 0.0001) + 0.5, 0.0, 1.0);
  float lowBlurTexture = sampleAlpha(uv, uLowBlurUvs);
  float highBlurTexture = sampleAlpha(uv, uHighBlurUvs);

  float sharpAmount = smoothstep(0.5, 0., blurAmount);
  float lowBlurAmount = smoothstep(0.5, 0., abs(blurAmount - 0.5));
  float highBlurAmount = smoothstep(0.5, 1.0, blurAmount);
  float alpha = sharpTexture * sharpAmount + lowBlurTexture * lowBlurAmount + highBlurTexture * highBlurAmount;
  alpha = min(alpha, 1.);
  alpha = remapLocal(alpha, quadraticOutLocal(writeAnimationProgress) * 0.5, 1., 0., 1.);
  alpha *= (1. - uFadeProgress) * (1. - clampFade);

  gl_FragColor = vec4(vec3(0.), alpha);
}
`;

/** 原始 Poem Background：Full Screen simulation + watercolor paper。 */
export const poemBackgroundVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec2 vSimulationUv;
uniform vec4 uSimulationRemap;
uniform float uRatio;

float remapBackground(float value, float start1, float stop1, float start2, float stop2) {
  return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

vec2 remapAtlasBackground(vec2 uv, vec4 atlasRemap) {
  vec2 result = uv;
  result.x = remapBackground(result.x, 0., 1., atlasRemap.x, atlasRemap.x + atlasRemap.z);
  result.y = remapBackground(result.y, 0., 1., atlasRemap.y, atlasRemap.y + atlasRemap.w);
  return result;
}

void main() {
  vec2 simulationUv = uv;
  simulationUv.y = ((simulationUv.y - 0.5) / uRatio) + 0.5;
  simulationUv.y = 1. - simulationUv.y;
  simulationUv = remapAtlasBackground(simulationUv, uSimulationRemap);
  gl_Position = vec4(position, 1.);
  vSimulationUv = simulationUv;
  vUv = uv;
}
`;

export const poemBackgroundFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec2 vSimulationUv;
uniform sampler2D uSimulation;
uniform float uSimulationAlpha;
uniform sampler2D uPaperTexture;
uniform float uRatio;
uniform vec3 uColor;
uniform vec3 uPaintColor1;
uniform vec3 uPaintColor2;

void main() {
  vec4 data = texture2D(uSimulation, vSimulationUv);
  float vel = data.b;
  float blend = smoothstep(0., 0.1, vel);

  vec2 paperUv = vUv;
  paperUv.x *= uRatio;
  paperUv *= 3.;
  vec4 paperTexture = texture2D(uPaperTexture, paperUv);

  vec3 backgroundColor = mix(uPaintColor1, uPaintColor2, data.a);

  vec3 color = mix(uColor, backgroundColor, blend * uSimulationAlpha);
  color *= mix(vec3(1.), paperTexture.rgb, uSimulationAlpha);
  gl_FragColor = vec4(color, 1.);
}
`;
