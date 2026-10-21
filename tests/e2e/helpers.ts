import { expect, test as base, type Page } from '@playwright/test';
import catsJson from '../../src/game/data/cats.json' with { type: 'json' };
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
  await page.goto('/?start=DressUp');
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

/** Cats of the catalog, read from cats.json (no ids hardcoded in the specs). */
export const cats = catsJson as { id: string; name: string }[];

export interface Ui {
  scene: string;
  ready: boolean;
  buttons: Record<string, { x: number; y: number }>;
  points: Record<string, { x: number; y: number }>;
  info: Record<string, unknown>;
}

export async function ui(page: Page): Promise<Ui> {
  const u = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.ui ?? null)));
  expect(u, 'the scene reports its UI').not.toBeNull();
  return u;
}

/** Waits until `scene` is the active one and its entrance is over. */
export async function waitScene(page: Page, scene: string, timeout = 40_000): Promise<Ui> {
  await page.waitForFunction((n) => window.__VISTE__?.scene === n && window.__VISTE__?.ui?.ready === true, scene, { timeout });
  return ui(page);
}

export async function clickButton(page: Page, name: string): Promise<void> {
  const u = await ui(page);
  expect(u.buttons[name], `button ${name} in ${u.scene}`).toBeDefined();
  await page.mouse.move(u.buttons[name].x, u.buttons[name].y);
  await page.mouse.click(u.buttons[name].x, u.buttons[name].y);
}

/** Title -> CatSelect: presses "Iniciar". */
export async function startGame(page: Page): Promise<Ui> {
  await page.goto('/');
  await waitScene(page, 'Title');
  await clickButton(page, 'start');
  return waitScene(page, 'CatSelect');
}

/** Picks a cat in CatSelect and waits for the name field. */
export async function pickCat(page: Page, id: string): Promise<Ui> {
  const u = await ui(page);
  await page.mouse.click(u.points[id].x, u.points[id].y);
  await page.waitForFunction((cat) => (window.__VISTE__?.ui?.info as { selected?: string } | undefined)?.selected === cat, id);
  await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { chooseVisible?: boolean } | undefined)?.chooseVisible === true);
  return ui(page);
}

/** Replaces the name of the cat with `name` by typing. */
export async function typeName(page: Page, name: string): Promise<void> {
  for (let i = 0; i < 14; i++) await page.keyboard.press('Backspace');
  await page.keyboard.type(name);
}
