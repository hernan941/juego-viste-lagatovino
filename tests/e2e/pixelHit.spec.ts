import { expect } from '@playwright/test';
import { slotZIndex } from '../../src/game/domain/slots';
import { bySlot, dragTo, equipItem, openGame, outsidePoint, settled, test } from './helpers';

const SLOTS = ['sweater', 'head', 'neck', 'face', 'paws', 'accessory'] as const;

test('with 6 layers worn, dragging each one off takes that item and no other', async ({ page }) => {
  test.setTimeout(420_000);
  await openGame(page);
  // Back to front: every item is taken off while the ones in front of it (that could cover it) are still worn.
  const items = SLOTS.map((slot) => bySlot(slot)[0]).sort((a, b) => slotZIndex(a.slot) - slotZIndex(b.slot));
  for (const item of items) await equipItem(page, item);

  const left = [...items];
  for (const item of items) {
    let s = await settled(page);
    expect(s.layers.sort()).toEqual(left.map((i) => i.id).sort());
    await dragTo(page, s.layerGrab[item.id], outsidePoint(s));
    await page.waitForFunction((slot) => !window.__VISTE__?.dressUp?.outfit[slot as 'head'], item.slot);
    left.splice(left.indexOf(item), 1);
    s = await settled(page);
    expect(s.layers.sort(), `only ${item.id} left`).toEqual(left.map((i) => i.id).sort());
  }
});

test('every accessory can be grabbed by its body, even outside the torso box, and taken off', async ({ page }) => {
  test.setTimeout(240_000);
  await openGame(page);
  await equipItem(page, bySlot('sweater')[0]);
  await equipItem(page, bySlot('head')[0]);
  for (const item of bySlot('accessory')) {
    await equipItem(page, item);
    const s = await settled(page);
    await dragTo(page, s.layerGrab[item.id], outsidePoint(s));
    await page.waitForFunction((slot) => !window.__VISTE__?.dressUp?.outfit[slot as 'accessory'], item.slot);
    const after = await settled(page);
    expect(after.layers.sort(), `${item.id} left alone`).toEqual([bySlot('sweater')[0].id, bySlot('head')[0].id].sort());
  }
});
