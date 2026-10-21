import { expect } from '@playwright/test';
import { SAVE_KEY } from '../../src/game/plugins/saveCore';
import {
  bySlot, cats, clickButton, equipItem, pickCat, settled, startGame, test, ui, waitScene,
} from './helpers';

const CAT = cats[2];
const NAME = 'Bigotes';
const INFO = (page: import('@playwright/test').Page) => page.evaluate(() => window.__VISTE__?.ui?.info as Record<string, unknown>);

test.describe('saving (ADR 0004)', () => {
  test.setTimeout(150_000);

  test('after a reload the cat, the name, the outfit and the mute come back', async ({ page }) => {
    await page.goto(`/?start=DressUp&cat=${CAT.id}&name=${NAME}`);
    await settled(page);
    const sweater = bySlot('sweater')[0];
    const head = bySlot('head')[0];
    await equipItem(page, sweater);
    await equipItem(page, head);
    await clickButton(page, 'mute');
    await page.waitForFunction(() => window.__VISTE__?.muted === true);
    await page.waitForFunction(
      ([c, n, s, h]) => {
        const v = window.__VISTE__?.saved;
        return v?.catId === c && v.catName === n && v.outfit.sweater === s && v.outfit.head === h && v.muted === true;
      },
      [CAT.id, NAME, sweater.id, head.id] as const,
    );

    // A new visit: "Iniciar" leads to CatSelect with the cat and the name already chosen.
    await startGame(page);
    expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(true);
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { selected?: string | null } | undefined)?.selected != null);
    expect(await INFO(page)).toMatchObject({ selected: CAT.id, name: NAME });
    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    await page.mouse.click(300, 300);
    await waitScene(page, 'DressUp', 20_000);
    const dress = await settled(page);
    expect(dress.catId).toBe(CAT.id);
    expect(dress.catName).toBe(NAME);
    expect(dress.layers).toEqual([sweater.id, head.id]);
  });

  test('removing a piece and changing cat are saved too', async ({ page }) => {
    await page.goto(`/?start=DressUp&cat=${CAT.id}&name=${NAME}`);
    await settled(page);
    const sweater = bySlot('sweater')[0];
    const s = await equipItem(page, sweater);
    await page.mouse.click(s.layerRows[0].close.x, s.layerRows[0].close.y);
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.layers.length === 0);
    await page.waitForFunction(() => Object.keys(window.__VISTE__?.saved.outfit ?? { x: 1 }).length === 0);

    await clickButton(page, 'change');
    await waitScene(page, 'CatSelect');
    const other = cats[5];
    await pickCat(page, other.id);
    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    await page.waitForFunction((id) => window.__VISTE__?.saved.catId === id, other.id);
    // The name the player typed follows them to the new cat.
    expect((await page.evaluate(() => window.__VISTE__?.saved))?.catName).toBe(NAME);
  });

  for (const [label, raw] of [
    ['corrupt JSON', '{esto no es json'],
    ['a version from the future', JSON.stringify({ version: 99, catId: cats[0].id, catName: 'Futuro', outfit: {}, secrets: [], muted: true })],
    ['a cat that no longer exists', JSON.stringify({ version: 1, catId: 'ya-no-existe', catName: 'X', outfit: { sweater: 'tampoco' }, secrets: [], muted: false })],
  ] as const) {
    test(`${label} in the storage starts clean and the game keeps working`, async ({ page }) => {
      await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [SAVE_KEY, raw] as const);
      await startGame(page);
      expect((await ui(page)).info.selected).toBeNull();
      expect(await page.evaluate(() => window.__VISTE__?.session)).toMatchObject({ catId: null, catName: '', outfit: {} });
      if (label !== 'a version from the future') expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(false);

      await pickCat(page, CAT.id);
      await clickButton(page, 'choose');
      await waitScene(page, 'ShopEntrance');
      await page.mouse.click(300, 300);
      await waitScene(page, 'DressUp', 20_000);
      await settled(page);
      await page.waitForFunction((id) => window.__VISTE__?.saved.catId === id, CAT.id);
    });
  }
});
