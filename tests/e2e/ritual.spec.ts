import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/**
 * Counts pixels whose channels differ by more than `tolerance` between two PNG screenshots. Decoded in
 * the page (createImageBitmap + canvas) so no image dependency is needed. The software WebGL renderer
 * can flip a handful of pixels by 1-2 levels between redraws of identical state; a real pose change
 * moves thousands of pixels by far more than that.
 */
async function countChangedPixels(page: Page, a: Buffer, b: Buffer, tolerance = 4): Promise<number> {
  return page.evaluate(async ({ a64, b64, tol }) => {
    const decode = async (base64: string) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), { colorSpaceConversion: 'none' });
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d')!;
      context.drawImage(bitmap, 0, 0);
      return context.getImageData(0, 0, bitmap.width, bitmap.height);
    };
    const [first, second] = await Promise.all([decode(a64), decode(b64)]);
    if (first.width !== second.width || first.height !== second.height) throw new Error('screenshot size mismatch');
    let changed = 0;
    for (let i = 0; i < first.data.length; i += 4) {
      if (Math.abs(first.data[i] - second.data[i]) > tol || Math.abs(first.data[i + 1] - second.data[i + 1]) > tol || Math.abs(first.data[i + 2] - second.data[i + 2]) > tol) changed++;
    }
    return changed;
  }, { a64: a.toString('base64'), b64: b.toString('base64'), tol: tolerance });
}

