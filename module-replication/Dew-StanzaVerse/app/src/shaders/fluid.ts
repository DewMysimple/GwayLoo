/**
 * 图集化 Stable Fluids passes。
 *
 * 每个实例是一张纸（包含它的地面区域）的独立模拟 tile。顶点着色器把
 * 单位平面映射进动态打包后的 atlas；片元阶段通过 vRegion 把所有邻域
 * 采样限制在当前 tile 内，避免相邻纸片串色。
 */

export const simVertexShader = /* glsl */ `
attribute vec4 aRegion;
attribute float aPaperIndex;
attribute vec2 aFboSize;
attribute float aDeceleration;
attribute float aAttenuation;
attribute float aDt;
attribute float aWasActive;

varying vec2 vLocalUv;
varying vec2 vSimulationUv;
varying vec4 vRegion;
varying float vPaperIndex;
varying vec2 vFboSize;
varying float vDeceleration;
varying float vAttenuation;
varying float vDt;
varying float vWasActive;

void main() {
    vLocalUv = uv;
    vRegion = aRegion;
    vPaperIndex = aPaperIndex;
    vFboSize = aFboSize;
    vDeceleration = aDeceleration;
    vAttenuation = aAttenuation;
    vDt = aDt;
    vWasActive = aWasActive;
    vSimulationUv = aRegion.xy + uv * aRegion.zw;
    vec2 clip = vSimulationUv * 2.0 - 1.0;
    gl_Position = vec4(clip, 0.0, 1.0);
}
`;

/** Source external-force pass: ratio-corrected ellipse in the active tile. */
export const simSplatFragment = /* glsl */ `
precision highp float;

varying vec2 vLocalUv;
varying vec2 vSimulationUv;
varying float vPaperIndex;
varying float vWasActive;

uniform sampler2D uInputTexture;
uniform vec2 uPreviousPoint;
uniform vec2 uCurrentPoint;
uniform vec2 uVector;
uniform vec2 uPreviousRadius;
uniform vec2 uCurrentRadius;
uniform float uIntensity;
uniform float uPressed;
uniform float uPaperIndex;

// Source v2 uses an ellipse after the earlier circle/capsule experiment.
// This exact SDF keeps the external force circular in screen space while the
// simulation tile itself may be wide or tall.
float sdEllipse(vec2 p, vec2 ab) {
    p = abs(p);
    if (p.x > p.y) { p = p.yx; ab = ab.yx; }
    float l = ab.y * ab.y - ab.x * ab.x;
    if (abs(l) < 0.000001) return length(p) - ab.x;
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
    vec2 r = ab * vec2(co, sqrt(max(1.0 - co * co, 0.0)));
    return length(r - p) * sign(p.y - r.y);
}

void main() {
    vec4 data = texture2D(uInputTexture, vSimulationUv);
    if (abs(vPaperIndex - uPaperIndex) > 0.25) {
        gl_FragColor = data;
        return;
    }
    if (vWasActive < 0.5) {
        gl_FragColor = vec4(0.0);
        return;
    }

    vec2 currentRadius = max(uCurrentRadius, vec2(0.00001));
    float previousRadius = max(max(uPreviousRadius.x, uPreviousRadius.y), 0.00001);
    float currentRadiusMax = max(currentRadius.x, currentRadius.y);
    float sdf = sdEllipse(vLocalUv - uCurrentPoint, currentRadius);
    sdf = max(0.0, -sdf / max(previousRadius, currentRadiusMax));
    float forceLength = length(uVector);
    vec2 radial = normalize((vLocalUv - uCurrentPoint) / currentRadius + vec2(0.00001)) * forceLength;
    vec2 injected = uPressed > 0.5
        ? radial * sdf * uVector.x
        : mix(uVector, radial, 0.2) * sdf;
    float shouldUpdate = step(0.0001, sdf) * step(0.0001, forceLength);
    float intensity = mix(data.b, min(data.b + uIntensity, 1.0), shouldUpdate);
    gl_FragColor = vec4(data.rg + injected, intensity, 1.0);
}
`;

