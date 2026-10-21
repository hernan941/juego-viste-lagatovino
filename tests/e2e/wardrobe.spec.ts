import { expect, type Page } from '@playwright/test';
import clothesJson from '../../src/game/data/clothes.json' with { type: 'json' };
import type { ClothingDef } from '../../src/game/domain/types';
import { bySlot, clothes, dragTo, equipItem, openGame, scrollToItem, settled, showItem, state, test } from './helpers';

const secrets = (clothesJson as ClothingDef[]).filter((c) => c.secret);
const categories = [...new Set(clothes.map((c) => c.category))];
const longest = categories.reduce((a, b) => (bySlot(b).length > bySlot(a).length ? b : a));

async function openTab(page: Page, category: string) {
  const s = await settled(page);
  if (s.activeTab !== category) {
    await page.mouse.click(s.tabs[category].x, s.tabs[category].y);
    await page.waitForFunction((c) => window.__VISTE__?.dressUp?.activeTab === c, category);
  }
  return settled(page);
}

test('the game has one tab per category of clothes.json', async ({ page }) => {
  const s = await openGame(page);
  expect(Object.keys(s.tabs).sort()).toEqual([...categories].sort());
  expect(categories.length).toBeGreaterThanOrEqual(6);
});

for (const category of categories) {
  test(`the "${category}" tab opens and lists exactly its visible items`, async ({ page }) => {
    await openGame(page);
    const s = await openTab(page, category);
    expect(s.activeTab).toBe(category);
    expect(Object.keys(s.cells).sort()).toEqual(bySlot(category).map((c) => c.id).sort());
    for (const secret of secrets) expect(s.cells[secret.id], `${secret.id} is secret`).toBeUndefined();
    expect(s.visibleCells.length).toBeGreaterThan(0);
  });

  test(`the last item of "${category}" is reachable by scrolling and can be worn`, async ({ page }) => {
    await openGame(page);
    const last = bySlot(category).at(-1)!;
    const s = await equipItem(page, last);
    expect(s.outfit).toEqual({ [last.slot]: last.id });
  });
}

test('no secret item shows up in any tab', async ({ page }) => {
  expect(secrets).toHaveLength(6);
  await openGame(page);
  for (const category of categories) {
    const s = await openTab(page, category);
    for (const secret of secrets) expect(Object.keys(s.cells)).not.toContain(secret.id);
  }
});

test('one item per category can be worn at once and the layers panel lists all of them', async ({ page }) => {
  test.setTimeout(180_000); // six worn layers on software WebGL render slowly
  await openGame(page);
  let s = await settled(page);
  for (const category of categories) s = await equipItem(page, bySlot(category)[0]);
  expect(Object.keys(s.outfit).sort()).toEqual([...categories].sort());
  await expect.poll(async () => (await state(page)).layerRows.length).toBe(categories.length);
});

test('the longest category needs scrolling, and the wheel stops at both ends', async ({ page }) => {
  await openGame(page);
  const s = await openTab(page, longest);
  expect(s.grid.maxScroll).toBeGreaterThan(0);
  expect(s.grid.scroll).toBe(0);
  const last = bySlot(longest).at(-1)!;
  expect(s.visibleCells).not.toContain(last.id);
  await page.mouse.move(s.grid.center.x, s.grid.center.y);
  await page.mouse.wheel(0, 100_000);
  const end = await settled(page);
  expect(end.grid.scroll).toBeCloseTo(end.grid.maxScroll, 0);
  expect(end.visibleCells).toContain(last.id);
  await page.mouse.wheel(0, -100_000);
  const start = await settled(page);
  expect(start.grid.scroll).toBe(0);
});

test('the wheel over the rest of the screen does not scroll the grid', async ({ page }) => {
  await openGame(page);
  const s = await openTab(page, longest);
  await page.mouse.move(s.dropZone.center.x, s.dropZone.center.y);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  expect((await state(page)).grid.scroll).toBe(0);
});

test('switching tab goes back to the top of the grid', async ({ page }) => {
  await openGame(page);
  const s = await openTab(page, longest);
  await page.mouse.move(s.grid.center.x, s.grid.center.y);
  await page.mouse.wheel(0, 250);
  expect((await settled(page)).grid.scroll).toBeGreaterThan(0);
  const other = categories.find((c) => c !== longest)!;
  expect((await openTab(page, other)).grid.scroll).toBe(0);
});

test('dragging vertically in an empty zone of the grid scrolls it', async ({ page }) => {
  await openGame(page);
  const s = await openTab(page, longest);
  const ids = Object.keys(s.cells);
  // The gap between the first two columns of the first row.
  const gap = { x: (s.cells[ids[0]].x + s.cells[ids[1]].x) / 2, y: s.cells[ids[0]].y };
  await page.mouse.move(gap.x, gap.y);
  await page.mouse.down();
  await page.mouse.move(gap.x, gap.y - 60, { steps: 8 });
  await page.mouse.move(gap.x, gap.y - 120, { steps: 8 });
  await page.mouse.up();
  const after = await settled(page);
  expect(after.grid.scroll).toBeGreaterThan(60);
  expect(after.outfit).toEqual({});
});

test('dragging vertically from a cell scrolls the grid instead of lifting the item', async ({ page }) => {
  await openGame(page);
  const s = await openTab(page, longest);
  const first = bySlot(longest)[0];
  const c = s.cells[first.id];
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x, c.y - 50, { steps: 8 });
  expect((await state(page)).dragging).toBe(false);
  await page.mouse.move(c.x, c.y - 100, { steps: 8 });
  await page.mouse.up();
  const after = await settled(page);
  expect(after.grid.scroll).toBeGreaterThan(50);
  expect(after.outfit).toEqual({});
  expect(after.layers).toEqual([]);
});

test('dragging sideways from a cell still lifts the item, even in a scrolled grid', async ({ page }) => {
  await openGame(page);
  const item = bySlot(longest).at(-1)!;
  await showItem(page, item);
  const s = await scrollToItem(page, item);
  expect(s.grid.scroll).toBeGreaterThan(0);
  const c = s.cells[item.id];
  await dragTo(page, c, { x: s.dropZone.center.x, y: s.dropZone.center.y + 40 });
  await page.waitForFunction((id) => Object.values(window.__VISTE__?.dressUp?.outfit ?? {}).includes(id), item.id);
});

test('a click on a cell without dragging wears nothing and the cell settles again', async ({ page }) => {
  await openGame(page);
  const s = await settled(page);
  const c = s.cells[Object.keys(s.cells)[0]];
  await page.mouse.click(c.x, c.y);
  const after = await settled(page);
  expect(after.outfit).toEqual({});
  expect(after.dragging).toBe(false);
});

test('hovering the cells while the grid pops in does not leave them half transparent', async ({ page }) => {
  const s0 = await openGame(page);
  const other = Object.keys(s0.tabs)[1];
  await page.mouse.click(s0.tabs[other].x, s0.tabs[other].y);
  // Right away, sweep the mouse over every cell that is still popping in.
  const s = await state(page);
  for (const p of Object.values(s.cells)) await page.mouse.move(p.x, p.y);
  const done = await settled(page);
  expect(Object.keys(done.cells).length).toBeGreaterThan(0);
});
