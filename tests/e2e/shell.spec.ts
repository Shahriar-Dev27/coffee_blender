import { expect, test } from '@playwright/test';
const chapters = ['arrival', 'ritual', 'flavor', 'pour', 'make-yours', 'order'];
test.describe('no JavaScript', () => {
 test.use({ javaScriptEnabled: false });
 for (const width of [320, 1280]) {
  test(`static chapters and catalog at ${width}px`, async ({ page }) => {
   await page.setViewportSize({ width, height: 800 });
   await page.goto('/');
   await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
   for (const id of chapters) await expect(page.locator(`section#${id}`)).toBeVisible();
   const stills = page.locator('picture img');
   await expect(stills).toHaveCount(6);
   for (const still of await stills.all()) {
    await still.scrollIntoViewIfNeeded();
    await expect(still).toBeVisible();
    await expect.poll(() => still.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    expect(await still.getAttribute('alt')).toBeTruthy();
   }
   await expect(page.locator('#order noscript p')).toContainText('No real orders or payments.');
   await expect(page.getByRole('button', { name: 'Add to order' })).not.toBeVisible();
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
 }
});
test('hero actions fit the first screen and semantic sections follow native scroll', async ({ page }) => {
 await page.setViewportSize({ width: 1280, height: 800 });
 await page.goto('/');
 await expect(page.getByRole('link', { name: 'Find your everyday' })).toBeInViewport();
 await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
 await expect(page.locator('main#main > [data-stage-track]')).toHaveCount(1);
 for (const id of chapters) await expect(page.locator(`section#${id}`)).toHaveAttribute('aria-labelledby', /.+-heading/);
 await expect(page.getByRole('navigation', { name: 'Stages' })).toHaveCount(0);
 await page.keyboard.press('Tab');
 await expect(page.getByRole('link', { name: 'Skip to your coffee' })).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#order')).toBeFocused();
});
