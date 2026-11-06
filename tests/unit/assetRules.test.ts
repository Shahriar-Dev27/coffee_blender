import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { STAGES, type StageDef } from '@/config/stages';
import { parseTokensCss } from '@/lib/tokens';
import {
  BUDGETS,
  checkAlt,
  checkBackground,
  checkBudget,
  checkDimensions,
  checkName,
  checkTotalBudget,
} from '../../scripts/assets/rules';
import { runChecks } from '../../scripts/assets/check-assets';
import { writeOverlays } from '../../scripts/assets/overlay';

const tokensPath = path.resolve('src/styles/tokens.css');
const paper = parseTokensCss(fs.readFileSync(tokensPath, 'utf8'))['--color-paper'];

describe('checkName', () => {
  it.each([
    'poster-s1-cup-2400x1350.avif',
    'share-final-1200x630.jpg',
    'cup-v01.glb',
    'cup-basecolor-2048.ktx2',
  ])('passes %s', (file) => {
    expect(checkName(file)).toBeNull();
  });

  it.each(['Poster_S1.avif', 'poster-s1-cup.avif', 'cup.glb'])('flags %s', (file) => {
    expect(checkName(file)?.rule).toBe('name');
  });
});

describe('checkDimensions', () => {
  const file = 'poster-s1-cup-2400x1350.avif';
  it('flags a one pixel mismatch', () => {
    expect(checkDimensions(file, { width: 2400, height: 1349 })?.rule).toBe('dimensions');
  });
  it('passes an exact match', () => {
    expect(checkDimensions(file, { width: 2400, height: 1350 })).toBeNull();
  });
});

describe('checkBudget', () => {
  const desktop = 'poster-s1-cup-2400x1350.avif';
  const mobile = 'poster-s1-cup-1200x1500.avif';
  it('desktop: exact limit passes, one byte over fails', () => {
    expect(checkBudget(desktop, 150 * 1024)).toBeNull();
    expect(checkBudget(desktop, 150 * 1024 + 1)?.rule).toBe('budget');
  });
  it('mobile: exact limit passes, one byte over fails', () => {
    expect(checkBudget(mobile, 80 * 1024)).toBeNull();
    expect(checkBudget(mobile, 80 * 1024 + 1)?.rule).toBe('budget');
  });
  it('HDRI limit applies to .hdr files', () => {
    expect(checkBudget('studio-v01.hdr', BUDGETS.hdri)).toBeNull();
    expect(checkBudget('studio-v01.hdr', BUDGETS.hdri + 1)?.rule).toBe('budget');
  });
});

describe('checkTotalBudget', () => {
  it('flags glb and ktx2 totals over budget only', () => {
    expect(checkTotalBudget('glb', BUDGETS.glbTotal)).toBeNull();
    expect(checkTotalBudget('glb', BUDGETS.glbTotal + 1)?.rule).toBe('budget');
    expect(checkTotalBudget('ktx2', BUDGETS.ktx2Total)).toBeNull();
    expect(checkTotalBudget('ktx2', BUDGETS.ktx2Total + 1)?.rule).toBe('budget');
  });
});

describe('checkBackground', () => {
  const file = 'poster-s1-cup-2400x1350.avif';
  const four = (c: [number, number, number]): [number, number, number][] => [c, c, c, c];

  it('passes the exact paper colour in all four corners', () => {
    expect(checkBackground(file, four([26, 15, 10]), paper)).toBeNull();
  });
  it('flags black', () => {
    expect(checkBackground(file, four([0, 0, 0]), paper)?.rule).toBe('background');
  });
  it('flags a single bad corner', () => {
    const corners = four([26, 15, 10]);
    corners[2] = [0, 0, 0];
    expect(checkBackground(file, corners, paper)?.rule).toBe('background');
  });
  it('honours the default tolerance of 2', () => {
    expect(checkBackground(file, four([28, 15, 10]), paper)).toBeNull();
    expect(checkBackground(file, four([29, 15, 10]), paper)?.rule).toBe('background');
  });
  it('flags a corner list of the wrong length', () => {
    expect(checkBackground(file, [[26, 15, 10]], paper)?.rule).toBe('background');
    expect(checkBackground(file, [], paper)?.rule).toBe('background');
  });
  it('flags an unparseable paper colour', () => {
    expect(checkBackground(file, four([26, 15, 10]), 'not-a-colour')?.rule).toBe('background');
  });
});

