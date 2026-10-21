import { expect, type Page } from '@playwright/test';
import { perfDrift, type PerfCounts } from '../../src/game/systems/perf';
import clothesJson from '../../src/game/data/clothes.json' with { type: 'json' };
import combosJson from '../../src/game/data/combos.json' with { type: 'json' };
import { comboOutfit } from '../../src/game/domain/combos';
import { SLOT_ORDER } from '../../src/game/domain/slots';
import type { ClothingDef, ComboDef } from '../../src/game/domain/types';
import { cats, clearCat, clickButton, clothes, dressWith, equipItem, openGame, pickCat, settled, showItem, startGame, test, waitScene } from './helpers';

const all = clothesJson as ClothingDef[];
const combos = combosJson as ComboDef[];

/** Documented tolerance (F9): tweens and display list may differ by this much between cycles (the idle animations start and end by themselves). */
const TOLERANCE = 5;
const CAT = cats[2];

const perf = (page: Page): Promise<PerfCounts & { fps: number }> => page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.perf)));

/** Lets the idle blink/breath timers settle before counting (a snapshot in the middle of a one-off animation is noise). */
async function snapshot(page: Page, label: string, log: Record<string, PerfCounts>): Promise<void> {
  await settled(page);
  log[label] = await perf(page);
}

function expectNoLeak(log: Record<string, PerfCounts>, a: string, b: string): void {
  console.log(`perf ${a}: ${JSON.stringify(log[a])}\nperf ${b}: ${JSON.stringify(log[b])}`);
  expect(perfDrift(log[a], log[b], TOLERANCE), `counts of ${b} against ${a}`).toEqual([]);
}

test.describe('no leaks after many scene cycles (F9)', () => {
  test.setTimeout(120_000);

  test('5 cycles DressUp -> Showcase -> DressUp keep the counts of tweens, timers, listeners and display list', async ({ page }) => {
    await page.goto('/?start=DressUp');
    const log: Record<string, PerfCounts> = {};
    await snapshot(page, 'cycle1', log);
    for (let cycle = 2; cycle <= 5; cycle++) {
      await clickButton(page, 'finish');
      await waitScene(page, 'Showcase');
      await clickButton(page, 'keep');
      await waitScene(page, 'DressUp');
      await snapshot(page, `cycle${cycle}`, log);
    }
    expectNoLeak(log, 'cycle2', 'cycle5');
  });

  test('5 laps CatSelect -> ShopEntrance (skipped) -> DressUp -> Showcase -> CatSelect keep the counts', async ({ page }) => {
    await startGame(page);
    const log: Record<string, PerfCounts> = {};
    for (let lap = 1; lap <= 5; lap++) {
      await pickCat(page, CAT.id);
      await clickButton(page, 'choose');
      await waitScene(page, 'ShopEntrance');
      await page.mouse.click(300, 300);
      await waitScene(page, 'DressUp', 30_000);
      await snapshot(page, `lap${lap}`, log);
      await clickButton(page, 'finish');
      await waitScene(page, 'Showcase');
      log[`show${lap}`] = await perf(page);
      await clickButton(page, 'change');
      await waitScene(page, 'CatSelect');
    }
    expectNoLeak(log, 'lap2', 'lap5');
    expectNoLeak(log, 'show2', 'show5');
  });

  test('FPS in headless (software WebGL) are only recorded, not demanded: dragging in DressUp and during the rainbow combo', async ({ page }) => {
    await openGame(page);
    const medianOf = (samples: number[]) => [...samples].sort((a, b) => a - b)[samples.length >> 1];
    const sample = (ms: number) => page.evaluate((span) => new Promise<number[]>((resolve) => {
      const out: number[] = [];
      const timer = window.setInterval(() => out.push(window.__VISTE__!.perf.fps), 250);
      window.setTimeout(() => { window.clearInterval(timer); resolve(out); }, span);
    }), ms);

    const item = clothes[0];
    const s = await showItem(page, item);
    const during = sample(5000);
    await page.mouse.move(s.cells[item.id].x, s.cells[item.id].y);
    await page.mouse.down();
    for (let i = 0; i < 12; i++) await page.mouse.move(s.dropZone.center.x + (i % 2) * 60, s.dropZone.center.y + 20 * (i % 3), { steps: 2 });
    const dragFps = await during;
    await page.mouse.up();
    console.log(`fps headless dragging in DressUp: median ${medianOf(dragFps).toFixed(1)} (${dragFps.length} samples)`);

    const combo = combos.find((c) => c.reaction === 'rainbow-arc')!;
    await clearCat(page);
    const worn = comboOutfit(combo, all)!;
    const ids = SLOT_ORDER.filter((slot) => worn[slot]).map((slot) => worn[slot]!);
    await dressWith(page, ids.slice(0, -1));
    const last = all.find((c) => c.id === ids[ids.length - 1])!;
    const rainbow = sample(4000);
    await equipItem(page, last);
    const rainbowFps = await rainbow;
    console.log(`fps headless during the rainbow combo: median ${medianOf(rainbowFps).toFixed(1)} (${rainbowFps.length} samples)`);
    expect([...dragFps, ...rainbowFps].every((v) => Number.isFinite(v))).toBe(true);
  });
});
