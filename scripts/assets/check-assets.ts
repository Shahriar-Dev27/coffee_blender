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

/** Only the stills and the share image are flat composites on the paper colour. */
const BACKGROUND_FILE = /^(?:poster|share)-/;

/** True only for a regular file; a symlink (even to a file) is not one. */
export function isRegularFile(p: string): boolean {
  try {
    return fs.lstatSync(p).isFile();
  } catch {
    return false;
  }
}

function isSymlink(p: string): boolean {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Mean RGB of each of the four corners (up to 8x8, smaller for tiny images), read from one
 * decoded RGBA buffer, plus the number of pixels that are not fully opaque anywhere in the image.
 */
function analysePixels(
  data: Buffer,
  width: number,
  height: number,
): { means: [number, number, number][]; translucent: number } {
  const cw = Math.min(CORNER, width);
  const ch = Math.min(CORNER, height);
  const origins: [number, number][] = [
    [0, 0],
    [width - cw, 0],
    [0, height - ch],
    [width - cw, height - ch],
  ];
  const means = origins.map(([left, top]) => {
    const sum = [0, 0, 0];
    for (let y = top; y < top + ch; y++) {
      for (let x = left; x < left + cw; x++) {
        const i = (y * width + x) * 4;
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
      }
    }
    const n = cw * ch;
    return [sum[0] / n, sum[1] / n, sum[2] / n] as [number, number, number];
  });
  let translucent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) translucent++;
  }
  return { means, translucent };
}

export async function runChecks(options: RunOptions = {}): Promise<AssetIssue[]> {
  const assetsDir = options.assetsDir ?? path.join(ROOT, 'public', 'assets');
  const tokensPath = options.tokensPath ?? path.join(ROOT, 'src', 'styles', 'tokens.css');
  const paper = parseTokensCss(fs.readFileSync(tokensPath, 'utf8'))['--color-paper'];
  if (typeof paper !== 'string' || !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(paper)) {
    throw new Error(`--color-paper in ${tokensPath} is missing or not a hex colour: ${String(paper)}`);
  }
  const issues: AssetIssue[] = [];

  issues.push(...checkAlt(STAGES));

  let glbBytes = 0;
  let ktx2Bytes = 0;
  for (const full of walk(assetsDir)) {
    const name = `/assets/${path.relative(assetsDir, full).split(path.sep).join('/')}`;
    const ext = extOf(full);
    const bytes = fs.statSync(full).size;
    const push = (issue: AssetIssue | null) => {
      if (issue) issues.push(issue);
    };

    push(checkName(name));
    push(checkBudget(name, bytes));
    if (ext === 'glb') glbBytes += bytes;
    if (ext === 'ktx2') ktx2Bytes += bytes;
    if (!IMAGE_EXT.has(ext)) continue;

    const wantsBackground = BACKGROUND_FILE.test(path.basename(full));
    let width: number;
    let height: number;
    let pixels: Buffer | null = null;
    try {
      const meta = await sharp(full).metadata();
      if (!meta.width || !meta.height) throw new Error('no dimensions');
      width = meta.width;
      height = meta.height;
      if (wantsBackground) {
        const { data, info } = await sharp(full)
          .ensureAlpha()
          .toColourspace('srgb')
          .raw()
          .toBuffer({ resolveWithObject: true });
        if (info.channels !== 4 || info.width !== width || info.height !== height) {
          throw new Error(`unexpected decode result (${info.width}x${info.height}x${info.channels})`);
        }
        pixels = data;
      }
    } catch (error) {
      issues.push({
        file: name,
        rule: 'unreadable',
        message: `unreadable image (${error instanceof Error ? error.message : 'unknown error'})`,
      });
      continue;
    }

    push(checkDimensions(name, { width, height }));
    if (pixels) {
      const { means, translucent } = analysePixels(pixels, width, height);
      if (translucent > 0) {
        issues.push({
          file: name,
          rule: 'background',
          message: `${translucent} pixel(s) are not fully opaque; stills must be opaque on the paper colour`,
        });
      } else {
        push(checkBackground(name, means, paper));
      }
    }
  }
  issues.push(...[checkTotalBudget('glb', glbBytes), checkTotalBudget('ktx2', ktx2Bytes)].filter(
    (i): i is AssetIssue => i !== null,
  ));

  for (const stage of STAGES) {
    for (const crop of ['desktop', 'mobile'] as const) {
      for (const format of ['avif', 'webp'] as const) {
        const publicPath = stillFile(stage.id as StageId, crop, format);
        const onDisk = path.join(assetsDir, path.basename(publicPath));
        if (isSymlink(onDisk)) {
          issues.push({ file: publicPath, rule: 'missing', message: 'is a symlink, not a file' });
        } else if (!isRegularFile(onDisk)) {
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
