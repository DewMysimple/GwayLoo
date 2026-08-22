import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sourceRoot = join(projectRoot, 'src');
const allowedLegacyFiles = new Set([
  'src/features/experience/LegacyRuntimeBridge.tsx',
  'src/features/experience/legacy-runtime.ts',
]);
const maintainedExtensions = new Set(['.css', '.html', '.ts', '.tsx']);
const violations: string[] = [];

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return nested.flat();
}

const files = [join(projectRoot, 'index.html'), ...(await collectFiles(sourceRoot))]
  .filter((path) => maintainedExtensions.has(extname(path)));

for (const file of files) {
  const projectPath = relative(projectRoot, file).split('\\').join('/');
  const content = await readFile(file, 'utf8');
  const fileSize = (await stat(file)).size;

  if (fileSize > 250_000) violations.push(`${projectPath}: 可维护源码超过 250 KB`);
  if (!allowedLegacyFiles.has(projectPath) && content.includes('/wp-content/')) {
    violations.push(`${projectPath}: 新架构不得引用 /wp-content/`);
  }
  if (projectPath !== 'src/features/experience/legacy-runtime.ts'
    && (content.includes('ADMIN_AJAX_URL') || content.includes('loaderProgress'))) {
    violations.push(`${projectPath}: legacy 全局变量越过兼容边界`);
  }
  if (projectPath !== 'src/features/experience/LegacyRuntimeBridge.tsx'
    && content.includes('dangerouslySetInnerHTML')) {
    violations.push(`${projectPath}: 新架构不得注入旧 HTML markup`);
  }
}

if (violations.length > 0) {
  console.error('架构边界检查失败：');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log(`架构边界检查通过：${files.length} 个可维护源码文件。`);
}
