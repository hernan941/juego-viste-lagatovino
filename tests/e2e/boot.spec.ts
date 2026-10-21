import { expect, test } from '@playwright/test';

test('the game boots through the Preloader to the Title with a canvas and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => window.__VISTE__?.scene === 'Title', undefined, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__VISTE__?.scene)).toBe('Title');

  const box = await page.locator('canvas').boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('a test start query jumps to the scene under test with a cat already chosen', async ({ page }) => {
  await page.goto('/?start=Showcase&name=Mimi');
  await page.waitForFunction(() => window.__VISTE__?.scene === 'Showcase', undefined, { timeout: 30_000 });
  const session = await page.evaluate(() => window.__VISTE__?.session);
  expect(session?.catName).toBe('Mimi');
  expect(session?.catId).not.toBeNull();
});
