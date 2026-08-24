/**
 * 背景与树叶着色器。
 *
 * background：全屏天空渐变（对应 paper 着色器里的 computeBackground 逻辑放大到整屏），
 *   叠加三态雾，保证画布从未被元素覆盖的区域也有呼吸感。
 * leaves：源码的全局 1024 实例粒子层；实例矩阵由鼠标命中点写入，
 *   运动状态保存在 32×32 position pass 中，再由实例顶点着色器展开。
 */
import { GLSL_UTILS, GLSL_FOG } from "./chunks";

export const backgroundVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogDepth;
void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    vFogDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const backgroundFragmentShader = /* glsl */ `
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

float sineInOut(float t) {
  return -0.5 * (cos(3.141592653589793 * t) - 1.0);
}

void main() {
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    float baseProgress = cremap(screenUv.y, uProgressRemap.x, uProgressRemap.y, 0., 1.);
    float progress = 1. - abs((baseProgress - 0.5) * 2.);
    progress = sineInOut(progress);
    vec3 color = mix(uGroundColor, uSkyColor, progress);
    color = getFogColorWithRatio(uTime, vFogDepth, screenUv, uResolution, vWorldPosition, color, tNoiseTexture, uFogState.x, uFogState.y);
    gl_FragColor = vec4(color, 1.0);
    gl_FragColor = linearToSrgb(gl_FragColor);
}
`;

export const leavesVertexShader = /* glsl */ `
attribute float aIndices;
attribute float aRandomScale;
attribute float aRandomTexture;
attribute vec3 aRandomRotate;

varying float vRandomTexture;
varying float vFadeOut;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogDepth;

uniform float uParticleSize;
uniform float uDuration;
uniform float uAmplitude;
uniform float uSize;
uniform float uRotationSpeed;
uniform float uLifeTime;
uniform float uSpeedReveal;
uniform sampler2D uPass1Texture;

mat4 rotate3d(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat4(
        oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, 0.0,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, 0.0,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c, 0.0,
        0.0, 0.0, 0.0, 1.0
    );
}

void main() {
    vec2 pass1Uv = uv;
    pass1Uv.y = 1.0 - pass1Uv.y;
    pass1Uv.x = mod(aIndices, uSize) / uSize;
    pass1Uv.y = floor(aIndices / uSize) / uSize;

    vec4 data = texture2D(uPass1Texture, pass1Uv);
    float speedReveal = data.r * uSpeedReveal;
    float angle = data.g;
    float lifetime = data.b * uLifeTime;
    float projection = (1.0 - pow(uDuration, -lifetime)) * uAmplitude;
    float posX = projection * cos(angle);
    float posY = projection * sin(angle);

    mat4 rotationMatrix = rotate3d(
        vec3(aRandomRotate.x, aRandomRotate.y, aRandomRotate.z),
        projection * aRandomScale * uRotationSpeed
    );
    vec4 leafPosition = rotationMatrix * vec4(position * uParticleSize, 1.0);
    leafPosition *= aRandomScale * speedReveal;
    leafPosition.y -= posY;
    leafPosition.z -= posX;

    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(leafPosition.xyz, 1.0);
    vWorldPosition = worldPosition.xyz;
    vec4 mvPosition = viewMatrix * worldPosition;
    vFogDepth = -mvPosition.z;
    vRandomTexture = aRandomTexture;
    vFadeOut = 1.0 - projection;
    vUv = uv;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const leavesFragmentShader = /* glsl */ `
precision highp float;

${GLSL_UTILS}
${GLSL_FOG}

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D tNoiseTexture;
uniform sampler2D uTexture;
uniform vec3 uTintColor;
uniform vec2 uFogState;

varying float vRandomTexture;
varying float vFadeOut;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogDepth;

void main() {
    vec2 rUvs = vec2(vUv.x * 0.2 + vRandomTexture, vUv.y);
    vec4 baseColor = texture2D(uTexture, rUvs);
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    vec3 color = baseColor.rgb * uTintColor;
    color = getFogColorWithRatio(
        uTime, vFogDepth, screenUv, uResolution, vWorldPosition,
        color, tNoiseTexture, uFogState.x, uFogState.y
    );
    float alpha = baseColor.a * (vFadeOut * 0.625 + 0.6);
    if (alpha < 0.002) discard;
    gl_FragColor = linearToSrgb(vec4(color, alpha));
}
`;

/** 源码 F3.positionPass：每个像素保存 speed / angle / lifetime。 */
export const leavesPositionVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const leavesPositionFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform float uDelta;
uniform float uSize;
uniform float uCurrentIndex;
uniform float uAngle;
uniform float uVelocity;
uniform float uMaxForce;
uniform sampler2D uInputTexture;
uniform sampler2D uBaseTexture;

void main() {
    vec2 uv = vUv;
    float index = floor(uv.x * uSize) + floor(uv.y * uSize) * uSize;
    vec4 baseData = texture2D(uBaseTexture, uv);
    vec4 data = texture2D(uInputTexture, uv);
    float speed = data.r;
    float angle = data.g;
    float lifetime = data.b;
    if (uTime == 0.0) lifetime += baseData.b;
    lifetime += uDelta * baseData.a;
    if (abs(uCurrentIndex - index) < 0.5) {
        speed = clamp(uVelocity, 0.0, uMaxForce);
        angle = uAngle;
        lifetime = 0.0;
    }
    gl_FragColor = vec4(speed, angle, lifetime, 1.0);
}
`;
