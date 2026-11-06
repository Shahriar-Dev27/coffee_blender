import type { StageDef } from '../../src/config/stages';

export type AssetIssue = {
  file: string;
  rule: 'name' | 'dimensions' | 'budget' | 'background' | 'alt' | 'missing' | 'unreadable';
  message: string;
};

/** `{asset}-{stage-or-variant}-{w}x{h}.{ext}`, `-{size}.{ext}` or `-v{nn}.{ext}`; lowercase, hyphenated. */
export const ASSET_NAME =
  /^[a-z0-9]+(?:-[a-z0-9]+)*-(?:\d+x\d+|\d+|v\d{2})\.(avif|webp|jpg|png|glb|ktx2|hdr)$/;

export const BUDGETS = {
  stillDesktop: 150 * 1024,
  stillMobile: 80 * 1024,
  glbTotal: 800 * 1024,
  ktx2Total: 2.5 * 1024 * 1024,
  hdri: 400 * 1024,
};

const SIZE_IN_NAME = /-(\d+)x(\d+)\.[a-z0-9]+$/;

function baseName(file: string): string {
  return file.slice(Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\')) + 1);
}

function extOf(file: string): string {
  const name = baseName(file);
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1);
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function checkName(file: string): AssetIssue | null {
  const name = baseName(file);
  if (ASSET_NAME.test(name)) return null;
  return {
    file,
    rule: 'name',
    message: `"${name}" does not match {asset}-{stage-or-variant}-{w}x{h}.{ext} (lowercase, hyphen separated)`,
  };
}

/** The expected size is the `{w}x{h}` in the file name; a name without one is the name rule's problem. */
export function checkDimensions(
  file: string,
  actual: { width: number; height: number },
): AssetIssue | null {
  const match = SIZE_IN_NAME.exec(baseName(file));
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (actual.width === width && actual.height === height) return null;
  return {
    file,
    rule: 'dimensions',
    message: `expected ${width}x${height} from the file name, found ${actual.width}x${actual.height}`,
  };
}

function budgetFor(file: string): { limit: number; label: string } | null {
  const name = baseName(file);
  const ext = extOf(file);
  if (ext === 'hdr') return { limit: BUDGETS.hdri, label: 'HDRI' };
  // A single file over a total budget is over that budget by itself.
  if (ext === 'glb') return { limit: BUDGETS.glbTotal, label: 'GLB total' };
  if (ext === 'ktx2') return { limit: BUDGETS.ktx2Total, label: 'KTX2 total' };
  const size = SIZE_IN_NAME.exec(name);
  if (!size) return null;
  if (size[1] === '2400' && size[2] === '1350') return { limit: BUDGETS.stillDesktop, label: 'desktop still' };
  if (size[1] === '1200' && size[2] === '1500') return { limit: BUDGETS.stillMobile, label: 'mobile still' };
  return null;
}

export function checkBudget(file: string, bytes: number): AssetIssue | null {
  const budget = budgetFor(file);
  if (!budget || bytes <= budget.limit) return null;
  return {
    file,
    rule: 'budget',
    message: `${kb(bytes)} exceeds the ${budget.label} budget of ${kb(budget.limit)}`,
  };
}

/** Sum of all GLB or all KTX2 files against their shared budget. */
export function checkTotalBudget(kind: 'glb' | 'ktx2', bytes: number): AssetIssue | null {
  const limit = kind === 'glb' ? BUDGETS.glbTotal : BUDGETS.ktx2Total;
  if (bytes <= limit) return null;
  return {
    file: `*.${kind}`,
    rule: 'budget',
    message: `${kb(bytes)} across all .${kind} files exceeds the total budget of ${kb(limit)}`,
  };
}

function parseHex(hex: string): [number, number, number] | null {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex.trim());
  if (short) return short.slice(1).map((c) => parseInt(c + c, 16)) as [number, number, number];
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (long) return long.slice(1).map((c) => parseInt(c, 16)) as [number, number, number];
  return null;
}

/**
 * `cornerMeans` is the mean RGB of the four corner regions (any order).
 *
 * The default tolerance of 2 absorbs lossy-encoder drift on a flat #1A0F0A fill
 * (measured with sharp 0.35.5: AVIF q40-60 drifts 1.0, JPEG q>=80 1.0, WebP q75 2.0,
 * q85 1.5, q90 1.0, q60 3.0). WebP fallbacks must be encoded at quality >= 85 (or
 * nearLossless); do not raise the global tolerance.
 */
export function checkBackground(
  file: string,
  cornerMeans: [number, number, number][],
  paperHex: string,
  tolerance = 2,
): AssetIssue | null {
  if (cornerMeans.length !== 4) {
    return {
      file,
      rule: 'background',
      message: `expected 4 corner samples, got ${cornerMeans.length}`,
    };
  }
  const paper = parseHex(paperHex);
  if (!paper) {
    return { file, rule: 'background', message: `paper colour "${paperHex}" is not a hex colour` };
  }
  const bad = cornerMeans.findIndex((mean) =>
    mean.some((channel, i) => !(Math.abs(channel - paper[i]) <= tolerance)),
  );
  if (bad === -1) return null;
  const got = cornerMeans[bad].map((c) => Math.round(c * 10) / 10).join(',');
  return {
    file,
    rule: 'background',
    message: `corner ${bad + 1} mean rgb(${got}) differs from paper ${paperHex} by more than ${tolerance}`,
  };
}

export function checkAlt(stages: readonly StageDef[]): AssetIssue[] {
  const issues: AssetIssue[] = [];
  for (const stage of stages) {
    if (stage.still.alt.trim() === '') {
      issues.push({
        file: `stage ${stage.id} (${stage.still.slug})`,
        rule: 'alt',
        message: 'still has no written alt text',
      });
    }
  }
  return issues;
}
