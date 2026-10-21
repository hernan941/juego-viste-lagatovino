import { expect, test as base, type BrowserContext, type Page } from '@playwright/test';
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

// F9: the boot (131 SVGs on software WebGL) is the slowest part of a test, so the specs that only need a clean fitting room
// share ONE page per worker and start each test with `__VISTE__.jump('DressUp', cat, name)` instead of reloading.
// The specs about reloads, storage, the flow and sounds keep using the plain `test` (a new page every time).
let shared: { context: BrowserContext; page: Page } | null = null;
export const sharedTest = test.extend({
  page: async ({ browser, baseURL, viewport }, use) => {
    if (!shared || shared.page.isClosed()) {
      const context = await browser.newContext({ baseURL, viewport });
      shared = { context, page: await context.newPage() };
    } else await shared.page.evaluate(() => { window.__VISTE__?.park(false); window.__VISTE__?.reset(); }).catch(() => undefined); // awake, and a first visit again
    await use(shared.page);
    // Parked while the worker tests another page: a page that keeps rendering (software WebGL) slows every other test down.
    await shared.page.evaluate(() => window.__VISTE__?.park(true)).catch(() => undefined);
    // The page is kept for the next test of this worker (a failed test makes Playwright start a new worker, and a new page).
  },
});

export type State = NonNullable<Window['__VISTE__']>['dressUp'];

export async function state(page: Page): Promise<NonNullable<State>> {
  const s = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.dressUp ?? null)));
  expect(s, 'DressUp scene is active').not.toBeNull();
  return s;
}

/** Waits until the scene is idle (entrance, tab and drop animations finished). */
export async function settled(page: Page): Promise<NonNullable<State>> {
  await page.waitForFunction(() => window.__VISTE__?.dressUp?.settled === true, undefined, { timeout: 100_000 });
  return state(page);
}

/**
 * Opens `scene` with a naked cat. In a page that is already running the game (the shared page) it jumps there without
 * reloading; otherwise it loads the test shortcut `?start=`.
 */
export async function openScene(page: Page, scene: string, opts: { cat?: string; name?: string } = {}): Promise<void> {
  const running = await page.evaluate(() => !!window.__VISTE__).catch(() => false);
  if (running) {
    await page.evaluate(([sc, cat, name]) => window.__VISTE__?.jump(sc, cat, name), [scene, opts.cat, opts.name] as const);
  } else {
    const q = new URLSearchParams({ start: scene, ...(opts.cat ? { cat: opts.cat } : {}), ...(opts.name ? { name: opts.name } : {}) });
    await page.goto(`/?${q}`);
  }
}

/** The fitting room with a naked cat. */
export async function openGame(page: Page, opts: { cat?: string; name?: string } = {}): Promise<NonNullable<State>> {
  await openScene(page, 'DressUp', opts);
  return settled(page);
}

/**
 * Presses at `from`, moves to `to` and lets go. Every mouse move costs a frame of the software renderer while something is
 * dragged, so an item drag uses the fewest moves that Phaser needs. `smooth` is for the bow of the gift box, which wants a
 * pull made of many small moves.
 */
export async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, { smooth = false } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2 - 30, smooth ? { steps: 6 } : undefined);
  await page.mouse.move(to.x, to.y, { steps: smooth ? 10 : 2 });
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
    // One wheel as long as the distance to the middle of the grid (the first try overshoots a little, the loop corrects it).
    const away = s.cells[item.id].y - s.grid.center.y;
    await page.mouse.wheel(0, Math.sign(away) * Math.min(Math.max(Math.abs(away), 60), 400));
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

/**
 * Puts exactly these items on the cat through the test hook (no drag) and waits until the scene is idle.
 * Rule of the suite: the mouse drags only what the test checks; everything else is prepared with this.
 */
export async function dressWith(page: Page, ids: string[]): Promise<NonNullable<State>> {
  await page.evaluate((list) => window.__VISTE__?.wear(list), ids);
  await page.waitForFunction((n) => window.__VISTE__?.dressUp?.layers.length === n, ids.length);
  return settled(page);
}

/** Takes everything off the cat through the hook. */
export const clearCat = (page: Page) => dressWith(page, []);

/** Waits until the rows of the layers panel have finished sliding (their ✕ stops moving between two frames). */
export async function rowsAtRest(page: Page): Promise<NonNullable<State>['layerRows']> {
  await page.waitForFunction(() => {
    const w = window as unknown as { __rows?: string };
    const now = JSON.stringify(window.__VISTE__?.dressUp?.layerRows ?? []);
    const same = w.__rows === now;
    w.__rows = now;
    return same;
  }, undefined, { polling: 50 });
  return (await state(page)).layerRows;
}

/**
 * Where to grab a worn item once the cat has stopped moving. The cat leans toward the mouse, so the layer moves a few px while
 * the pointer travels to it: the mouse goes to the layer first (as a hand would) and the point is read when it holds still.
 */
export async function layerGrabAtRest(page: Page, id: string): Promise<{ x: number; y: number }> {
  const first = (await settled(page)).layerGrab[id];
  await page.mouse.move(first.x, first.y);
  await page.waitForFunction((layer) => {
    const w = window as unknown as { __grab?: { at: string; n: number } };
    const at = JSON.stringify(window.__VISTE__?.dressUp?.layerGrab[layer] ?? null);
    w.__grab = w.__grab && w.__grab.at === at ? { at, n: w.__grab.n + 1 } : { at, n: 0 };
    return w.__grab.n >= 4;
  }, id, { polling: 60 });
  return (await settled(page)).layerGrab[id];
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
export async function waitScene(page: Page, scene: string, timeout = 100_000): Promise<Ui> {
  await page.waitForFunction((n) => window.__VISTE__?.scene === n && window.__VISTE__?.ui?.ready === true, scene, { timeout });
  return ui(page);
}

export async function clickButton(page: Page, name: string): Promise<void> {
  const u = await ui(page);
  expect(u.buttons[name], `button ${name} in ${u.scene}`).toBeDefined();
  await page.mouse.move(u.buttons[name].x, u.buttons[name].y);
  await page.mouse.click(u.buttons[name].x, u.buttons[name].y);
}

/** The Title of a new visit (in a running page the game jumps there instead of reloading). */
export async function openTitle(page: Page): Promise<Ui> {
  const running = await page.evaluate(() => !!window.__VISTE__).catch(() => false);
  if (running) await page.evaluate(() => window.__VISTE__?.jump('Title'));
  else await page.goto('/');
  return waitScene(page, 'Title');
}

/** Title -> CatSelect: presses "Iniciar". */
export async function startGame(page: Page): Promise<Ui> {
  await openTitle(page);
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
