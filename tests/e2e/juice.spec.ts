import { expect } from '@playwright/test';
import clothesJson from '../../src/game/data/clothes.json' with { type: 'json' };
import combosJson from '../../src/game/data/combos.json' with { type: 'json' };
import { comboOutfit } from '../../src/game/domain/combos';
import { SLOT_ORDER } from '../../src/game/domain/slots';
import type { ClothingDef, ComboDef } from '../../src/game/domain/types';
import { bySlot, clickButton, dressWith, equipItem, openScene, settled, sharedTest as test, ui, waitScene } from './helpers';

// F9, Lote B: the "Media" juice of the backlog that the game can answer for from the outside.
const all = clothesJson as ClothingDef[];
const combos = combosJson as ComboDef[];
const byId = (id: string) => all.find((c) => c.id === id)!;
const NAME = 'Bigotes';

test.describe('the first-use hint and petting the cat', () => {
  test.setTimeout(90_000);

  test('after 4 s without a drop a ghost garment shows the way, and the first drop turns it off for good', async ({ page }) => {
    await openScene(page, 'DressUp', { name: NAME });
    await settled(page);
    expect((await settled(page)).hint).toMatchObject({ shown: 0, done: false });
    await page.waitForFunction(() => (window.__VISTE__?.dressUp?.hint.shown ?? 0) >= 1, undefined, { timeout: 20_000 });
    expect((await settled(page)).hint.done).toBe(false);
    await equipItem(page, bySlot('sweater')[0]);
    expect((await settled(page)).hint.done).toBe(true);
  });

  test('a cat that comes back already wearing a look needs no hint, and the look pops in', async ({ page }) => {
    await openScene(page, 'DressUp', { name: NAME });
    await settled(page);
    await dressWith(page, [bySlot('sweater')[0].id, bySlot('head')[0].id]);
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    await clickButton(page, 'keep');
    await waitScene(page, 'DressUp');
    const s = await settled(page);
    expect(s.layers).toHaveLength(2);
    expect(s.hint.done).toBe(true);
  });

  test('a click on the cat pets it: a purr and an answer, and it answers again later', async ({ page }) => {
    await openScene(page, 'DressUp', { name: NAME });
    const s = await settled(page);
    expect(s.pets).toBe(0);
    const eyes = s.slotAnchors.face;
    await page.mouse.move(eyes.x, eyes.y);
    await page.mouse.click(eyes.x, eyes.y);
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.pets === 1);
    expect(await page.evaluate(() => window.__VISTE__?.sounds.includes('sfx-purr'))).toBe(true);
    // The 400 ms cooldown is covered by the Cat integration test (a software renderer cannot time it); here it must answer again later.
    await expect.poll(async () => {
      await page.mouse.click(eyes.x, eyes.y);
      return (await settled(page)).pets;
    }, { timeout: 5000 }).toBe(2);
  });
});

test.describe('the Showcase reads the look', () => {
  test.setTimeout(90_000);

  test('a cat with nothing on is "al natural" and a very dressed one is "completo"', async ({ page }) => {
    await openScene(page, 'DressUp', { name: NAME });
    await settled(page);
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    expect((await ui(page)).info.title).toBe(`¡Al natural, ${NAME}!`);

    await clickButton(page, 'keep');
    await waitScene(page, 'DressUp');
    await settled(page);
    const five = ['sweater', 'head', 'neck', 'face', 'paws'].map((slot) => bySlot(slot)[0].id);
    await dressWith(page, five);
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    expect((await ui(page)).info.title).toBe(`¡Qué look tan completo, ${NAME}!`);
  });

  test('leaving with a gift unopened is not silent: the prize is kept and the Showcase says so', async ({ page }) => {
    const combo = combos[0];
    const outfit = comboOutfit(combo, all)!;
    const pieces = SLOT_ORDER.filter((slot) => outfit[slot]).map((slot) => byId(outfit[slot]!));
    await openScene(page, 'DressUp', { name: NAME });
    await settled(page);
    await dressWith(page, pieces.slice(0, -1).map((p) => p.id));
    await equipItem(page, pieces[pieces.length - 1]);
    await page.waitForFunction(() => (window.__VISTE__?.dressUp?.pendingGifts ?? 0) > 0 || window.__VISTE__?.dressUp?.gift != null, undefined, { timeout: 15_000 });
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    expect((await ui(page)).info.secrets).toBe(`Secretos 0/${combos.length}`);
    await page.waitForFunction(() => ((window.__VISTE__?.ui?.info as { toasts?: string[] } | undefined)?.toasts ?? []).includes('¡Te guardé tu regalito!'), undefined, { timeout: 15_000 });
    await page.waitForFunction((n) => (window.__VISTE__?.ui?.info as { secrets?: string } | undefined)?.secrets === `Secretos 1/${n}`, combos.length);
    expect(await page.evaluate(() => window.__VISTE__?.saved.secrets)).toEqual([combo.id]);
  });
});