describe('checkAlt', () => {
  it('passes the real stages', () => {
    expect(checkAlt(STAGES)).toEqual([]);
  });
  it('flags an empty alt without mutating STAGES', () => {
    const before = STAGES[1].still.alt;
    const clone: StageDef[] = STAGES.map((s) => ({ ...s, still: { ...s.still } }));
    clone[1].still.alt = '';
    expect(checkAlt(clone)).toHaveLength(1);
    expect(checkAlt(clone)[0].rule).toBe('alt');
    expect(STAGES[1].still.alt).toBe(before);
  });
  it('treats whitespace-only alt as empty', () => {
    const clone: StageDef[] = STAGES.map((s) => ({ ...s, still: { ...s.still } }));
    clone[0].still.alt = '   \n\t';
    expect(checkAlt(clone)).toHaveLength(1);
  });
});

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breou-assets-'));
  tempDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const d of tempDirs) {
    fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

const rgb = {
  r: parseInt(paper.slice(1, 3), 16),
  g: parseInt(paper.slice(3, 5), 16),
  b: parseInt(paper.slice(5, 7), 16),
};

/** Solid paper-coloured image, with optional black patches, a given alpha, or a hole. */
async function paperImage(
  file: string,
  width: number,
  height: number,
  opts: {
    black?: { left: number; top: number; width: number; height: number }[];
    alpha?: number;
    hole?: boolean;
    format?: 'png' | 'webp' | 'jpg';
  } = {},
): Promise<void> {
  const layers: OverlayOptions[] = [];
  for (const b of opts.black ?? []) {
    layers.push({
      input: await sharp({
        create: { width: b.width, height: b.height, channels: 3, background: { r: 0, g: 0, b: 0 } },
      })
        .png()
        .toBuffer(),
      left: b.left,
      top: b.top,
    });
  }
  if (opts.hole) {
    layers.push({
      input: await sharp({
        create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 255, b: 255 } },
      })
        .png()
        .toBuffer(),
      left: Math.floor(width / 2),
      top: Math.floor(height / 2),
      blend: 'dest-out',
    });
  }
  const img = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...rgb, alpha: (opts.alpha ?? 255) / 255 },
    },
  }).composite(layers);
  if (opts.format === 'webp') {
    await img.webp({ lossless: true }).toFile(file);
  } else if (opts.format === 'jpg') {
    await img
      .flatten({ background: rgb })
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      .toFile(file);
  } else {
    await img.png().toFile(file);
  }
}

