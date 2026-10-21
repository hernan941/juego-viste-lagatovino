import { expect } from '@playwright/test';
import { SfxKeys } from '../../src/game/constants';
import { test } from './helpers';

test('every sound effect loads from the Preloader without console errors', async ({ page }) => {
  await page.goto('/?start=DressUp');
  await page.waitForFunction(() => window.__VISTE__?.scene === 'DressUp', undefined, { timeout: 15_000 });
  const loaded = await page.evaluate(() => window.__VISTE__?.loadedSounds ?? []);
  expect([...loaded].sort()).toEqual(Object.values(SfxKeys).sort());
});

test('the mute persists across reloads', async ({ page }) => {
  await page.goto('/?start=DressUp');
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
});
