// F9 (ADR 0012, suite (b)): the magnet and the real drawing order, generated from clothes.json.
import { expect } from '@playwright/test';
import { slotZIndex } from '../../src/game/domain/slots';
import { bySlot, clearCat, clothes, dragTo, equipItem, openGame, settled, showItem, state, sharedTest as test } from './helpers';

const slots = [...new Set(clothes.map((c) => c.slot))];
/** The magnet is tried on the first, a middle and the last slot (each slot has its own anchor; trying all six costs a minute). */
const magnetSlots = [slots[0], slots[Math.floor(slots.length / 2)], slots[slots.length - 1]];
/** Magnet radius of DressUp, in game px (ADR 0008), and the page scale of 1280 x 720. */
const MAGNET_RADIUS = 110;

/** Lifts the first item of a slot with the mouse and leaves the button pressed over the cat. */
async function lift(page: import('@playwright/test').Page, item: (typeof clothes)[number]) {
  const s = await showItem(page, item);
  await page.mouse.move(s.cells[item.id].x, s.cells[item.id].y);
  await page.mouse.down();
  await page.mouse.move(s.dropZone.center.x, s.dropZone.center.y, { steps: 5 });
  await page.waitForFunction(() => window.__VISTE__?.dressUp?.dragging === true);
  return s;
}


type Zone = { dropZone: { x: number; y: number; width: number; height: number; center: { x: number; y: number } } };
/** The corner of the drop zone that is farthest from the anchor (always beyond the magnet radius). */
const farCorner = (s: Zone, anchor: { x: number; y: number }) => ({
  x: anchor.x < s.dropZone.center.x ? s.dropZone.x + s.dropZone.width - 4 : s.dropZone.x + 4,
  y: anchor.y < s.dropZone.center.y ? s.dropZone.y + s.dropZone.height - 4 : s.dropZone.y + 4,
});

test.describe('the magnet (ADR 0008)', () => {
  test('near the anchor of each slot the magnet holds the item, away from it lets go, and dropping there wears it', async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);
    for (const slot of magnetSlots) {
      const item = bySlot(slot)[0];
      await test.step(`${slot}: ${item.id}`, async () => {
        const s = await lift(page, item);
        const anchor = s.slotAnchors[slot];
        const px = s.pxPerGamePx;

        // 40 game px from the anchor: inside the radius.
        const near = { x: anchor.x + 40 * px, y: anchor.y };
        await page.mouse.move(near.x, near.y, { steps: 6 });
        await page.waitForFunction(() => window.__VISTE__?.dressUp?.magnet === true);

        // Still over the cat but beyond the radius (the corner of the drop zone farthest from the anchor): the magnet lets go.
        const far = farCorner(s, anchor);
        expect(Math.hypot(far.x - anchor.x, far.y - anchor.y)).toBeGreaterThan((MAGNET_RADIUS + 10) * px);
        await page.mouse.move(far.x, far.y, { steps: 4 });
        await page.waitForFunction(() => window.__VISTE__?.dressUp?.magnet === false);

        // Back near the anchor and let go: it is worn.
        await page.mouse.move(near.x, near.y, { steps: 4 });
        await page.waitForFunction(() => window.__VISTE__?.dressUp?.magnet === true);
        await page.mouse.up();
        await page.waitForFunction(({ sl, id }) => window.__VISTE__?.dressUp?.outfit[sl as 'head'] === id, { sl: slot, id: item.id });
        const done = await settled(page);
        expect(done.magnet).toBe(false);
        expect(done.layers).toEqual([item.id]);
        await clearCat(page);
      });
    }
  });

  test('a drop inside the cat but beyond the magnet radius is worn too, and a drop outside is not', async ({ page }) => {
    const item = clothes[0];
    await openGame(page);
    const s = await showItem(page, item);
    const px = s.pxPerGamePx;
    const anchor = s.slotAnchors[item.slot];
    const far = farCorner(s, anchor);
    expect(Math.hypot(far.x - anchor.x, far.y - anchor.y)).toBeGreaterThan((MAGNET_RADIUS + 10) * px);
    await dragTo(page, s.cells[item.id], far);
    expect((await settled(page)).outfit).toEqual({ [item.slot]: item.id });
  });
});

test.describe('the drawing order of the layers (ADR 0003)', () => {
  test('the cat draws the layers by slot order whatever the wearing order, and the hook reports that real order', async ({ page }) => {
    const picks = slots.map((slot) => bySlot(slot)[0]);
    expect(picks.length).toBeGreaterThanOrEqual(2);
    const frontFirst = [...picks].sort((a, b) => slotZIndex(b.slot) - slotZIndex(a.slot));
    const expected = [...picks].sort((a, b) => slotZIndex(a.slot) - slotZIndex(b.slot)).map((c) => c.id);
    await openGame(page);
    // The front-most one is dragged first and the back-most one last; the rest are put on through the hook.
    const dragged = [frontFirst[0], frontFirst[frontFirst.length - 1]];
    await page.evaluate((ids) => window.__VISTE__?.wear(ids), frontFirst.slice(1, -1).map((c) => c.id));
    await page.waitForFunction((n) => window.__VISTE__?.dressUp?.layers.length === n, picks.length - 2);
    for (const item of dragged) await equipItem(page, item);
    const s = await settled(page);
    expect(s.drawOrder).toEqual(expected);
    expect(s.layers).toEqual(expected);
    await expect.poll(async () => (await state(page)).layerRows.map((r) => r.itemId)).toEqual([...expected].reverse());
  });
});
