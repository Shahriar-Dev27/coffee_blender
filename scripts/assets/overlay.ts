import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { stillFile, type StageId } from '../../src/config/stages';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Consecutive stage pairs whose cup rims must line up (stages 2 to 4 only). */
const PAIRS: [StageId, StageId][] = [
  [2, 3],
  [3, 4],
];

export interface OverlayOptions {
  assetsDir?: string;
  outDir?: string;
  log?: (message: string) => void;
}

/** Writes a 50% blend of stage `a` over stage `b` per pair. Returns the files written. */
export async function writeOverlays(options: OverlayOptions = {}): Promise<string[]> {
  const assetsDir = options.assetsDir ?? path.join(ROOT, 'public', 'assets');
  const outDir = options.outDir ?? path.join(ROOT, 'art', 'qa');
  const log = options.log ?? console.log;
  const written: string[] = [];

  for (const [a, b] of PAIRS) {
    const fileA = path.join(assetsDir, path.basename(stillFile(a, 'desktop', 'avif')));
    const fileB = path.join(assetsDir, path.basename(stillFile(b, 'desktop', 'avif')));
    const missing = [fileA, fileB].filter((f) => !fs.existsSync(f));
    if (missing.length > 0) {
      log(
        `skip overlay-s${a}-s${b}: missing ${missing.map((f) => path.basename(f)).join(', ')}`,
      );
      continue;
    }
    try {
      const [metaA, metaB] = await Promise.all([sharp(fileA).metadata(), sharp(fileB).metadata()]);
      if (metaA.width !== metaB.width || metaA.height !== metaB.height) {
        log(
          `skip overlay-s${a}-s${b}: size mismatch (${metaA.width}x${metaA.height} vs ${metaB.width}x${metaB.height})`,
        );
        continue;
      }
      fs.mkdirSync(outDir, { recursive: true });
      const top = await sharp(fileA).removeAlpha().ensureAlpha(0.5).png().toBuffer();
      const out = path.join(outDir, `overlay-s${a}-s${b}.png`);
      await sharp(fileB)
        .removeAlpha()
        .composite([{ input: top, blend: 'over' }])
        .png()
        .toFile(out);
      log(`wrote ${path.relative(ROOT, out)}`);
      written.push(out);
    } catch (error) {
      log(
        `skip overlay-s${a}-s${b}: failed (${error instanceof Error ? error.message : 'unknown error'})`,
      );
    }
  }
  return written;
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const norm = (p: string) => path.resolve(p).toLowerCase();
  return norm(entry) === norm(fileURLToPath(import.meta.url));
}

if (isMain()) {
  await writeOverlays();
}