export const simAdvectFragment = /* glsl */ `
precision highp float;

varying vec2 vLocalUv;
varying vec2 vSimulationUv;
varying vec4 vRegion;
varying vec2 vFboSize;
varying float vDeceleration;
varying float vDt;
varying float vWasActive;

uniform sampler2D uInputTexture;
uniform sampler2D uNoiseTexture;
uniform float uRandomDirection;
uniform float uFirstNoiseScale;
uniform float uSecondNoiseScale;
uniform float uVelocityThreshold;
uniform float uGapVelocityBoost;
uniform vec2 uGapAmount;
uniform float uIntensityDim;

float cubicInOut(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}

void main() {
    if (vWasActive < 0.5) { gl_FragColor = vec4(0.0); return; }
    vec2 ratio = max(vFboSize.x, vFboSize.y) / max(vFboSize, vec2(1.0));
    vec3 baseData = texture2D(uInputTexture, vSimulationUv).xyz;
    vec2 velocity = baseData.xy;
    float intensity = baseData.z;
    float speed = length(velocity);
    vec3 noise1 = texture2D(uNoiseTexture, vLocalUv * uFirstNoiseScale).rgb;
    vec3 noise2 = texture2D(uNoiseTexture, vLocalUv * uSecondNoiseScale).rgb;
    vec2 noiseDirection = normalize((noise1.gb - 0.5) * 2.0 + vec2(0.00001));
    float threshold = cubicInOut(noise1.r) * uVelocityThreshold;
    bool belowThreshold = speed < threshold;
    if (belowThreshold) velocity *= smoothstep(uGapAmount.x, uGapAmount.y, noise2.r);
    vec2 offset = mix(velocity, noiseDirection * length(velocity), uRandomDirection) * vDt * ratio;
    if (belowThreshold) offset *= mix(0.0, uGapVelocityBoost, noise1.r);
    vec2 sourceUv = clamp(vSimulationUv - offset, vRegion.xy, vRegion.xy + vRegion.zw);
    vec3 advected = texture2D(uInputTexture, sourceUv).xyz;
    float dim = 1.0 + smoothstep(0.001, 0.0, length(offset)) * 3.0;
    float nextIntensity = max(max(advected.z, intensity) - uIntensityDim * dim, 0.0);

    // The extracted bundle leaves the one-step result above as v1, then
    // replaces its velocity with the authored v2 backtrace/forward-trace
    // chain. Keep every lookup inside this atlas region: the source has
    // padding between tiles, while this implementation must also remain
    // correct when a packed tile reaches the atlas edge.
    vec2 velocityV2 = advected.xy * noise2.r * 3.0;
    vec2 spotNew = vSimulationUv;
    vec2 spotOld = clamp(
        spotNew - velocityV2 * vDt * ratio,
        vRegion.xy,
        vRegion.xy + vRegion.zw
    );
    velocityV2 = texture2D(uInputTexture, spotOld).xy * noise2.r * 2.0;

    vec2 spotNew2 = spotOld + velocityV2 * vDt * ratio;
    vec2 error = spotNew2 - spotNew;
    vec2 spotNew3 = spotNew - error * 0.5;
    velocityV2 = texture2D(
        uInputTexture,
        clamp(spotNew3, vRegion.xy, vRegion.xy + vRegion.zw)
    ).xy * noise2.r;

    vec2 spotOld2 = clamp(
        spotNew3 - velocityV2 * vDt * ratio,
        vRegion.xy,
        vRegion.xy + vRegion.zw
    );
    velocityV2 = texture2D(uInputTexture, spotOld2).xy;

    gl_FragColor = vec4(velocityV2 * vDeceleration, nextIntensity, 0.0);
}
`;

export const simDivergenceFragment = /* glsl */ `
precision highp float;

varying vec2 vSimulationUv;
varying float vDt;
varying vec4 vRegion;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

vec2 clampToRegion(vec2 value) {
    return clamp(value, vRegion.xy + uTexelSize, vRegion.xy + vRegion.zw - uTexelSize);
}

void main() {
    // Source divergence uses one cell step and normalizes by the per-instance
    // dt. Pressure therefore receives velocity-per-time, not a raw delta
    // whose magnitude changes with the authored simulation timestep.
    float right = texture2D(uVelocity, clampToRegion(vSimulationUv + vec2(uTexelSize.x, 0.0))).r;
    float left = texture2D(uVelocity, clampToRegion(vSimulationUv - vec2(uTexelSize.x, 0.0))).r;
    float top = texture2D(uVelocity, clampToRegion(vSimulationUv + vec2(0.0, uTexelSize.y))).g;
    float bottom = texture2D(uVelocity, clampToRegion(vSimulationUv - vec2(0.0, uTexelSize.y))).g;
    float divergence = (right - left + top - bottom) * 0.5 / max(vDt, 0.000001);
    gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
}
`;

