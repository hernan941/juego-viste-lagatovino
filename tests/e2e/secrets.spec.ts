// F8 (ADR 0012, suite (d)): one test per combo of data/combos.json, generated from the data (no ids hardcoded).
import { expect, type Page } from '@playwright/test';
import clothesJson from '../../src/game/data/clothes.json' with { type: 'json' };
import combosJson from '../../src/game/data/combos.json' with { type: 'json' };
import { comboOutfit } from '../../src/game/domain/combos';
import { SLOT_ORDER } from '../../src/game/domain/slots';
import type { ClothingDef, ComboDef } from '../../src/game/domain/types';
import { dragTo, dressWith, equipItem, openGame, settled, sharedTest as test, showItem, state } from './helpers';

const all = clothesJson as ClothingDef[];
const combos = combosJson as ComboDef[];
const byId = (id: string) => all.find((c) => c.id === id)!;

/** The pieces of a combo in slot order (the last one completes it). */
const pieces = (combo: ComboDef): ClothingDef[] => {
  const outfit = comboOutfit(combo, all)!;
  return SLOT_ORDER.filter((s) => outfit[s]).map((s) => byId(outfit[s]!));
};

async function waitGift(page: Page) {
  await page.waitForFunction(() => window.__VISTE__?.dressUp?.gift?.ready === true, undefined, { timeout: 15_000 });
  return state(page);
}

/** Puts the pieces on the cat through the test hook (no drag), so the real drop that follows is the one that matters. */
const wear = (page: Page, items: ClothingDef[]) => dressWith(page, items.map((i) => i.id));

/** Opens the box by dragging the bow away, as a player would. */
async function openGift(page: Page) {
  const s = await waitGift(page);
  const bow = s.gift!.bow;
  await dragTo(page, bow, { x: bow.x + 40, y: bow.y - 150 }, { smooth: true });
  await page.waitForFunction(() => window.__VISTE__?.dressUp?.gift === null && window.__VISTE__.dressUp.secrets.count > 0, undefined, { timeout: 15_000 });
  return settled(page);
}

