/**
 * Source Cutouts pass (the paper-hole shadow layer).
 *
 * ShadowProjection writes the screen-space shadow texture; this pass consumes
 * it together with each paper's SDF and draws the soft cutout directly below
 * the paper. The original bundle creates both passes independently.
 */
import { GLSL_UTILS, GLSL_FOG } from "./chunks";

export const cutoutShadowVertexShader = /* glsl */ `
attribute vec4 tangent;
attribute vec2 aSdfScale;
attribute vec2 aSdfOriginSize;
attribute vec2 aSdfPlaneSize;
attribute vec4 aSdfAtlasRemap;
attribute float aAlpha;

varying vec2 vUv;
varying vec3 vTangentViewPos;
varying vec3 vTangentFragPos;
varying vec3 vWorldPosition;
varying float vFogDepth;
varying vec2 vSdfScale;
varying vec2 vSdfOriginSize;
varying vec2 vSdfPlaneSize;
varying vec4 vSdfAtlasRemap;
varying float vAlpha;

void main() {
  mat4 worldMatrix = modelMatrix * instanceMatrix;
  vec4 worldPosition = worldMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  vec3 transformedNormal = normalize(mat3(worldMatrix) * -normal.xyz);
  vec3 transformedTangent = normalize(mat3(worldMatrix) * -tangent.xyz);
  vec3 bitangent = normalize(cross(transformedNormal, transformedTangent) * tangent.w);
  mat3 tangentMatrix = transpose(mat3(transformedTangent, bitangent, transformedNormal));
  vTangentViewPos = tangentMatrix * cameraPosition;
  vTangentFragPos = tangentMatrix * worldPosition.xyz;

  vUv = uv;
  vSdfScale = aSdfScale;
  vSdfOriginSize = aSdfOriginSize;
  vSdfPlaneSize = aSdfPlaneSize;
  vSdfAtlasRemap = aSdfAtlasRemap;
  vAlpha = aAlpha;

  vec4 mvPosition = viewMatrix * worldPosition;
  vFogDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const cutoutShadowFragmentShader = /* glsl */ `
precision highp float;

${GLSL_UTILS}
${GLSL_FOG}

varying vec2 vUv;
varying vec3 vTangentViewPos;
varying vec3 vTangentFragPos;
varying vec3 vWorldPosition;
varying float vFogDepth;
varying vec2 vSdfScale;
varying vec2 vSdfOriginSize;
varying vec2 vSdfPlaneSize;
varying vec4 vSdfAtlasRemap;
varying float vAlpha;

uniform sampler2D uSdfTexture;
uniform sampler2D uShadowMap;
uniform vec3 uLightColor;
uniform vec3 uShadowColor;
uniform float uDepth;
uniform float uShadowSize;
uniform float uCutoutShadowIntensity;
uniform float uPaperShadowIntensity;
uniform float uNoise;
uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D tNoiseTexture;
uniform vec2 uFogState;

const float BASE = 255.0;
const float BASE2 = BASE * BASE;
const float BASE3 = BASE * BASE * BASE;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float getSdfFromAtlas(vec2 uv) {
  vec2 center = vSdfAtlasRemap.xy + vSdfAtlasRemap.zw * 0.5;
  uv = 1.0 - uv;
  uv = vSdfAtlasRemap.xy + uv * vSdfAtlasRemap.zw;
  uv = ((uv - center) / vSdfScale) + center;
  vec4 value = texture2D(uSdfTexture, uv) * BASE;
  float pixels = ((value.x * BASE2 + value.y * BASE + value.z) - BASE3 * 0.5) / 1000.0;
  return pixels / (max(vSdfOriginSize.x, vSdfOriginSize.y) * 0.5);
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  vec3 viewDir = normalize(vTangentViewPos - vTangentFragPos);
  float planeRatio = vSdfPlaneSize.x / max(vSdfPlaneSize.y, 0.0001);

  vec2 offset = viewDir.xy / max(viewDir.z, 0.0001) * uDepth * vec2(-1.0, 1.0);
  offset.x *= planeRatio;
  vec2 layerUv = vUv + offset / max(vSdfPlaneSize.x, 0.0001);
  vec2 random = vec2(rand(layerUv), rand(layerUv + 1.0));
  float shadowDist = getSdfFromAtlas(layerUv + (random - 0.5) * uNoise);
  float compensatedDist = shadowDist * max(vSdfPlaneSize.x, vSdfPlaneSize.y);
  float shadowFromCutout = smoothstep(uShadowSize, -uShadowSize, compensatedDist);

  float shadowFromMap = texture2D(uShadowMap, screenUv).r;
  float shadow = min(
    mix(1.0, shadowFromCutout, uCutoutShadowIntensity),
    mix(1.0, shadowFromMap, uPaperShadowIntensity)
  );

  float sdf = getSdfFromAtlas(vUv);
  float distAlpha = clamp(sdf / fwidth(sdf) + 0.5, 0.0, 1.0);
  vec3 color = uLightColor - (1.0 - shadow);
  color = getFogColorWithRatio(
    uTime, vFogDepth, screenUv, uResolution, vWorldPosition,
    color, tNoiseTexture, uFogState.x, uFogState.y
  );
  float alpha = (1.0 - distAlpha) * vAlpha;
  gl_FragColor = linearToSrgb(vec4(color, alpha));
  if (gl_FragColor.a < 0.01) discard;
}
`;
