import { expect } from '@playwright/test';
import { bySlot, layerGrabAtRest, clearCat, clothes, dragTo, equipItem, openGame, outsidePoint, rowsAtRest, settled, showItem, state, sharedTest as test } from './helpers';

test('the game starts in DressUp with the cats and an empty outfit', async ({ page }) => {
  const s = await openGame(page);
  expect(s.catIds.length).toBeGreaterThan(0);
  expect(s.catIds).toContain(s.catId);
  expect(s.outfit).toEqual({});
  expect(Object.keys(s.tabs).length).toBeGreaterThanOrEqual(2);
});

// One boot per category (not per item): every item of clothes.json is still dragged with the mouse, one at a time, from a bare cat.
// In chunks of 6 so that no test is long (the sweaters are 16).
const categories = [...new Set(clothes.map((c) => c.category))];
const CHUNK = 6;
const chunks = categories.flatMap((category) => {
  const items = clothes.filter((c) => c.category === category);
  return Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => ({ category, part: i + 1, of: Math.ceil(items.length / CHUNK), items: items.slice(i * CHUNK, (i + 1) * CHUNK) }));
});
for (const { category, part, of, items } of chunks) {
  test(`dropping each item of "${category}" on the cat wears it (${part}/${of})`, async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page);
    for (const item of items) {
      await test.step(item.id, async () => {
        const s = await equipItem(page, item);
        expect(s.outfit).toEqual({ [item.slot]: item.id });
        expect(s.layers).toEqual([item.id]);
        expect(s.drawOrder).toEqual([item.id]);
        await expect.poll(async () => (await state(page)).layerRows.map((r) => r.itemId)).toEqual([item.id]);
        await clearCat(page);
      });
    }
  });
}

test('dropping outside the cat does not wear the item and it returns to its cell', async ({ page }) => {
  const item = clothes[0];
  await openGame(page);
  const before = await showItem(page, item);
  const out = outsidePoint(before);
  expect(out.x < before.dropZone.x || out.y > before.dropZone.y + before.dropZone.height).toBe(true);
  await dragTo(page, before.cells[item.id], out);
  const after = await settled(page);
  expect(after.outfit).toEqual({});
  expect(after.layers).toEqual([]);
  expect(after.cells[item.id]).toEqual(before.cells[item.id]);
});

test('an item of the same slot replaces the previous one', async ({ page }) => {
  const slot = [...new Set(clothes.map((c) => c.slot))].find((s) => bySlot(s).length >= 2)!;
  const [first, second] = bySlot(slot);
  await openGame(page);
  await equipItem(page, first);
  const s = await equipItem(page, second);
  expect(s.outfit).toEqual({ [slot]: second.id });
  expect(s.layers).toEqual([second.id]);
  await expect.poll(async () => (await state(page)).layerRows.map((r) => r.itemId)).toEqual([second.id]);
});

test('dragging a worn item off the cat takes it off', async ({ page }) => {
  const item = clothes[0];
  await openGame(page);
  const worn = await equipItem(page, item);
  await dragTo(page, await layerGrabAtRest(page, item.id), outsidePoint(worn));
  await page.waitForFunction(() => Object.keys(window.__VISTE__?.dressUp?.outfit ?? {}).length === 0);
  const s = await settled(page);
  expect(s.layers).toEqual([]);
  await expect.poll(async () => (await state(page)).layerRows).toEqual([]);
});

test('dropping a worn item back on the cat keeps it', async ({ page }) => {
  const item = clothes[0];
  await openGame(page);
  const worn = await equipItem(page, item);
  await dragTo(page, await layerGrabAtRest(page, item.id), { x: worn.dropZone.center.x, y: worn.dropZone.center.y });
  const s = await settled(page);
  expect(s.outfit).toEqual({ [item.slot]: item.id });
});

test('the cross of the layers panel takes the item off', async ({ page }) => {
  const item = clothes[0];
  await openGame(page);
  await equipItem(page, item);
  await expect.poll(async () => (await state(page)).layerRows.length).toBe(1);
  const row = (await rowsAtRest(page))[0];
  await page.mouse.move(row.close.x, row.close.y);
  await page.mouse.click(row.close.x, row.close.y);
  await page.waitForFunction(() => Object.keys(window.__VISTE__?.dressUp?.outfit ?? {}).length === 0);
  const s = await settled(page);
  expect(s.layers).toEqual([]);
  await expect.poll(async () => (await state(page)).layerRows).toEqual([]);
});
// 'layers keep the slot order whatever the wearing order' moved to dragdrop.spec.ts: same assertions (domain order and panel)
// plus the real drawing order, with 2 real drags and the rest put on through the hook (it used 6 drags and took 100 s).