test('skip directly to the counter and complete a keyboard demo order', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to your coffee' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('radio', { name: /Oat latte/ }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('cup-price')).toHaveText('$4.60');
  await page.getByRole('button', { name: 'Add to order' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Review order', exact: true }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: /Place demo order/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Your name')).toBeFocused();
  await expect(dialog.getByText('Please enter your name.')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.type('Ada');
  await page.keyboard.press('Tab');
  await page.keyboard.type('ada@example.com');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('heading', { name: 'A little moment, made yours.' })).toBeVisible();
  await expect(dialog.getByText('Nothing was sent and nothing was charged.')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('cart survives refresh; Escape restores opener and controls bound quantity', async ({ page }) => {
  await page.goto('/#order');
  await page.getByRole('button', { name: 'Add to order' }).click();
  await page.reload();
  const opener = page.getByRole('button', { name: 'Review order', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog').getByText('Regular flat white')).toBeVisible();
  const decrease = page.getByRole('button', { name: 'Decrease Regular flat white quantity' });
  await expect(decrease).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
});

test('reduced motion and blocked storage keep the order flow usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await page.goto('/#order');
  await expect(page.locator('.scene-canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add to order' }).click();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('layout stays within a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#order');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Add to order' })).toBeVisible();
});

test('selection pricing stays correct through rapid changes and reverse scroll', async ({ page }) => {
  await page.goto('/#order');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('radio', { name: /Espresso/ }).check();
    await expect(page.getByTestId('cup-price')).toHaveText('$3.50');
    await page.getByRole('radio', { name: /Oat latte/ }).check();
  }
  await page.getByRole('radio', { name: 'Large', exact: true }).check();
  await page.getByLabel('Something sweet').selectOption('vanilla');
  await page.getByText('For the coffee curious').click();
  await page.getByLabel('Blend', { exact: true }).selectOption('single-origin');
  await expect(page.getByTestId('cup-price')).toHaveText('$7.10');
  await page.getByRole('button', { name: 'Increase Cups quantity' }).click();
  await expect(page.getByTestId('cup-price')).toHaveText('$14.20');
  await page.locator('#arrival').scrollIntoViewIfNeeded();
  await page.locator('#pour').scrollIntoViewIfNeeded();
  await page.locator('#order').scrollIntoViewIfNeeded();
  await expect(page.getByRole('radio', { name: /Oat latte/ })).toBeChecked();
  await expect(page.getByTestId('cup-price')).toHaveText('$14.20');
  await page.setViewportSize({ width: 640, height: 800 });
  await expect(page.getByTestId('cup-price')).toHaveText('$14.20');
});

test('pending submission can close and reopen without losing its receipt', async ({ page }) => {
  await page.goto('/#order');
  await page.getByRole('button', { name: 'Add to order' }).click();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByLabel('Email address').fill('ada@example.com');
  await page.getByLabel('Pickup time').selectOption('15');
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('button', { name: /Making your demo receipt/ })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Review order, 1 cup|View demo receipt/ }).click();
  await expect(page.getByRole('heading', { name: 'A little moment, made yours.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start a new order' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('#arrival')).toBeFocused();
});

test('WebGL context loss keeps selected coffee and usable stills', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });
  await page.goto('/#order');
  await page.locator('html[data-scene="ready"]').waitFor();
  await page.getByRole('radio', { name: /Oat latte/ }).check();
  const canvas = await page.locator('.scene-canvas canvas').elementHandle();
  await page.locator('#pour').scrollIntoViewIfNeeded();
  await page.locator('#order').scrollIntoViewIfNeeded();
  expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
  await canvas!.evaluate((node) => (node as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());
  await expect(page.locator('.scene-canvas')).toHaveCount(0);
  await expect(page.getByRole('radio', { name: /Oat latte/ })).toBeChecked();
  await expect(page.locator('#order picture')).toBeVisible();
  await page.getByRole('button', { name: 'Add to order' }).click();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('opening the header cart holds the cup at its current story pose', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#order');
  await page.getByRole('button', { name: 'Add to order' }).click();
  await page.getByRole('link', { name: 'BREOU CAFFEE, back to the beginning' }).click();
  await page.locator('html[data-scene="ready"]').waitFor();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'moving', { timeout: 10_000 });
  await page.waitForTimeout(600);
  await page.addStyleTag({ content: '.cart-dialog::backdrop { background: transparent; }' });
  const clip = { x: 0, y: 120, width: 700, height: 600 };
  const before = await page.screenshot({ clip });
  await page.getByRole('button', { name: 'Review order, 1 cup', exact: true }).click();
  await page.waitForTimeout(500);
  const during = await page.screenshot({ clip });
  // Tolerant on purpose: redrawing identical state can flip a few pixels by 1-2 levels in the software renderer.
  expect(await countChangedPixels(page, before, during)).toBeLessThan(50);

  // Negative control: the same metric must flag a genuinely different story pose (canvas isolated from the DOM).
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.addStyleTag({ content: '* { visibility: hidden !important; } .scene-canvas, .scene-canvas * { visibility: visible !important; }' });
  await page.waitForTimeout(600);
  const poseA = await page.screenshot({ clip });
  await page.locator('#pour').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'moving', { timeout: 10_000 });
  await page.waitForTimeout(600);
  const poseB = await page.screenshot({ clip });
  expect(await countChangedPixels(page, poseA, poseB)).toBeGreaterThan(500);
});

test('an accepted long pickup name wraps inside the narrow receipt', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#order');
  await page.getByRole('button', { name: 'Add to order' }).click();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await page.getByLabel('Your name').fill('W'.repeat(80));
  await page.getByLabel('Email address').fill('ada@example.com');
  await page.getByLabel('Pickup time').selectOption('15');
  await page.getByRole('button', { name: /Place demo order/ }).click();
  await expect(page.getByRole('heading', { name: 'A little moment, made yours.' })).toBeVisible();
  expect(await page.getByRole('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
});

test('first paint defers distant chapter images until the visitor approaches them', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const distant: string[] = [];
  page.on('request', (request) => { if (/cup-s[2345]-/.test(request.url())) distant.push(request.url()); });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(distant).toEqual([]);
  await page.locator('#flavor').scrollIntoViewIfNeeded();
  await expect.poll(() => distant.some((url) => url.includes('cup-s2-'))).toBe(true);
  await expect.poll(() => page.locator('#flavor img').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});
