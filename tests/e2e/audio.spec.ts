import { expect, test } from '@playwright/test';
import { SfxKeys } from '../../src/game/constants';

const watchConsole = (page: import('@playwright/test').Page) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
};

test('every sound effect loads from the Preloader without console errors', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__VISTE__?.scene === 'DressUp', undefined, { timeout: 15_000 });
  const loaded = await page.evaluate(() => window.__VISTE__?.loadedSounds ?? []);
  expect([...loaded].sort()).toEqual(Object.values(SfxKeys).sort());
  expect(errors).toEqual([]);
});

test('the mute persists across reloads', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__VISTE__?.scene === 'DressUp', undefined, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(false);

  await page.evaluate(() => window.__VISTE__?.setMuted(true));
  expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(true);

  await page.reload();
  await page.waitForFunction(() => window.__VISTE__?.scene === 'DressUp', undefined, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(true);

  await page.evaluate(() => window.__VISTE__?.setMuted(false));
  await page.reload();
  await page.waitForFunction(() => window.__VISTE__?.scene === 'DressUp', undefined, { timeout: 15_000 });
  expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(false);
  expect(errors).toEqual([]);
});