/** Source batch-pass stencil geometry: inactive atlas tiles emit no fragments. */
export const simStencilVertexShader = /* glsl */ `
attribute vec4 aRegion;
attribute float aStencilActive;

void main() {
    if (aStencilActive < 0.5) {
        gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    vec2 simulationUv = aRegion.xy + uv * aRegion.zw;
    gl_Position = vec4(simulationUv * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const simStencilFragmentShader = /* glsl */ `
precision highp float;

void main() {
    gl_FragColor = vec4(1.0);
}
`;

export const simPressureFragment = /* glsl */ `
precision highp float;

varying vec2 vSimulationUv;
varying vec4 vRegion;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;

vec2 clampToRegion(vec2 value) {
    return clamp(value, vRegion.xy + uTexelSize, vRegion.xy + vRegion.zw - uTexelSize);
}

void main() {
    float right = texture2D(uPressure, clampToRegion(vSimulationUv + vec2(uTexelSize.x * 2.0, 0.0))).r;
    float left = texture2D(uPressure, clampToRegion(vSimulationUv - vec2(uTexelSize.x * 2.0, 0.0))).r;
    float top = texture2D(uPressure, clampToRegion(vSimulationUv + vec2(0.0, uTexelSize.y * 2.0))).r;
    float bottom = texture2D(uPressure, clampToRegion(vSimulationUv - vec2(0.0, uTexelSize.y * 2.0))).r;
    float divergence = texture2D(uDivergence, vSimulationUv).r;
    gl_FragColor = vec4((right + left + top + bottom) * 0.25 - divergence, 0.0, 0.0, 1.0);
}
`;

export const simGradientFragment = /* glsl */ `
precision highp float;

varying vec2 vSimulationUv;
varying vec4 vRegion;
varying float vDt;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

vec2 clampToRegion(vec2 value) {
    return clamp(value, vRegion.xy + uTexelSize, vRegion.xy + vRegion.zw - uTexelSize);
}

void main() {
    float right = texture2D(uPressure, clampToRegion(vSimulationUv + vec2(uTexelSize.x, 0.0))).r;
    float left = texture2D(uPressure, clampToRegion(vSimulationUv - vec2(uTexelSize.x, 0.0))).r;
    float top = texture2D(uPressure, clampToRegion(vSimulationUv + vec2(0.0, uTexelSize.y))).r;
    float bottom = texture2D(uPressure, clampToRegion(vSimulationUv - vec2(0.0, uTexelSize.y))).r;
    vec4 data = texture2D(uVelocity, vSimulationUv);
    vec2 velocity = data.rg - vec2(right - left, top - bottom) * 0.5 * vDt;
    gl_FragColor = vec4(velocity, data.b, 1.0);
}
`;

export const simAccumulationFragment = /* glsl */ `
precision highp float;

varying vec2 vLocalUv;
varying vec2 vSimulationUv;
varying float vAttenuation;
varying float vWasActive;

uniform sampler2D uVelocity;
uniform sampler2D uPrevious;

void main() {
    if (vWasActive < 0.5) { gl_FragColor = vec4(0.0); return; }
    vec4 velocity = texture2D(uVelocity, vSimulationUv);
    vec4 previous = texture2D(uPrevious, vSimulationUv);
    float sourceVelocity = length(velocity.rg);
    float displayedVelocity = max(smoothstep(sourceVelocity, 0.0, 0.01), previous.b * vAttenuation);
    vec2 direction = sourceVelocity > 0.001 ? velocity.rg : previous.rg;
    gl_FragColor = vec4(direction, displayedVelocity, velocity.b);
}
`;
