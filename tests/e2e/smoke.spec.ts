import { expect, test } from '@playwright/test';

test('home page responds 200 with a single main landmark', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('main')).toHaveCount(1);
});
