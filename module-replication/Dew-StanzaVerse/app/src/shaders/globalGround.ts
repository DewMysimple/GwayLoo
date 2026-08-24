/** Source global Ground pass: the GLB Ground plane consumes the projected shadow map. */
import { GLSL_FOG, GLSL_UTILS } from "./chunks";

export const globalGroundVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogDepth;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    gl_Position = projectionMatrix * mvPosition;
    vFogDepth = -mvPosition.z;
    vWorldPosition = worldPosition.xyz;
    vUv = uv;
}
`;

export const globalGroundFragmentShader = /* glsl */ `
precision highp float;

${GLSL_UTILS}
${GLSL_FOG}

varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vFogDepth;

uniform sampler2D uShadowMap;
uniform float uShadowStrength;
uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D tNoiseTexture;
uniform vec2 uFogState;

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

vec3 computeBackground(Background backgroundConfig, vec2 screenUv) {
    float baseProgress = cremap(screenUv.y, backgroundConfig.progressRemap.x, backgroundConfig.progressRemap.y, 0.0, 1.0);
    float progress = 1.0 - abs((baseProgress - 0.5) * 2.0);
    progress = sineInOut(progress);
    return mix(backgroundConfig.groundColor, backgroundConfig.skyColor, progress);
}

float computeLighting(Lighting lightingConfig, float screenRatio, vec2 screenUv, vec3 worldPosFromCamera) {
    vec2 specularVector = (screenUv - (lightingConfig.specularCenter + lightingConfig.specularOffset)) / lightingConfig.specularScale;
    specularVector.x *= screenRatio;
    float specular = 1.0 - min(length(specularVector), 1.0);
    specular = sineInOut(specular);
    float lighting = lightingConfig.specularStrength * specular;

    vec2 groundSpecularVector = (worldPosFromCamera.xz - lightingConfig.groundSpecularOffset) / lightingConfig.groundSpecularScale;
    float groundSpecular = 1.0 - min(length(groundSpecularVector), 1.0);
    groundSpecular = sineInOut(groundSpecular);
    lighting += lightingConfig.groundSpecularStrength * groundSpecular;

    return lighting;
}

void main() {
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    float shadow = 1.0 - texture2D(uShadowMap, screenUv).r;
    float ratio = uResolution.x / uResolution.y;

    vec3 color = computeBackground(uBackground, screenUv);
    color -= shadow * uShadowStrength;
    color += computeLighting(uLighting, ratio, screenUv, vWorldPosition - cameraPosition);
    color = getFogColorWithRatio(
        uTime, vFogDepth, screenUv, uResolution, vWorldPosition,
        color, tNoiseTexture, uFogState.x, uFogState.y
    );

    gl_FragColor = linearToSrgb(vec4(color, 1.0));
}
`;
