import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { STAGES, stillFile } from '../../src/config/stages';
const base = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
await fs.mkdir('public/assets', { recursive: true });
await fs.mkdir('art/masters', { recursive: true });
try {
 for (const crop of ['desktop', 'mobile'] as const) {
  const width = crop === 'desktop' ? 2400 : 1200, height = crop === 'desktop' ? 1350 : 1500;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  for (const stage of STAGES) {
   const p = [0, .27, .43, .62, 1][stage.id - 1];
   await page.goto(`${base}/?capture=${p}`, { waitUntil: 'networkidle' });
   await page.locator('html[data-scene="ready"]').waitFor({ timeout: 60000 });
   await page.evaluate(async () => { await document.fonts.ready; });
   await page.waitForTimeout(500);
   const data = await page.locator('.scene-canvas canvas').evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL('image/png'));
   const png = Buffer.from(data.split(',')[1], 'base64');
   await fs.writeFile(`art/masters/stage-${stage.id}-${crop}.png`, png);
   const cutout = sharp(png).trim({ background: '#00000000' }).resize(Math.round(width * .9), Math.round(height * .82), { fit: 'inside' });
   const trimmed = await cutout.png().toBuffer();
   const image = sharp({ create: { width, height, channels: 4, background: '#00000000' } }).composite([{ input: trimmed, gravity: 'centre' }]);
   const dest = (ext: 'webp' | 'avif') => path.join('public', stillFile(stage.id, crop, ext));
   await image.clone().webp({ quality: 86 }).toFile(dest('webp').replace('poster-', 'cup-'));
   await image.clone().avif({ quality: crop === 'mobile' ? 45 : 66, effort: 8 }).toFile(dest('avif').replace('poster-', 'cup-'));
   await image.clone().flatten({ background: '#F7F1E8' }).webp({ quality: 86 }).toFile(dest('webp'));
   await image.clone().flatten({ background: '#F7F1E8' }).avif({ quality: 66, effort: 6 }).toFile(dest('avif'));
   if (stage.id === 1 && crop === 'mobile') {
    const full = await image.clone().png().toBuffer();
    for (const w of [320, 480, 800]) {
     for (const ext of ['avif', 'webp'] as const) {
      const resized = sharp(full).resize(w, Math.round(w * 1.25));
      await resized.toFormat(ext, { quality: ext === 'avif' ? (w === 480 ? 35 : 45) : 82 }).toFile(dest(ext).replace('poster-', 'cup-').replace('1200x1500', `${w}x${Math.round(w * 1.25)}`));
     }
    }
   }
   console.log(`Captured stage ${stage.id} ${crop}`);
  }
  await page.close();
 }
 await sharp('art/masters/stage-5-desktop.png').resize(1200, 630, { fit: 'contain', background: '#F7F1E8' }).flatten({ background: '#F7F1E8' }).webp({ quality: 85 }).toFile('public/assets/share-final-1200x630.webp');
} finally { await browser.close(); }
