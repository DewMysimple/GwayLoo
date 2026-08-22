import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Mesh, PerspectiveCamera, ShaderMaterial } from 'three';
import type { ExperienceDefinition } from '../../../content/definition';
import type { PerformanceTier } from '../runtime/types';
import {
  watercolorAtlasRemaps,
  watercolorLayerSchedule,
  watercolorSdfRemaps,
} from '../../../content/atlas';
import { useSourceAssets } from './source-assets';
import {
  createGroundMaterial,
  createWatercolorMaterial,
  setWatercolorReveal,
} from './watercolor-material';

interface LandscapeWorldProps {
  definition: ExperienceDefinition;
  performanceTier: PerformanceTier;
  progress: number;
}

export function LandscapeWorld({ definition, performanceTier, progress }: LandscapeWorldProps) {
  const worldDefinition = definition.assets.world;
  const gltf = useGLTF(worldDefinition.model);
  const assets = useSourceAssets();
  const world = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { mixer } = useAnimations(gltf.animations, world);
  const set = useThree((state) => state.set);
  const previousCamera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const materials = useMemo(() => {
    const next = new Map<string, ShaderMaterial>();
    Object.entries(watercolorAtlasRemaps).forEach(([name, atlasRemap]) => {
      next.set(name, createWatercolorMaterial({
        assets,
        atlasRemap,
        performanceTier,
        sdfRemap: watercolorSdfRemaps[name],
      }));
    });
    return next;
  }, [assets, performanceTier]);

  const groundMaterial = useMemo(() => createGroundMaterial(assets), [assets]);
  const animatedCamera = useMemo(
    () => world.getObjectByName('Camera_Animation_Baked') as PerspectiveCamera | undefined,
    [world],
  );

  useEffect(() => {
    world.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (object.name === 'Ground') {
        object.material = groundMaterial;
        object.visible = true;
        return;
      }
      const material = materials.get(object.name);
      if (material) object.material = material;
    });
    return () => {
      materials.forEach((material) => material.dispose());
      groundMaterial.dispose();
    };
  }, [groundMaterial, materials, world]);

  useEffect(() => {
    if (!animatedCamera) return;
    animatedCamera.aspect = size.width / Math.max(1, size.height);
    animatedCamera.updateProjectionMatrix();
    set({ camera: animatedCamera });
    return () => set({ camera: previousCamera });
  }, [animatedCamera, previousCamera, set, size.height, size.width]);

  useFrame(() => {
    const time = progress * worldDefinition.cameraAnimationDuration;
    mixer.setTime(time);
    Object.entries(watercolorLayerSchedule).forEach(([name, start]) => {
      const object = world.getObjectByName(name) as Mesh | undefined;
      const material = materials.get(name);
      if (!object || !material) return;
      const reveal = start === 0 ? 1 : Math.min(1, Math.max(0, (time - start) / 1.25));
      object.visible = reveal > 0;
      setWatercolorReveal(material, reveal);
    });
    if (animatedCamera) {
      animatedCamera.aspect = size.width / Math.max(1, size.height);
      animatedCamera.updateProjectionMatrix();
    }
  });

  return <primitive object={world} />;
}
