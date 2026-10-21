import { expect, type Page } from '@playwright/test';
import { bySlot, cats, clickButton, equipItem, pickCat, rowsAtRest, settled, startGame, test, ui, waitScene } from './helpers';

// ADR 0013: reduced motion. The player's choice beats the browser's, 'auto' follows it live, and the whole game plays calm.

const hook = <T>(page: Page, fn: () => T) => page.evaluate(fn);
const state = (page: Page) => hook(page, () => ({ reduced: window.__VISTE__?.reducedMotion, pref: window.__VISTE__?.motionPref }));

test.describe('with the browser asking for less motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test.setTimeout(120_000);

  test('starts reduced on a clean save, and the iris of a scene change ends as a fade', async ({ page }) => {
    await page.goto('/');
    await waitScene(page, 'Title');
    expect(await state(page)).toEqual({ reduced: true, pref: 'auto' });
    await clickButton(page, 'start');
    await waitScene(page, 'CatSelect');
    // Title -> CatSelect is a paw iris in the flow table; with reduced motion it was a plain fade.
    expect((await ui(page)).info.enter).toBe('fade');
  });

  test('the button wins over the browser, makes a click sound and the choice survives a reload', async ({ page }) => {
    await page.goto('/');
    await waitScene(page, 'Title');
    expect(await state(page)).toEqual({ reduced: true, pref: 'auto' });
    const before = await hook(page, () => window.__VISTE__?.sounds.length ?? 0);
    await clickButton(page, 'motion');
    await page.waitForFunction(() => window.__VISTE__?.motionPref === 'full');
    expect(await state(page)).toEqual({ reduced: false, pref: 'full' });
    expect(await hook(page, () => window.__VISTE__?.sounds.slice(-3))).toContain('sfx-click');
    expect(await hook(page, () => window.__VISTE__?.sounds.length ?? 0)).toBeGreaterThan(before);
    expect(await hook(page, () => window.__VISTE__?.saved.motion)).toBe('full');

    // The browser still says "reduce", but the player chose full motion: it persists and wins.
    await page.reload();
    await waitScene(page, 'Title');
    expect(await state(page)).toEqual({ reduced: false, pref: 'full' });
    await clickButton(page, 'start');
    await waitScene(page, 'CatSelect');
    expect((await ui(page)).info.enter).toBe('paw');

    // And back: the button saves the opposite of what is on now.
    await clickButton(page, 'motion');
    await page.waitForFunction(() => window.__VISTE__?.motionPref === 'reduce');
    expect(await state(page)).toEqual({ reduced: true, pref: 'reduce' });
  });

  test('the whole flow plays in reduced motion with no console errors (the fixture fails on any)', async ({ page }) => {
    await startGame(page);
    const cat = cats[4];
    await pickCat(page, cat.id);
    await clickButton(page, 'choose');
    // The walk to the shop, the bell and the door, and no camera dive: it fades into the fitting room.
    await waitScene(page, 'DressUp', 90_000);
    const s = await settled(page);
    expect(s.catId).toBe(cat.id);
    const sweater = bySlot('sweater')[0];
    expect((await equipItem(page, sweater)).layers).toEqual([sweater.id]);
    // Taking it off by its cross: the cat does not shake (the fur is tinted), and the game keeps answering.
    const rows = await rowsAtRest(page);
    await page.mouse.click(rows[0].close.x, rows[0].close.y);
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.layers.length === 0);
    await equipItem(page, sweater);
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    const download = page.waitForEvent('download');
    await clickButton(page, 'photo');
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
    expect(await state(page)).toEqual({ reduced: true, pref: 'auto' });
    await clickButton(page, 'keep');
    await waitScene(page, 'DressUp');
    await settled(page);
  });
});

test.describe('on automatic, the browser setting is followed live', () => {
  test.setTimeout(60_000);

  test('emulateMedia flips the state without reloading', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await waitScene(page, 'Title');
    expect(await state(page)).toEqual({ reduced: false, pref: 'auto' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => window.__VISTE__?.reducedMotion === true);
    expect((await state(page)).pref).toBe('auto');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => window.__VISTE__?.reducedMotion === false);
  });

  test('a chosen preference ignores the browser changes', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await waitScene(page, 'Title');
    await hook(page, () => window.__VISTE__?.setMotionPref('full'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Give the change event time to arrive: the state must not follow it.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await state(page)).toEqual({ reduced: false, pref: 'full' });
    await hook(page, () => window.__VISTE__?.setMotionPref('auto'));
    await page.waitForFunction(() => window.__VISTE__?.reducedMotion === true);
  });
});
