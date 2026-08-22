import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fontAssets, sceneManifest, soundManifest, worldAssets } from '../src/content/scenes.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(projectRoot, 'public');
const paths = [
  ...sceneManifest.flatMap((scene) => [
    scene.videos.desktop.base,
    scene.videos.desktop.over,
    scene.videos.mobile.base,
    scene.videos.mobile.over
  ]),
  ...soundManifest,
  ...Object.values(fontAssets),
  ...Object.entries(worldAssets)
    .filter(([key, value]) => key !== 'basisTranscoderPath' && typeof value === 'string')
    .map(([, value]) => value as string),
];
const missing: string[] = [];

for (const assetPath of paths) {
  const relativePath = assetPath.replace(/^\//, '').split('/').join('\\');
  try {
    await access(join(publicRoot, relativePath), constants.R_OK);
  } catch {
    missing.push(assetPath);
  }
}

if (missing.length > 0) {
  console.error('缺少体验资源：');
  missing.forEach((assetPath) => console.error(`- ${assetPath}`));
  process.exitCode = 1;
} else {
  console.log(`资源检查通过：${paths.length} 个体验媒体文件均可读取。`);
}
