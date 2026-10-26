// F11.16 (ADR 0014 §8): the touch subset on an emulated phone held in landscape. Same hook, zero console errors.
import { expect, type Page } from '@playwright/test';
import { bySlot, cats, openScene, settled, showItem, test, ui, waitScene } from './helpers';
import { tap, touchDrag } from './helpers/touch';

const CAT = cats[2];

/** Taps the named button of the active scene. */
async function tapButton(page: Page, name: string) {
  const u = await ui(page);
  expect(u.buttons[name], `button ${name} in ${u.scene}`).toBeDefined();
  await tap(page, u.buttons[name]);
}

test.describe('the game on a phone in landscape', () => {
  test.setTimeout(120_000);

  test('@mobile boots into the Title with a coarse pointer and no portrait notice', async ({ page }) => {
    await page.goto('/');
    await waitScene(page, 'Title');
    expect(await page.evaluate(() => document.documentElement.classList.contains('rotate-hint'))).toBe(false);
    expect(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)).toBe(true);
  });

  test('@mobile picks a cat by tapping, types the name in the DOM input and walks into the shop', async ({ page }) => {
    await page.goto('/');
    await waitScene(page, 'Title');
    await tapButton(page, 'start');
    const select = await waitScene(page, 'CatSelect');
    await tap(page, select.points[CAT.id]);
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { chooseVisible?: boolean } | undefined)?.chooseVisible === true);
    // Tapping the name field opens the real <input>: the only way to raise a phone's keyboard.
    await tap(page, (await ui(page)).points.nameInput);
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { nameKeyboard?: boolean } | undefined)?.nameKeyboard === true);
    await page.keyboard.type('Misu');
    expect((await ui(page)).info.name).toBe('Misu');
    await tapButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    expect(await page.evaluate(() => window.__VISTE__?.session)).toMatchObject({ catId: CAT.id, catName: 'Misu' });
  });

  test('@mobile drags a sweater onto the cat with a finger and drags it off to take it out', async ({ page }) => {
    await openScene(page, 'DressUp', { cat: CAT.id, name: 'Misu' });
    await settled(page);
    const item = bySlot('sweater')[0];
    let s = await showItem(page, item);

    // Wear it: the item is held above the finger, so a finger a bit below the cat's middle still lands on it.
    const finger = await touchDrag(page, s.cells[item.id], { x: s.dropZone.center.x, y: s.dropZone.center.y + 60 }, { hold: true });
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.dragging === true);
    await finger.up();
    await page.waitForFunction((id) => window.__VISTE__?.dressUp?.outfit.sweater === id, item.id);
    s = await settled(page);
    expect(s.layers).toEqual([item.id]);

    // Take it off: drag the worn layer out of the drop zone.
    await touchDrag(page, s.layerGrab[item.id], { x: s.dropZone.x - 120, y: s.dropZone.y + s.dropZone.height - 60 });
    await page.waitForFunction(() => !window.__VISTE__?.dressUp?.outfit.sweater);
    expect((await settled(page)).layers).toEqual([]);
  });

  test('@mobile "¡Listo!" takes the look to the Showcase', async ({ page }) => {
    await openScene(page, 'DressUp', { cat: CAT.id, name: 'Misu' });
    await settled(page);
    const item = bySlot('sweater')[0];
    await page.evaluate((id) => window.__VISTE__?.wear([id]), item.id);
    await page.waitForFunction(() => window.__VISTE__?.dressUp?.layers.length === 1);
    await settled(page);
    await tapButton(page, 'finish');
    const show = await waitScene(page, 'Showcase');
    expect(show.info.layers).toEqual([item.id]);
  });
});

test.describe('the phone held in portrait', () => {
  test('@mobile shows the "Gira tu teléfono" notice and hides it again in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.classList.contains('rotate-hint'));
    await expect(page.locator('#rotate-hint')).toBeVisible();
    await expect(page.locator('.rotate-title')).toHaveText('Gira tu teléfono');
    await page.setViewportSize({ width: 915, height: 412 });
    await page.waitForFunction(() => !document.documentElement.classList.contains('rotate-hint'));
    await expect(page.locator('#rotate-hint')).toBeHidden();
  });
});
