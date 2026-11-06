import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const outDir = fileURLToPath(new URL('../../public/fonts/', import.meta.url));

const files = [
  'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2',
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
];

mkdirSync(outDir, { recursive: true });
for (const rel of files) {
  const name = rel.slice(rel.lastIndexOf('/') + 1);
  copyFileSync(`${root}${rel}`, `${outDir}${name}`);
  console.log(`copied ${name}`);
}
