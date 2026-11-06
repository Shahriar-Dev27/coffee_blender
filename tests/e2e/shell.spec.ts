import { expect, test } from '@playwright/test';

const HEADINGS = [
  'One cup, made while you scroll.',
  'The blend',
  'Beans in',
  'Milk, then something sweet',
  'Your cup',
];

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const size of [
    { width: 320, height: 640 },
    { width: 1280, height: 800 },
  ]) {
    test(`stacked layout at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/');

      for (const name of HEADINGS) {
        await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      }
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(HEADINGS[0]);

      const stills = page.locator('section[data-stage] picture img');
      await expect(stills).toHaveCount(5);
      for (let i = 0; i < 5; i += 1) {
        const still = stills.nth(i);
        await expect(still).toBeVisible();
        expect(((await still.getAttribute('alt')) ?? '').trim().length).toBeGreaterThan(0);
        const box = await still.boundingBox();
        expect(box?.width).toBeGreaterThan(0);
        expect(box?.height).toBeGreaterThan(0);
      }

      await expect(page.locator('html')).not.toHaveClass(/has-motion/);
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.inner);

      // Playwright's text engine skips <noscript>, so reach the paragraph by CSS.
      const notice = page.locator('#order noscript p');
      await expect(notice).toBeVisible();
      await expect(notice).toHaveText('Turn on JavaScript to build and order a cup.');
    });
  }
});

test.describe('hero at 1280x800', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('headline, sentence and action are in view without scrolling', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByText('Choose the blend, roast and milk, then order it for pickup.'),
    ).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('link', { name: 'Build your cup' })).toBeInViewport({
      ratio: 1,
    });
  });
});

test.describe('keyboard and landmarks', () => {
  test('first Tab reaches the skip link and Enter moves focus to the order', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to your order' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#order')).toBeFocused();
  });

  test('the rail has five stage links that come after the header', async ({ page }) => {
    await page.goto('/');
    const rail = page.getByRole('navigation', { name: 'Stages' });
    await expect(rail.getByRole('link')).toHaveCount(5);
    await expect(rail.getByRole('link')).toHaveText([
      'Cup',
      'Blend',
      'Beans in',
      'Milk and extras',
      'Your cup',
    ]);
    const headerBeforeRail = await page.evaluate(() => {
      const header = document.querySelector('header');
      const nav = document.querySelector('nav[aria-label="Stages"]');
      if (!header || !nav) return false;
      return Boolean(header.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(headerBeforeRail).toBe(true);
    await expect(rail.getByRole('link').first()).toHaveAttribute('aria-current', 'step');
  });

  test('sections follow the DOM contract', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main#main > [data-stage-track]')).toHaveCount(1);
    for (let n = 1; n <= 5; n += 1) {
      const section = page.locator(`section#stage-${n}[data-stage="${n}"]`);
      await expect(section).toHaveAttribute('aria-labelledby', `stage-${n}-heading`);
      await expect(section).toHaveAttribute('style', /--span:/);
      await expect(page.locator(`#stage-${n}-heading`)).toHaveCount(1);
    }
    await expect(page.locator('h1#stage-1-heading')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#stage-5 #order')).toHaveAttribute('tabindex', '-1');
  });
});