describe('runChecks pixel path', () => {
  let dir: string;
  let issues: Awaited<ReturnType<typeof runChecks>>;
  const byFile = (f: string) => issues.filter((i) => i.file === `/assets/${f}`);
  const rulesOf = (f: string) => byFile(f).map((i) => i.rule);

  beforeAll(async () => {
    sharp.cache(false); // libvips otherwise keeps handles open and blocks cleanup on Windows
    dir = tempDir();
    const p = (f: string) => path.join(dir, f);
    const corner = (left: number, top: number) => [{ left, top, width: 8, height: 8 }];
    // Full size lossless stills.
    await paperImage(p('poster-s1-cup-2400x1350.webp'), 2400, 1350, { format: 'webp' });
    await paperImage(p('poster-s2-blend-2400x1350.webp'), 2400, 1350, {
      black: [{ left: 0, top: 0, width: 40, height: 40 }],
      format: 'webp',
    });
    // Wrong size for its own name.
    await paperImage(p('poster-s3-beans-in-2400x1350.webp'), 100, 100, { format: 'webp' });
    // The share image (jpg) is covered by the background rule too.
    await paperImage(p('share-final-1200x630.jpg'), 1200, 630, { format: 'jpg' });
    await paperImage(p('share-bad-1200x630.jpg'), 1200, 630, {
      black: [{ left: 1160, top: 590, width: 40, height: 40 }],
      format: 'jpg',
    });
    // Small fixtures, black in exactly one corner each, to catch a wrong corner origin.
    await paperImage(p('poster-tl-64x64.png'), 64, 64, { black: corner(0, 0) });
    await paperImage(p('poster-tr-64x64.png'), 64, 64, { black: corner(56, 0) });
    await paperImage(p('poster-bl-64x64.png'), 64, 64, { black: corner(0, 56) });
    await paperImage(p('poster-br-64x64.png'), 64, 64, { black: corner(56, 56) });
    // A 4x8 strip covers half of one corner, so the mean is about half the paper value.
    await paperImage(p('poster-strip-64x64.png'), 64, 64, {
      black: [{ left: 0, top: 0, width: 4, height: 8 }],
    });
    // Control: clean small poster, and an image smaller than the 8x8 sample.
    await paperImage(p('poster-ok-64x64.png'), 64, 64);
    await paperImage(p('poster-tiny-4x4.png'), 4, 4);
    await paperImage(p('poster-tinybad-4x4.png'), 4, 4, {
      black: [{ left: 0, top: 0, width: 4, height: 4 }],
    });
    // Transparency: whole image, one alpha step, and a hole far from every corner.
    await paperImage(p('poster-clear-64x64.png'), 64, 64, { alpha: 0 });
    await paperImage(p('poster-a254-64x64.png'), 64, 64, { alpha: 254 });
    await paperImage(p('poster-hole-64x64.png'), 64, 64, { hole: true });
    // A transparent texture that is not a poster or share image is exempt from the background rule.
    await paperImage(p('icon-clear-64x64.png'), 64, 64, { alpha: 0 });
    // Not an image at all.
    fs.writeFileSync(p('poster-junk-64x64.png'), 'not a png');
    issues = (await runChecks({ assetsDir: dir, tokensPath })).filter((i) => i.rule !== 'missing');
  });

  it('accepts a paper-coloured still, flags a black corner and a wrong size', () => {
    expect(byFile('poster-s1-cup-2400x1350.webp')).toEqual([]);
    expect(rulesOf('poster-s2-blend-2400x1350.webp')).toEqual(['background']);
    expect(rulesOf('poster-s3-beans-in-2400x1350.webp')).toContain('dimensions');
  });

  it('reports walked files as /assets/<relative path>', () => {
    expect(byFile('poster-s2-blend-2400x1350.webp')[0].file).toBe(
      '/assets/poster-s2-blend-2400x1350.webp',
    );
  });

  it('applies the background rule to the share jpg', () => {
    expect(byFile('share-final-1200x630.jpg')).toEqual([]);
    expect(rulesOf('share-bad-1200x630.jpg')).toEqual(['background']);
  });

  it.each(['tl', 'tr', 'bl', 'br'])('catches black only in the %s corner', (corner) => {
    expect(rulesOf(`poster-${corner}-64x64.png`)).toEqual(['background']);
  });

  it('fails a half-covered corner on the tolerance with the measured mean', () => {
    const [issue] = byFile('poster-strip-64x64.png');
    expect(issue.rule).toBe('background');
    expect(issue.message).toContain('corner 1');
    expect(issue.message).toContain('rgb(13,7.5,5)');
    expect(issue.message).toContain('more than 2');
  });

  it('accepts a clean small poster and samples images smaller than 8x8', () => {
    expect(byFile('poster-ok-64x64.png')).toEqual([]);
    expect(byFile('poster-tiny-4x4.png')).toEqual([]);
    expect(rulesOf('poster-tinybad-4x4.png')).toEqual(['background']);
  });

  it('flags a transparent poster, a one-step alpha, and a hole away from the corners', () => {
    expect(rulesOf('poster-clear-64x64.png')).toEqual(['background']);
    expect(rulesOf('poster-a254-64x64.png')).toEqual(['background']);
    expect(rulesOf('poster-hole-64x64.png')).toEqual(['background']);
  });

  it('does not apply the background rule to other transparent textures', () => {
    expect(byFile('icon-clear-64x64.png')).toEqual([]);
  });

  it('labels a corrupt image as unreadable', () => {
    expect(rulesOf('poster-junk-64x64.png')).toEqual(['unreadable']);
  });

  it('reports only missing stills when the assets dir does not exist', async () => {
    const all = await runChecks({ assetsDir: path.join(dir, 'nope'), tokensPath });
    expect(all).toHaveLength(20);
    expect(all.every((i) => i.rule === 'missing')).toBe(true);
  });

  it('does not let a symlink satisfy a required still', async () => {
    const assets = tempDir();
    const target = tempDir();
    const link = path.join(assets, 'poster-s1-cup-2400x1350.avif');
    try {
      // 'junction' works without admin rights on Windows; on POSIX it is an ordinary symlink.
      fs.symlinkSync(target, link, 'junction');
    } catch {
      return; // cannot create links in this environment
    }
    const all = await runChecks({ assetsDir: assets, tokensPath });
    const hit = all.filter((i) => i.file === '/assets/poster-s1-cup-2400x1350.avif');
    expect(hit).toHaveLength(1);
    expect(hit[0].rule).toBe('missing');
    expect(hit[0].message).toContain('symlink');
    expect(all.filter((i) => i.rule === 'missing')).toHaveLength(20);
  });

  it('rejects a tokens file with no usable paper colour', async () => {
    const bad = path.join(tempDir(), 'tokens.css');
    fs.writeFileSync(bad, ':root { --color-ink: #fff; }');
    await expect(runChecks({ assetsDir: dir, tokensPath: bad })).rejects.toThrow(/--color-paper/);
  });
});

