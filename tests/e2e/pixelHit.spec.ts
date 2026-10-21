import { expect } from '@playwright/test';
import { bySlot, dragTo, equipItem, openGame, outsidePoint, settled, test } from './helpers';

const SLOTS = ['sweater', 'head', 'neck', 'face', 'paws', 'accessory'] as const;

test('with 6 layers worn, dragging each one off takes that item and no other', async ({ page }) => {
  test.setTimeout(240_000);
  await openGame(page);
  const items = SLOTS.map((slot) => bySlot(slot)[0]);
  for (const item of items) await equipItem(page, item);

  for (const item of items) {
    let s = await settled(page);
    expect(s.layers).toHaveLength(items.length);
    await dragTo(page, s.layerGrab[item.id], outsidePoint(s));
    await page.waitForFunction((slot) => !window.__VISTE__?.dressUp?.outfit[slot as 'head'], item.slot);
    s = await settled(page);
    expect(s.layers.sort(), `only ${item.id} left`).toEqual(items.filter((i) => i !== item).map((i) => i.id).sort());
    await equipItem(page, item);
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
