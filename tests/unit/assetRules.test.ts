import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
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

describe('runChecks pixel path', () => {
  let dir: string;
  const W = 2400;
  const H = 1350;

  beforeAll(async () => {
    sharp.cache(false); // libvips otherwise keeps handles open and blocks cleanup on Windows
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'breou-assets-'));
    const solid = () =>
      sharp({ create: { width: W, height: H, channels: 3, background: paper } });
    await solid().webp({ lossless: true }).toFile(path.join(dir, 'poster-s1-cup-2400x1350.webp'));
    const black = await sharp({
      create: { width: 40, height: 40, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    await solid()
      .composite([{ input: black, left: 0, top: 0 }])
      .webp({ lossless: true })
      .toFile(path.join(dir, 'poster-s2-blend-2400x1350.webp'));
    // Wrong size for its own name.
    await sharp({ create: { width: 100, height: 100, channels: 3, background: paper } })
      .webp({ lossless: true })
      .toFile(path.join(dir, 'poster-s3-beans-in-2400x1350.webp'));
    // Share image: not a poster, but the background rule applies to every image.
    const flat = () =>
      sharp({ create: { width: 1200, height: 630, channels: 3, background: paper } });
    await flat().jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(
      path.join(dir, 'share-final-1200x630.jpg'),
    );
    await flat()
      .composite([{ input: black, left: 1160, top: 590 }])
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      .toFile(path.join(dir, 'share-bad-1200x630.jpg'));
    // Fully transparent PNG counts as a background failure.
    await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toFile(path.join(dir, 'icon-clear-64x64.png'));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('accepts a paper-coloured still, flags a black corner and a wrong size', async () => {
    const issues = (await runChecks({ assetsDir: dir, tokensPath })).filter(
      (i) => i.rule !== 'missing',
    );
    const byFile = (f: string) => issues.filter((i) => i.file.endsWith(f));
    expect(byFile('poster-s1-cup-2400x1350.webp')).toEqual([]);
    expect(byFile('poster-s2-blend-2400x1350.webp').map((i) => i.rule)).toEqual(['background']);
    expect(byFile('poster-s3-beans-in-2400x1350.webp').map((i) => i.rule)).toContain('dimensions');
  });

  it('applies the background rule to non-poster images such as the share jpg', async () => {
    const issues = (await runChecks({ assetsDir: dir, tokensPath })).filter(
      (i) => i.rule !== 'missing',
    );
    const byFile = (f: string) => issues.filter((i) => i.file.endsWith(f));
    expect(byFile('share-final-1200x630.jpg')).toEqual([]);
    expect(byFile('share-bad-1200x630.jpg').map((i) => i.rule)).toEqual(['background']);
    expect(byFile('icon-clear-64x64.png').map((i) => i.rule)).toEqual(['background']);
  });

  it('reports only missing stills when the assets dir does not exist', async () => {
    const issues = await runChecks({ assetsDir: path.join(dir, 'nope'), tokensPath });
    expect(issues).toHaveLength(20);
    expect(issues.every((i) => i.rule === 'missing')).toBe(true);
  });
});