describe('writeOverlays', () => {
  it('blends s2 over s3 at 50% and reports a size mismatch for s3/s4', async () => {
    sharp.cache(false);
    const assets = tempDir();
    const out = path.join(tempDir(), 'qa');
    const avif = (file: string, w: number, h: number, c: { r: number; g: number; b: number }) =>
      sharp({ create: { width: w, height: h, channels: 3, background: c } })
        .avif({ quality: 90 })
        .toFile(path.join(assets, file));
    await avif('poster-s2-blend-2400x1350.avif', 2400, 1350, { r: 255, g: 0, b: 0 });
    await avif('poster-s3-beans-in-2400x1350.avif', 2400, 1350, { r: 0, g: 0, b: 255 });
    await avif('poster-s4-milk-2400x1350.avif', 1200, 675, { r: 0, g: 255, b: 0 });
    const logs: string[] = [];
    const written = await writeOverlays({ assetsDir: assets, outDir: out, log: (m) => logs.push(m) });

    expect(written).toEqual([path.join(out, 'overlay-s2-s3.png')]);
    const { data } = await sharp(written[0])
      .extract({ left: 10, top: 10, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(Math.abs(data[0] - 127.5)).toBeLessThanOrEqual(4);
    expect(data[1]).toBeLessThanOrEqual(3);
    expect(Math.abs(data[2] - 127.5)).toBeLessThanOrEqual(4);
    expect(fs.existsSync(path.join(out, 'overlay-s3-s4.png'))).toBe(false);
    expect(logs.some((l) => l.includes('overlay-s3-s4') && l.includes('size mismatch'))).toBe(true);
  });

  it('skips cleanly when stills are missing', async () => {
    const logs: string[] = [];
    const written = await writeOverlays({
      assetsDir: path.join(tempDir(), 'nope'),
      outDir: path.join(tempDir(), 'qa'),
      log: (m) => logs.push(m),
    });
    expect(written).toEqual([]);
    expect(logs).toHaveLength(2);
  });
});