test.describe('secret combos (F8)', () => {
  test.setTimeout(120_000);

  test('the catalog has a combo for every secret item', () => {
    expect(combos.length).toBeGreaterThanOrEqual(6);
    expect(combos.map((c) => c.rewardItemId).sort()).toEqual(all.filter((c) => c.secret).map((c) => c.id).sort());
  });

  test('locked secrets are not in any tab and the counter starts at 0', async ({ page }) => {
    await openGame(page);
    const secrets = all.filter((c) => c.secret);
    for (const category of new Set(secrets.map((c) => c.category))) {
      let s = await settled(page);
      if (s.activeTab !== category) {
        await page.mouse.click(s.tabs[category].x, s.tabs[category].y);
        await page.waitForFunction((c) => window.__VISTE__?.dressUp?.activeTab === c, category);
        s = await settled(page);
      }
      for (const secret of secrets.filter((c) => c.category === category)) expect(Object.keys(s.cells)).not.toContain(secret.id);
    }
    expect((await state(page)).secrets).toMatchObject({ count: 0, total: combos.length, text: `Secretos 0/${combos.length}` });
  });

  test('the "¡Arrastra el moño!" pill sits right above the bow, not up over the cat\'s face', async ({ page }) => {
    const combo = combos[0];
    await openGame(page);
    const worn = pieces(combo);
    await wear(page, worn.slice(0, -1));
    await equipItem(page, worn[worn.length - 1]);
    const { gift } = await waitGift(page);
    const rise = gift!.bow.y - gift!.pill.y;
    expect(rise).toBeGreaterThan(50);
    expect(rise).toBeLessThan(80);
    expect(Math.abs(gift!.pill.x - gift!.bow.x)).toBeLessThan(90);
  });

  test('the snow of the Navidad combo is over in 5 s: no emitter is left at 5.5 s', async ({ page }) => {
    const combo = combos.find((c) => c.reaction === 'snowfall')!;
    await openGame(page);
    const worn = pieces(combo);
    await wear(page, worn.slice(0, -1));
    expect((await state(page)).fxEmitters).toBe(0);
    // The page itself times the effect in game time (sum of the frame deltas): from the first emitter alive to the moment there is none.
    const timing = page.evaluate(() => new Promise<number>((resolve) => {
      let t0 = 0;
      const tick = () => {
        const d = window.__VISTE__?.dressUp;
        const n = d?.fxEmitters ?? 0;
        if (t0 === 0 && n > 0) t0 = d!.clockMs;
        else if (t0 > 0 && n === 0) return resolve(d!.clockMs - t0);
        requestAnimationFrame(tick);
      };
      tick();
    }));
    await equipItem(page, worn[worn.length - 1]);
    const elapsed = await timing;
    expect(elapsed).toBeGreaterThan(3000); // the flakes do fall for a while
    expect(elapsed).toBeLessThan(5500);
  });

  for (const combo of combos) {
    test(`combo "${combo.id}": reaction, gift, bow, wardrobe, counter, no second gift and reload`, async ({ page }) => {
      const reward = byId(combo.rewardItemId);
      await openGame(page);
      const worn = pieces(combo);
      await wear(page, worn.slice(0, -1));
      expect((await state(page)).gift).toBeNull();
      expect((await state(page)).secrets.count).toBe(0);

      await equipItem(page, worn[worn.length - 1]);
      // The reaction of the combo plays and the gift box drops in.
      const boxed = await waitGift(page);
      expect(boxed.reactions).toEqual([combo.reaction]);
      expect(boxed.gift).toMatchObject({ comboId: combo.id, itemId: reward.id, opened: false });
      expect(await page.evaluate(() => window.__VISTE__?.sounds)).toContain('sfx-gift');
      expect(boxed.secrets.count).toBe(0);
      // The name of the look goes on the sign (never over the cat's head) and it flips back to the cat's name.
      expect(boxed.secrets.signLog).toContain(combo.name);
      await page.waitForFunction((n) => window.__VISTE__?.dressUp?.secrets.sign === n, boxed.catName, { timeout: 6000 });

      // Letting go of the bow too early does not open it.
      const bow = boxed.gift!.bow;
      await dragTo(page, bow, { x: bow.x + 10, y: bow.y - 20 }, { smooth: true });
      expect((await settled(page)).gift).toMatchObject({ opened: false });

      const after = await openGift(page);
      expect(after.secrets).toMatchObject({ count: 1, unlocked: [combo.id], text: `Secretos 1/${combos.length}` });
      // The prize is in the wardrobe, on the tab of its slot, and it is saved.
      expect(after.activeTab).toBe(reward.category);
      expect(Object.keys(after.cells)).toContain(reward.id);
      await page.waitForFunction((id) => window.__VISTE__?.saved.secrets.includes(id), combo.id);

      // The same combo again: a short reaction, no second gift and the counter stays.
      const gone = after.layerRows.find((r) => r.itemId === worn[worn.length - 1].id)!;
      await page.mouse.click(gone.close.x, gone.close.y);
      await page.waitForFunction((slot) => !window.__VISTE__?.dressUp?.outfit[slot as 'head'], worn[worn.length - 1].slot);
      await equipItem(page, worn[worn.length - 1]);
      await page.waitForFunction(() => (window.__VISTE__?.dressUp?.reactions.length ?? 0) >= 2);
      // A gift would show up as a pending one right away; "settled" waits for the reaction and any gift to finish.
      const again = await settled(page);
      expect(again.gift).toBeNull();
      expect(again.pendingGifts).toBe(0);
      expect(again.secrets.count).toBe(1);

      // After a reload (ADR 0004): the counter, the saved secret and the prize in its tab are restored, and the prize can be worn.
      await page.reload();
      await settled(page);
      await page.waitForFunction((id) => window.__VISTE__?.saved.secrets.includes(id), combo.id);
      const back = await state(page);
      expect(back.secrets).toMatchObject({ count: 1, unlocked: [combo.id], text: `Secretos 1/${combos.length}` });
      expect(back.gift).toBeNull();
      const shown = await showItem(page, reward);
      expect(shown.cells[reward.id]).toBeDefined();
      expect((await equipItem(page, reward)).outfit[reward.slot]).toBe(reward.id);
    });
  }

  // 'an unlocked secret survives a reload, is draggable and the counter is restored' is now the last part of every combo test above.

  test('a locked second combo still gives its own gift', async ({ page }) => {
    const [first, second] = combos;
    await openGame(page);
    const one = pieces(first);
    await wear(page, one.slice(0, -1));
    await equipItem(page, one[one.length - 1]);
    await openGift(page);
    // Start from a clean cat, then complete the second combo.
    await page.evaluate(() => window.__VISTE__?.wear([]));
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.layers.length === 0);
    const two = pieces(second);
    await wear(page, two.slice(0, -1));
    await equipItem(page, two[two.length - 1]);
    const boxed = await waitGift(page);
    expect(boxed.gift?.comboId).toBe(second.id);
    const done = await openGift(page);
    expect(done.secrets.count).toBe(2);
  });

  test('the prize lands before the counter goes up and its cell appears', async ({ page }) => {
    const combo = combos[0];
    await openGame(page);
    const worn = pieces(combo);
    await wear(page, worn.slice(0, -1));
    await equipItem(page, worn[worn.length - 1]);
    const s = await waitGift(page);
    const bow = s.gift!.bow;
    await dragTo(page, bow, { x: bow.x + 40, y: bow.y - 150 }, { smooth: true });
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.secrets.count === 1, undefined, { timeout: 10_000 });
    // The scene writes down the state of the prize and the counter at each step (no timer of the test can miss the short flight).
    const samples = (await state(page)).secrets.trace;
    // While the prize flew the cell was held back and the counter had not moved...
    const flying = samples.filter((x) => x.revealing.length > 0);
    expect(flying.length).toBeGreaterThan(0);
    for (const x of flying) {
      expect(x.revealing).toEqual([combo.rewardItemId]);
      expect(x.count).toBe(0);
      expect(x.text).toBe(`Secretos 0/${combos.length}`);
    }
    // ...and the counter went up only when nothing was held back any more.
    const raised = samples.find((x) => x.count === 1)!;
    expect(raised.revealing).toEqual([]);
    const after = await settled(page);
    expect(after.secrets).toMatchObject({ count: 1, revealing: [], text: `Secretos 1/${combos.length}` });
  });

  test('"¡Casi...!" hint shows when exactly one piece of a combo is missing', async ({ page }) => {
    const combo = combos.find((c) => c.requires.length >= 3)!;
    const worn = pieces(combo);
    await openGame(page);
    // The first and the middle pieces are put on through the hook; the piece that completes the combo is dragged.
    await wear(page, [worn[0]]);
    expect((await state(page)).almost).not.toContain(combo.id);
    await wear(page, worn.slice(0, -1));
    await page.waitForFunction((id) => window.__VISTE__?.dressUp?.almost.includes(id), combo.id);
    await equipItem(page, worn[worn.length - 1]);
    await page.waitForFunction((id) => !window.__VISTE__?.dressUp?.almost.includes(id), combo.id);
  });

  test('leaving with an unopened gift keeps the prize', async ({ page }) => {
    const combo = combos[0];
    await openGame(page);
    const worn = pieces(combo);
    await wear(page, worn.slice(0, -1));
    await equipItem(page, worn[worn.length - 1]);
    await waitGift(page);
    const u = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.ui ?? null)));
    await page.mouse.click(u.buttons.finish.x, u.buttons.finish.y);
    await page.waitForFunction(() => window.__VISTE__?.scene === 'Showcase' && window.__VISTE__.ui?.ready === true, undefined, { timeout: 30_000 });
    // The prize was kept. The Showcase shows the old count first and pops to the new one with its "¡Te guardé tu regalito!" toast.
    await page.waitForFunction((n) => (window.__VISTE__?.ui?.info as { secrets?: string } | undefined)?.secrets === `Secretos 1/${n}`, combos.length, { timeout: 15_000 });
    expect(await page.evaluate(() => window.__VISTE__?.saved.secrets)).toEqual([combo.id]);
  });
});
