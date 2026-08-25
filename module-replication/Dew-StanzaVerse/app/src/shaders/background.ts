/**
 * Source fullscreen Background pass (extracted shader pair 27/28).
 *
 * The pass is rendered through ShadowProjection's fullscreen camera in this
 * reconstruction, so the vertex shader keeps the source depth reconstruction
 * and receives the main camera view matrix explicitly for fog depth. The
 * fragment contract remains source-shaped: Background and Lighting are shared
 * uniforms, the ratio is explicit, and the pass owns no shadow subtraction.
 */
import { GLSL_FOG, GLSL_UTILS } from "./chunks";

export const backgroundVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogDepth;

uniform mat4 uProjectionInverse;
uniform mat4 uViewMatrixInv;
uniform mat4 uViewMatrix;

vec3 worldPosFromDepth(float depth) {
    float z = depth * 2.0 - 1.0;

    vec4 clipSpacePosition = vec4(vUv * 2.0 - 1.0, z, 1.0);
    vec4 viewSpacePosition = uProjectionInverse * clipSpacePosition;

    viewSpacePosition /= viewSpacePosition.w;

    vec4 worldSpacePosition = uViewMatrixInv * viewSpacePosition;
    return worldSpacePosition.xyz;
}

void main() {
    vUv = uv;
    vFogDepth = -(uViewMatrix * vec4(position, 1.0)).z;
    vWorldPosition = worldPosFromDepth(1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const backgroundFragmentShader = /* glsl */ `
precision highp float;

${GLSL_UTILS}
${GLSL_FOG}

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D tNoiseTexture;
uniform vec2 uFogState;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogDepth;

uniform float uRatio;

struct Lighting {
    vec2 groundSpecularScale;
    vec2 groundSpecularOffset;
    float groundSpecularStrength;
    vec2 specularCenter;
    vec2 specularScale;
    vec2 specularOffset;
    float specularStrength;
};

uniform Lighting uLighting;

struct Background {
    vec3 groundColor;
    vec3 skyColor;
    vec2 progressRemap;
};

uniform Background uBackground;

float sineInOut(float t) {
    return -0.5 * (cos(3.141592653589793 * t) - 1.0);
}

float computeLighting(Lighting lightingConfig, float screenRatio, vec2 screenUv) {
    vec2 specularVector = (screenUv - (lightingConfig.specularCenter + lightingConfig.specularOffset)) / lightingConfig.specularScale;
    specularVector.x *= screenRatio;
    float specular = 1.0 - min(length(specularVector), 1.0);
    specular = sineInOut(specular);
    return lightingConfig.specularStrength * specular;
}

vec3 computeBackground(Background backgroundConfig, vec2 screenUv) {
    float baseProgress = cremap(screenUv.y, backgroundConfig.progressRemap.x, backgroundConfig.progressRemap.y, 0.0, 1.0);
    float progress = 1.0 - abs((baseProgress - 0.5) * 2.0);
    progress = sineInOut(progress);
    return mix(backgroundConfig.groundColor, backgroundConfig.skyColor, progress);
}

void main() {
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    vec3 background = computeBackground(uBackground, vUv);
    float lighting = computeLighting(uLighting, uRatio, vUv);

    vec3 color = background + lighting;
    color = getFogColorWithRatio(
        uTime, vFogDepth, screenUv, uResolution, vWorldPosition,
        color, tNoiseTexture, uFogState.x, uFogState.y
    );

    gl_FragColor = linearToSrgb(vec4(color, 1.0));
}
`;
