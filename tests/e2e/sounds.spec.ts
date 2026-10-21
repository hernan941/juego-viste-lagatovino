import { expect, type Page } from '@playwright/test';
import { MEOW_KEYS, SfxKeys } from '../../src/game/constants';
import { bySlot, layerGrabAtRest, cats, clickButton, dragTo, equipItem, openScene, openTitle, outsidePoint, pickCat, settled, sharedTest as test, showItem, state, typeName, waitScene } from './helpers';

const sounds = (page: Page) => page.evaluate(() => window.__VISTE__?.sounds ?? []);
const MEOW = `random(${MEOW_KEYS.join(',')})`;

/** Sounds requested while `action` runs, waiting until the delayed ones listed in `expected` (like the purr) have been asked for. */
async function during(page: Page, action: () => Promise<unknown>, ...expected: string[]): Promise<string[]> {
  const before = (await sounds(page)).length;
  await action();
  await page.waitForFunction(
    ({ n, keys }) => {
      const now = (window.__VISTE__?.sounds ?? []).slice(n);
      return keys.every((k) => now.includes(k));
    },
    { n: before, keys: expected },
  );
  return (await sounds(page)).slice(before);
}

test.describe('sounds are connected to every action (art-direction section 9)', () => {
  test.setTimeout(120_000);

  test('fitting room: grab, drag, drop with purr, return, remove, tabs, cells and buttons', async ({ page }) => {
    await openScene(page, 'DressUp');
    const item = bySlot('sweater')[0];
    let s = await showItem(page, item);

    // Hover over a cell, then take it and drop it outside: grab, whisper while dragging, and the boing when it returns.
    const returned = await during(page, async () => {
      await page.mouse.move(s.cells[item.id].x, s.cells[item.id].y);
      await dragTo(page, s.cells[item.id], outsidePoint(s));
    }, SfxKeys.Return);
    expect(returned).toContain(SfxKeys.Hover);
    expect(returned).toContain(SfxKeys.Grab);
    expect(returned).toContain(SfxKeys.Drag);
    expect(returned).toContain(SfxKeys.Return);

    // Drop on the cat: pop and purr.
    s = await settled(page);
    const dropped = await during(page, () => dragTo(page, s.cells[item.id], { x: s.dropZone.center.x, y: s.dropZone.center.y + 40 }), SfxKeys.Purr);
    expect(dropped).toContain(SfxKeys.Drop);
    expect(dropped).toContain(SfxKeys.Purr);

    // Take it off with the X of the layers panel, then by dragging it off the cat.
    s = await settled(page);
    const withX = await during(page, async () => {
      await page.mouse.move(s.layerRows[0].close.x, s.layerRows[0].close.y);
      await page.mouse.click(s.layerRows[0].close.x, s.layerRows[0].close.y);
    }, SfxKeys.Remove);
    expect(withX).toContain(SfxKeys.Hover);
    expect(withX).toContain(SfxKeys.Remove);

    await equipItem(page, item);
    s = await settled(page);
    const dragged = await during(page, async () => dragTo(page, await layerGrabAtRest(page, item.id), outsidePoint(s)), SfxKeys.Remove);
    expect(dragged).toContain(SfxKeys.Remove);

    // Tabs: hover and click.
    s = await state(page);
    const other = Object.keys(s.tabs).find((t) => t !== s.activeTab)!;
    const tab = await during(page, async () => {
      await page.mouse.move(s.tabs[other].x, s.tabs[other].y);
      await page.mouse.click(s.tabs[other].x, s.tabs[other].y);
    }, SfxKeys.Click);
    expect(tab).toContain(SfxKeys.Hover);
    expect(tab).toContain(SfxKeys.Click);

    // Buttons: hover and click.
    const button = await during(page, () => clickButton(page, 'finish'), SfxKeys.Click);
    expect(button).toContain(SfxKeys.Hover);
    expect(button).toContain(SfxKeys.Click);
  });

  test('title, cat selection, typing and the shop door', async ({ page }) => {
    await openTitle(page);
    const start = await during(page, () => clickButton(page, 'start'), SfxKeys.Click, MEOW);
    expect(start).toContain(SfxKeys.Hover);
    expect(start).toContain(SfxKeys.Click);
    expect(start).toContain(MEOW);

    await waitScene(page, 'CatSelect');
    const picked = await during(page, () => pickCat(page, cats[2].id), MEOW);
    expect(picked).toContain(MEOW);

    const typed = await during(page, () => typeName(page, 'Mimi'));
    // 14 Backspaces over a name that is shorter than that, then 4 letters: only the keys that change the name sound.
    expect(typed.filter((k) => k === SfxKeys.Key).length).toBeGreaterThanOrEqual(4);

    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    await page.waitForFunction(() => (window.__VISTE__?.sounds ?? []).includes('sfx-doorbell'), undefined, { timeout: 30_000 });
  });

});
