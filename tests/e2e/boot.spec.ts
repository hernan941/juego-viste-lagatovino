import { expect } from '@playwright/test';
import { bySlot, cats, dressWith, settled, test, waitScene } from './helpers';

test('the game boots through the Preloader to the Title with a canvas and no console errors', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForFunction(() => window.__VISTE__?.scene === 'Title', undefined, { timeout: 30_000 });
  expect(await page.evaluate(() => window.__VISTE__?.scene)).toBe('Title');

  const box = await page.locator('canvas').boundingBox();
  expect(box?.width).toBeGreaterThan(0);
});

test('a test start query jumps to the scene under test with a cat already chosen', async ({ page }) => {
  await page.goto('/?start=Showcase&name=Mimi');
  await page.waitForFunction(() => window.__VISTE__?.scene === 'Showcase', undefined, { timeout: 30_000 });
  const session = await page.evaluate(() => window.__VISTE__?.session);
  expect(session?.catName).toBe('Mimi');
  expect(session?.catId).not.toBeNull();
});

test('the test hook jumps to another scene without reloading and starts it clean', async ({ page }) => {
  await page.goto('/?start=DressUp');
  await settled(page);
  await dressWith(page, [bySlot('sweater')[0].id]);
  await page.evaluate(() => { (window as unknown as { __marker: number }).__marker = 1; });

  const other = cats[cats.length - 1];
  await page.evaluate(([cat, name]) => window.__VISTE__?.jump('DressUp', cat, name), [other.id, 'Mimi']);
  // The old scene is gone at once (nothing stale to read) and the new one starts naked with the cat and name asked for.
  expect(await page.evaluate(() => window.__VISTE__?.dressUp?.settled)).not.toBe(true);
  const s = await settled(page);
  expect(s).toMatchObject({ catId: other.id, catName: 'Mimi', layers: [], outfit: {} });
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);

  await page.evaluate(() => window.__VISTE__?.jump('Showcase'));
  await waitScene(page, 'Showcase');
  expect(await page.evaluate(() => window.__VISTE__?.dressUp)).toBeNull();
});

test('the test hook resets the progress (save, mute and sound log) so a running page can be reused', async ({ page }) => {
  await page.goto('/?start=DressUp&name=Mimi');
  await settled(page);
  await dressWith(page, [bySlot('sweater')[0].id]);
  await page.evaluate(() => window.__VISTE__?.setMuted(true));
  await page.waitForFunction(() => window.__VISTE__?.saved.muted === true && window.__VISTE__.saved.catName === 'Mimi');

  await page.evaluate(() => window.__VISTE__?.reset());
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.saved)));
  expect(saved).toMatchObject({ catId: null, catName: '', outfit: {}, secrets: [], muted: false });
  expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(false);
  expect(await page.evaluate(() => window.__VISTE__?.sounds)).toEqual([]);
});

test('the test hook can park the game (no frames, no CPU) while another page is tested, and wake it again', async ({ page }) => {
  await page.goto('/?start=DressUp');
  await settled(page);
  const twoFrames = () => page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  const frames = () => page.evaluate(() => window.__VISTE__!.frames);

  await page.evaluate(() => window.__VISTE__?.park(true));
  const parked = await frames();
  await twoFrames();
  await twoFrames();
  expect(await frames()).toBe(parked);

  await page.evaluate(() => window.__VISTE__?.park(false));
  await page.waitForFunction((n) => (window.__VISTE__?.frames ?? 0) > n, parked);
});
