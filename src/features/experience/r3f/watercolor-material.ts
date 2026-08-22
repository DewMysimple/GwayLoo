import {
  DoubleSide,
  GLSL3,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector4,
} from 'three';
import type { AtlasRemap } from '../../../content/atlas';
import type { PerformanceTier } from '../runtime/types';
import type { LoadedExperienceAssets } from './source-assets';

const vertexShader = /* glsl */ `
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;

  uniform sampler2D uAtlas;
  uniform sampler2D uMask;
  uniform sampler2D uSdf;
  uniform sampler2D uNoise;
  uniform sampler2D uPaper;
  uniform sampler3D uDryLut;
  uniform sampler3D uInkLut;
  uniform vec4 uAtlasRect;
  uniform vec4 uSdfRect;
  uniform float uHasSdf;
  uniform float uReveal;
  uniform float uLutStrength;
  in vec2 vUv;
  out vec4 outColor;

  vec2 remapUv(vec2 sourceUv, vec4 rect) {
    return rect.xy + sourceUv * rect.zw;
  }

  void main() {
    vec2 atlasUv = remapUv(vUv, uAtlasRect);
    vec4 pigment = texture(uAtlas, atlasUv);
    float mask = texture(uMask, atlasUv).r;
    float sdf = texture(uSdf, remapUv(vUv, uSdfRect)).r;
    float edge = mix(mask, sdf, uHasSdf);
    float grain = texture(uNoise, vUv * 3.7 + vec2(uReveal * 0.025)).r;
    float paper = texture(uPaper, vUv * 1.8).r;
    float revealEdge = smoothstep(1.0 - uReveal - 0.12, 1.0 - uReveal + 0.12, edge + grain * 0.12);
    float alpha = pigment.a * mask * revealEdge;
    if (alpha < 0.01) discard;

    vec3 color = pigment.rgb * mix(0.9, 1.08, paper);
    vec3 dryGrade = texture(uDryLut, clamp(color, 0.0, 1.0)).rgb;
    vec3 inkGrade = texture(uInkLut, clamp(color, 0.0, 1.0)).rgb;
    vec3 graded = mix(dryGrade, inkGrade, smoothstep(0.15, 0.85, uReveal));
    color = mix(color, graded, uLutStrength);
    outColor = vec4(color, alpha);
  }
`;

function rect(remap: AtlasRemap): Vector4 {
  return new Vector4(remap.x, remap.y, remap.width, remap.height);
}

export function watercolorLutStrength(performanceTier: PerformanceTier): number {
  if (performanceTier === 'low') return 0;
  if (performanceTier === 'medium') return 0.08;
  return 0.14;
}

export function createWatercolorMaterial({
  assets,
  atlasRemap,
  performanceTier,
  sdfRemap,
}: {
  assets: LoadedExperienceAssets;
  atlasRemap: AtlasRemap;
  performanceTier: PerformanceTier;
  sdfRemap?: AtlasRemap;
}): ShaderMaterial {
  return new ShaderMaterial({
    depthWrite: false,
    fragmentShader,
    glslVersion: GLSL3,
    side: DoubleSide,
    transparent: true,
    uniforms: {
      uAtlas: { value: assets.atlas },
      uMask: { value: assets.atlasMask },
      uSdf: { value: assets.atlasSdf },
      uNoise: { value: assets.noise },
      uPaper: { value: assets.paper },
      uDryLut: { value: assets.dryLut },
      uInkLut: { value: assets.inkLut },
      uAtlasRect: { value: rect(atlasRemap) },
      uSdfRect: { value: rect(sdfRemap ?? atlasRemap) },
      uHasSdf: { value: sdfRemap ? 1 : 0 },
      uReveal: { value: 0 },
      uLutStrength: { value: watercolorLutStrength(performanceTier) },
    },
    vertexShader,
  });
}

export function createGroundMaterial(assets: LoadedExperienceAssets): MeshBasicMaterial {
  return new MeshBasicMaterial({
    depthWrite: false,
    map: assets.groundAtlas,
    opacity: 0.18,
    side: DoubleSide,
    transparent: true,
  });
}

export function setWatercolorReveal(material: ShaderMaterial, reveal: number): void {
  material.uniforms.uReveal.value = reveal;
}
