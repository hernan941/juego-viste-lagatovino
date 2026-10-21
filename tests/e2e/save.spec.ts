import { expect } from '@playwright/test';
import { SAVE_KEY } from '../../src/game/plugins/saveCore';
import clothesJson from '../../src/game/data/clothes.json' with { type: 'json' };
import combosJson from '../../src/game/data/combos.json' with { type: 'json' };
import { comboOutfit } from '../../src/game/domain/combos';
import { SLOT_ORDER } from '../../src/game/domain/slots';
import type { ClothingDef, ComboDef } from '../../src/game/domain/types';
import {
  bySlot, cats, clickButton, dragTo, dressWith, equipItem, openScene, pickCat, sharedTest, settled, showItem, startGame, state, test, ui, waitScene,
} from './helpers';

const all = clothesJson as ClothingDef[];
const combos = combosJson as ComboDef[];
const byId = (id: string) => all.find((c) => c.id === id)!;

const CAT = cats[2];
const NAME = 'Bigotes';
const INFO = (page: import('@playwright/test').Page) => page.evaluate(() => window.__VISTE__?.ui?.info as Record<string, unknown>);

test.describe('saving (ADR 0004)', () => {
  test.setTimeout(120_000);

  // 'after a reload the cat, the name, the outfit and the mute come back' is replaced by the test below, which checks all of that
  // and the secrets in a single reload (same flow through the real Title and CatSelect, strictly more assertions).

  test('one reload brings back everything together: cat, name, outfit, mute, motion and secrets', async ({ page }) => {
    const combo = combos[0];
    const reward = byId(combo.rewardItemId);
    const pieces = SLOT_ORDER.filter((slot) => comboOutfit(combo, all)![slot]).map((slot) => byId(comboOutfit(combo, all)![slot]!));
    await page.goto(`/?start=DressUp&cat=${CAT.id}&name=${NAME}`);
    await settled(page);
    await dressWith(page, pieces.slice(0, -1).map((p) => p.id));
    await equipItem(page, pieces[pieces.length - 1]);
    // Open the gift (drag the bow away) so that the secret is unlocked, then mute.
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.gift?.ready === true, undefined, { timeout: 15_000 });
    const bow = (await state(page)).gift!.bow;
    await dragTo(page, bow, { x: bow.x + 40, y: bow.y - 150 }, { smooth: true });
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.gift === null && window.__VISTE__.dressUp.secrets.count === 1, undefined, { timeout: 15_000 });
    await clickButton(page, 'mute');
    await page.waitForFunction(() => window.__VISTE__?.muted === true);
    // ... and calm the motion with the button (ADR 0013): it is a saved choice too.
    await clickButton(page, 'motion');
    await page.waitForFunction(() => window.__VISTE__?.motionPref === 'reduce' && window.__VISTE__.reducedMotion === true);
    const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.saved)));
    expect(before).toMatchObject({ catId: CAT.id, catName: NAME, muted: true, motion: 'reduce', secrets: [combo.id] });

    // A new visit (a full page load of "/", not the test shortcut): everything comes back through the real flow.
    await startGame(page);
    expect(await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.saved)))).toEqual(before);
    expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(true);
    expect(await page.evaluate(() => [window.__VISTE__?.motionPref, window.__VISTE__?.reducedMotion])).toEqual(['reduce', true]);
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { selected?: string | null } | undefined)?.selected != null);
    expect(await INFO(page)).toMatchObject({ selected: CAT.id, name: NAME });
    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    await page.mouse.click(300, 300);
    await waitScene(page, 'DressUp', 20_000);
    const s = await settled(page);
    expect(s.catId).toBe(CAT.id);
    expect(s.catName).toBe(NAME);
    expect(s.layers.sort()).toEqual(pieces.map((p) => p.id).sort());
    expect(s.secrets).toMatchObject({ count: 1, unlocked: [combo.id], text: `Secretos 1/${combos.length}` });
    expect(s.gift).toBeNull();
    expect((await showItem(page, reward)).cells[reward.id]).toBeDefined();
  });

  // No reload here, so it runs on the page that the worker shares.
  sharedTest('removing a piece and changing cat are saved too', async ({ page }) => {
    await openScene(page, 'DressUp', { cat: CAT.id, name: NAME });
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
