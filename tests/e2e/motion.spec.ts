import { expect, test, type Page } from '@playwright/test';

/** Same stubs as the existing scene tests so the boot script picks a non-low tier. */
async function enableMotion(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  });
}
const html = (page: Page) => page.locator('html');
const armed = (page: Page) => page.locator('html[data-motion]').waitFor({ state: 'attached' });
/** Waits for a movement to start (if it does), then for the layer to report idle. */
async function settle(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.motion === 'moving', undefined, { timeout: 1_000 }).catch(() => undefined);
  await expect(html(page)).toHaveAttribute('data-motion', 'idle', { timeout: 10_000 });
}

test.describe('motion layer: smooth scroll and story', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the motion layer is desktop-tier only');
    await enableMotion(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('Lenis drives wheel scrolling and the story settles', async ({ page }) => {
    await page.goto('/');
    await armed(page);
    await expect(html(page)).toHaveClass(/(^|\s)lenis(\s|$)/);
    await page.mouse.move(640, 400);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1500);
    await settle(page);
  });

  test('in-page anchors keep hash and focus semantics', async ({ page }) => {
    await page.goto('/');
    await armed(page);
    await page.locator('.header-cta').click();
    await expect(page).toHaveURL(/#order$/);
    await expect(page.locator('#order')).toBeInViewport();
    await page.goto('/');
    await armed(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to your coffee' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#order')).toBeFocused();
    await settle(page);
  });

  test('checkout pauses Lenis and closing restores it', async ({ page }) => {
    await page.goto('/#order');
    await armed(page);
    await page.getByRole('button', { name: 'Add to order' }).click();
    await page.getByRole('button', { name: 'Review order', exact: true }).click();
    await expect(html(page)).toHaveClass(/lenis-stopped/);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, -800);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await page.keyboard.press('Escape');
    await expect(html(page)).not.toHaveClass(/lenis-stopped/);
  });

  test('reduced motion never starts the layer', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(html(page)).not.toHaveClass(/(^|\s)lenis(\s|$)/);
    await expect(html(page)).not.toHaveAttribute('data-motion');
  });

  test('?capture bypasses the layer', async ({ page }) => {
    await page.goto('/?capture=0');
    await page.waitForLoadState('networkidle');
    await expect(html(page)).not.toHaveClass(/(^|\s)lenis(\s|$)/);
    await expect(html(page)).not.toHaveAttribute('data-motion');
  });

  test('turning on reduced motion at runtime tears the layer down', async ({ page }) => {
    await page.goto('/');
    await armed(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(html(page)).not.toHaveClass(/(^|\s)lenis(\s|$)/);
    await expect(html(page)).not.toHaveAttribute('data-motion');
  });
});
