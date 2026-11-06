import { expect, test } from '@playwright/test';

const HEADINGS = [
  ['ritual-heading', 'Not just coffee. A small reset.'],
  ['flavor-heading', 'Big character. Little cup.'],
  ['pour-heading', 'Good things take a moment.'],
  ['personalize-heading', 'A splash. A swirl. All you.'],
  ['order-heading', 'Your cup. Your call.'],
] as const;

for (const javaScriptEnabled of [true, false]) {
  test.describe(javaScriptEnabled ? 'with JavaScript' : 'without JavaScript', () => {
    test.use({ javaScriptEnabled });
    test('split headings keep one clean accessible name and labelled regions', async ({ page }) => {
      await page.goto('/');
      for (const [id, name] of HEADINGS) {
        const heading = page.getByRole('heading', { level: 2, name, exact: true });
        await expect(heading).toHaveAttribute('id', id);
        await expect(heading.locator('.reveal-lines')).toHaveAttribute('aria-hidden', 'true');
        await expect(page.getByRole('region', { name, exact: true })).toHaveCount(1);
      }
      await expect(page.locator('[data-reveal][data-parallax]')).toHaveCount(0);
      await expect(page.locator('#arrival [data-reveal]')).toHaveCount(0);
    });
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every reveal target renders at rest', async ({ page }) => {
    await page.goto('/');
    const bad = await page.locator('[data-reveal], .reveal-word').evaluateAll((els) =>
      els.filter((el) => getComputedStyle(el).opacity !== '1' || getComputedStyle(el).filter !== 'none' || (el.getAttribute('style') ?? '').trim() !== '').length);
    expect(bad).toBe(0);
  });
});
