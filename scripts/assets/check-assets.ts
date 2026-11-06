import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { STAGES, stillFile, type StageId } from '../../src/config/stages';
import { parseTokensCss } from '../../src/lib/tokens';
import {
  checkAlt,
  checkBackground,
  checkBudget,
  checkDimensions,
  checkName,
  checkTotalBudget,
  type AssetIssue,
} from './rules';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const IMAGE_EXT = new Set(['avif', 'webp', 'jpg', 'png']);
const CORNER = 8;

export interface RunOptions {
  assetsDir?: string;
  tokensPath?: string;
}

/** Recursively lists regular files. Symlinks are never followed or listed. */
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function extOf(file: string): string {
  return path.extname(file).slice(1).toLowerCase();
}

/** Mean RGB of each of the four 8x8 corners, plus whether any corner pixel is not fully opaque. */
async function sampleCorners(
  file: string,
  width: number,
  height: number,
): Promise<{ means: [number, number, number][]; transparent: boolean }> {
  const origins: [number, number][] = [
    [0, 0],
    [width - CORNER, 0],
    [0, height - CORNER],
    [width - CORNER, height - CORNER],
  ];
  const means: [number, number, number][] = [];
  let transparent = false;
  for (const [left, top] of origins) {
    const { data } = await sharp(file)
      .extract({ left, top, width: CORNER, height: CORNER })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const sum = [0, 0, 0];
    const pixels = CORNER * CORNER;
    for (let p = 0; p < pixels; p++) {
      sum[0] += data[p * 4];
      sum[1] += data[p * 4 + 1];
      sum[2] += data[p * 4 + 2];
      if (data[p * 4 + 3] < 255) transparent = true;
    }
    means.push([sum[0] / pixels, sum[1] / pixels, sum[2] / pixels]);
  }
  return { means, transparent };
}

export async function runChecks(options: RunOptions = {}): Promise<AssetIssue[]> {
  const assetsDir = options.assetsDir ?? path.join(ROOT, 'public', 'assets');
  const tokensPath = options.tokensPath ?? path.join(ROOT, 'src', 'styles', 'tokens.css');
  const paper = parseTokensCss(fs.readFileSync(tokensPath, 'utf8'))['--color-paper'];
  const issues: AssetIssue[] = [];

  issues.push(...checkAlt(STAGES));

  let glbBytes = 0;
  let ktx2Bytes = 0;
  for (const full of walk(assetsDir)) {
    const rel = path.relative(assetsDir, full).split(path.sep).join('/');
    const ext = extOf(full);
    const bytes = fs.statSync(full).size;
    const push = (issue: AssetIssue | null) => {
      if (issue) issues.push(issue);
    };

    push(checkName(rel));
    push(checkBudget(rel, bytes));
    if (ext === 'glb') glbBytes += bytes;
    if (ext === 'ktx2') ktx2Bytes += bytes;
    if (!IMAGE_EXT.has(ext)) continue;

    try {
      const { width, height } = await sharp(full).metadata();
      if (!width || !height) throw new Error('no dimensions');
      push(checkDimensions(rel, { width, height }));
      // Every image is a flat composite over the paper colour, so all corners must equal --bg.
      if (width >= CORNER && height >= CORNER) {
        const { means, transparent } = await sampleCorners(full, width, height);
        if (transparent) {
          issues.push({
            file: rel,
            rule: 'background',
            message: 'has transparent pixels in a corner; stills must be opaque on the paper colour',
          });
        } else {
          push(checkBackground(rel, means, paper));
        }
      }
    } catch (error) {
      issues.push({
        file: rel,
        rule: 'dimensions',
        message: `unreadable image (${error instanceof Error ? error.message : 'unknown error'})`,
      });
    }
  }
  issues.push(...[checkTotalBudget('glb', glbBytes), checkTotalBudget('ktx2', ktx2Bytes)].filter(
    (i): i is AssetIssue => i !== null,
  ));

  for (const stage of STAGES) {
    for (const crop of ['desktop', 'mobile'] as const) {
      for (const format of ['avif', 'webp'] as const) {
        const publicPath = stillFile(stage.id as StageId, crop, format);
        if (!fs.existsSync(path.join(assetsDir, path.basename(publicPath)))) {
          issues.push({ file: publicPath, rule: 'missing', message: 'required still is not present' });
        }
      }
    }
  }
  return issues;
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const norm = (p: string) => path.resolve(p).toLowerCase();
  return norm(entry) === norm(fileURLToPath(import.meta.url));
}

if (isMain()) {
  const issues = await runChecks();
  for (const issue of issues) {
    console.log(`${issue.file}: [${issue.rule}] ${issue.message}`);
  }
  if (issues.length > 0) {
    console.log(`\n${issues.length} asset issue(s)`);
    process.exit(1);
  }
  console.log('assets ok');
}
