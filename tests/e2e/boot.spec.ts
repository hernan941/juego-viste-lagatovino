import { expect, test } from '@playwright/test';

test('the game boots through Preloader to DressUp with a canvas and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => window.__VISTE__?.scene === 'DressUp', undefined, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__VISTE__?.scene)).toBe('DressUp');

  const box = await page.locator('canvas').boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
