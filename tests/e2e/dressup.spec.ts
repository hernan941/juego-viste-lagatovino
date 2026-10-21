import { expect, test as base, type Page } from '@playwright/test';
import clothesJson from '../../src/game/data/clothes.json' with { type: 'json' };
import { slotZIndex } from '../../src/game/domain/slots';
import type { ClothingDef } from '../../src/game/domain/types';

const clothes = (clothesJson as ClothingDef[]).filter((c) => !c.secret);
const bySlot = (slot: string) => clothes.filter((c) => c.slot === slot);

// Every test fails on any console error or uncaught exception (ADR 0012).
const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

type State = NonNullable<Window['__VISTE__']>['dressUp'];

async function state(page: Page): Promise<NonNullable<State>> {
  const s = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.dressUp ?? null)));
  expect(s, 'DressUp scene is active').not.toBeNull();
  return s;
}

/** Waits until the scene is idle (entrance, tab and drop animations finished). */
async function settled(page: Page): Promise<NonNullable<State>> {
  await page.waitForFunction(() => window.__VISTE__?.dressUp?.settled === true, undefined, { timeout: 15_000 });
  return state(page);
}

async function openGame(page: Page): Promise<NonNullable<State>> {
  await page.goto('/');
  return settled(page);
}

async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2 - 30, { steps: 6 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/** Opens the tab of the item (if needed) and returns the settled state where its cell is visible. */
async function showItem(page: Page, item: ClothingDef): Promise<NonNullable<State>> {
  let s = await settled(page);
  if (!s.cells[item.id]) {
    await page.mouse.click(s.tabs[item.category].x, s.tabs[item.category].y);
    await page.waitForFunction((id) => !!window.__VISTE__?.dressUp?.cells[id], item.id);
    s = await settled(page);
  }
  return s;
}

/** Drags an item from its cell onto the middle of the cat and waits for it to be worn. */
async function equipItem(page: Page, item: ClothingDef) {
  const s = await showItem(page, item);
  await dragTo(page, s.cells[item.id], { x: s.dropZone.center.x, y: s.dropZone.center.y + 40 });
  await page.waitForFunction(({ slot, id }) => window.__VISTE__?.dressUp?.outfit[slot] === id, { slot: item.slot, id: item.id });
  return settled(page);
}

const outsidePoint = (s: NonNullable<State>) => ({ x: s.dropZone.x - 150, y: s.dropZone.y + s.dropZone.height - 80 });

test('the game starts in DressUp with the cats and an empty outfit', async ({ page }) => {
  const s = await openGame(page);
  expect(s.catIds.length).toBeGreaterThan(0);
  expect(s.catIds).toContain(s.catId);
  expect(s.outfit).toEqual({});
  expect(Object.keys(s.tabs).length).toBeGreaterThanOrEqual(2);
});

for (const item of clothes) {
  test(`dropping "${item.id}" on the cat wears it`, async ({ page }) => {
    await openGame(page);
    const s = await equipItem(page, item);
    expect(s.outfit).toEqual({ [item.slot]: item.id });
    expect(s.layers).toEqual([item.id]);
    await expect.poll(async () => (await state(page)).layerRows.map((r) => r.itemId)).toEqual([item.id]);
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
  await dragTo(page, worn.layerGrab[item.id], outsidePoint(worn));
  await page.waitForFunction(() => Object.keys(window.__VISTE__?.dressUp?.outfit ?? {}).length === 0);
  const s = await settled(page);
  expect(s.layers).toEqual([]);
  await expect.poll(async () => (await state(page)).layerRows).toEqual([]);
});

test('dropping a worn item back on the cat keeps it', async ({ page }) => {
  const item = clothes[0];
  await openGame(page);
  const worn = await equipItem(page, item);
  await dragTo(page, worn.layerGrab[item.id], { x: worn.dropZone.center.x, y: worn.dropZone.center.y });
  const s = await settled(page);
  expect(s.outfit).toEqual({ [item.slot]: item.id });
});

test('the cross of the layers panel takes the item off', async ({ page }) => {
  const item = clothes[0];
  await openGame(page);
  await equipItem(page, item);
  await expect.poll(async () => (await state(page)).layerRows.length).toBe(1);
  await page.waitForTimeout(400); // the row slides in
  const row = (await state(page)).layerRows[0];
  await page.mouse.move(row.close.x, row.close.y);
  await page.mouse.click(row.close.x, row.close.y);
  await page.waitForFunction(() => Object.keys(window.__VISTE__?.dressUp?.outfit ?? {}).length === 0);
  const s = await settled(page);
  expect(s.layers).toEqual([]);
  await expect.poll(async () => (await state(page)).layerRows).toEqual([]);
});

test('layers keep the slot order whatever the wearing order', async ({ page }) => {
  // One item per slot, worn from the front-most slot to the back-most one.
  const picks = [...new Set(clothes.map((c) => c.slot))].map((slot) => bySlot(slot)[0]);
  expect(picks.length).toBeGreaterThanOrEqual(2);
  const wearOrder = [...picks].sort((a, b) => slotZIndex(b.slot) - slotZIndex(a.slot));
  await openGame(page);
  for (const item of wearOrder) await equipItem(page, item);
  const s = await state(page);
  const expected = [...picks].sort((a, b) => slotZIndex(a.slot) - slotZIndex(b.slot)).map((c) => c.id);
  expect(s.layers).toEqual(expected);
  // The panel lists the front layer first.
  await expect.poll(async () => (await state(page)).layerRows.map((r) => r.itemId)).toEqual([...expected].reverse());
});
