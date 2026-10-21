import { expect, test as base, type Page } from '@playwright/test';
import clothesJson from '../../src/game/data/clothes.json' with { type: 'json' };
import type { ClothingDef } from '../../src/game/domain/types';

/** Visible (non secret) items of the catalog, read from clothes.json: no ids are hardcoded in the specs. */
export const clothes = (clothesJson as ClothingDef[]).filter((c) => !c.secret);
export const bySlot = (slot: string) => clothes.filter((c) => c.slot === slot);

// Every test fails on any console error or uncaught exception (ADR 0012).
export const test = base.extend<{ errors: string[] }>({
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

export type State = NonNullable<Window['__VISTE__']>['dressUp'];

export async function state(page: Page): Promise<NonNullable<State>> {
  const s = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.dressUp ?? null)));
  expect(s, 'DressUp scene is active').not.toBeNull();
  return s;
}

/** Waits until the scene is idle (entrance, tab and drop animations finished). */
export async function settled(page: Page): Promise<NonNullable<State>> {
  await page.waitForFunction(() => window.__VISTE__?.dressUp?.settled === true, undefined, { timeout: 40_000 });
  return state(page);
}

export async function openGame(page: Page): Promise<NonNullable<State>> {
  await page.goto('/');
  return settled(page);
}

export async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2 - 30, { steps: 6 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/** Opens the tab of the item (if needed) and returns the settled state where its cell is visible. */
export async function showItem(page: Page, item: ClothingDef): Promise<NonNullable<State>> {
  let s = await settled(page);
  if (s.activeTab !== item.category) {
    await page.mouse.click(s.tabs[item.category].x, s.tabs[item.category].y);
    await page.waitForFunction((id) => !!window.__VISTE__?.dressUp?.cells[id], item.id);
    s = await settled(page);
  }
  return scrollToItem(page, item);
}

/** Scrolls the grid with the mouse wheel until the cell of the item is completely visible. */
export async function scrollToItem(page: Page, item: ClothingDef): Promise<NonNullable<State>> {
  let s = await settled(page);
  for (let i = 0; i < 30 && !s.visibleCells.includes(item.id); i++) {
    await page.mouse.move(s.grid.center.x, s.grid.center.y);
    await page.mouse.wheel(0, s.cells[item.id].y > s.grid.center.y ? 120 : -120);
    s = await settled(page);
  }
  expect(s.visibleCells, `the cell of ${item.id} is reachable by scrolling`).toContain(item.id);
  return s;
}

/** Drags an item from its cell onto the middle of the cat and waits for it to be worn. */
export async function equipItem(page: Page, item: ClothingDef) {
  const s = await showItem(page, item);
  await dragTo(page, s.cells[item.id], { x: s.dropZone.center.x, y: s.dropZone.center.y + 40 });
  await page.waitForFunction(({ slot, id }) => window.__VISTE__?.dressUp?.outfit[slot] === id, { slot: item.slot, id: item.id });
  return settled(page);
}

export const outsidePoint = (s: NonNullable<State>) => ({ x: s.dropZone.x - 150, y: s.dropZone.y + s.dropZone.height - 80 });
