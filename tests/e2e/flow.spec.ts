import { expect } from '@playwright/test';
import {
  bySlot, cats, clickButton, equipItem, openScene, pickCat, settled, sharedTest as test, startGame, test as fresh, typeName, ui, waitScene,
} from './helpers';

/** The N-th cat of cats.json (not the first, so the test shows that the pick travels). */
const CAT = cats[3];
const NAME = 'Bigotes';

/** CatSelect -> ShopEntrance with the cat and the name chosen. */
async function chooseCat(page: import('@playwright/test').Page) {
  await startGame(page);
  await pickCat(page, CAT.id);
  await typeName(page, NAME);
  expect((await ui(page)).info.name).toBe(NAME);
  await clickButton(page, 'choose');
  await waitScene(page, 'ShopEntrance');
}

test.describe('the complete flow (ADR 0007)', () => {
  test.setTimeout(120_000);

  test('smoke of the whole game: Title, CatSelect, name, the shop walk, dress by dragging, admire, download the PNG, keep dressing and change cat', async ({ page }) => {
    await chooseCat(page);
    expect(await page.evaluate(() => window.__VISTE__?.session)).toMatchObject({ catId: CAT.id, catName: NAME });

    // The cat walks to the door, the bell rings, the door opens and the camera dives in: nobody clicks.
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { phase?: string } | undefined)?.phase === 'bell', undefined, { timeout: 30_000 });
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { phase?: string } | undefined)?.phase === 'zoom', undefined, { timeout: 30_000 });
    expect((await ui(page)).info.skipped).toBe(false);

    await settled(page);
    const dress = await page.evaluate(() => JSON.parse(JSON.stringify(window.__VISTE__?.dressUp)));
    expect(dress.catId).toBe(CAT.id);
    expect(dress.catName).toBe(NAME);

    // Wear a sweater by dragging it.
    const sweater = bySlot('sweater')[0];
    const worn = await equipItem(page, sweater);
    expect(worn.layers).toEqual([sweater.id]);

    // "¡Listo!" -> Showcase with the name and the outfit.
    await clickButton(page, 'finish');
    const show = await waitScene(page, 'Showcase');
    expect(show.info.title).toBe(`¡Qué lindo look, ${NAME}!`);
    expect(show.info.layers).toEqual([sweater.id]);

    // "Descargar foto": a PNG named after the cat is downloaded.
    const download = page.waitForEvent('download');
    await clickButton(page, 'photo');
    const file = await download;
    expect(file.suggestedFilename()).toBe(`viste-lagato-${NAME.toLowerCase()}.png`);
    expect(file.suggestedFilename()).toMatch(/\.png$/);

    // "Seguir vistiendo" keeps the outfit.
    await clickButton(page, 'keep');
    await waitScene(page, 'DressUp');
    const again = await settled(page);
    expect(again.layers).toEqual([sweater.id]);
    expect(again.catName).toBe(NAME);

    // Back to the Showcase and "Cambiar de gato": CatSelect with the same cat and name preselected.
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    await clickButton(page, 'change');
    const select = await waitScene(page, 'CatSelect');
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { selected?: string } | undefined)?.selected !== null);
    expect((await ui(page)).info.selected).toBe(CAT.id);
    expect(select.points[CAT.id]).toBeDefined();
  });

  test('a click skips the entrance animation and goes straight to the fitting room', async ({ page }) => {
    await chooseCat(page);
    const before = await ui(page);
    expect(['walk', 'bell']).toContain(before.info.phase);
    await page.mouse.click(300, 300);
    await waitScene(page, 'DressUp', 20_000);
    const dress = await settled(page);
    expect(dress.catId).toBe(CAT.id);
    expect(dress.catName).toBe(NAME);
  });

  test('the cat that was worn does not follow to another cat: changing cat starts naked', async ({ page }) => {
    await openScene(page, 'DressUp');
    const sweater = bySlot('sweater')[0];
    await settled(page);
    await equipItem(page, sweater);
    await clickButton(page, 'change');
    await waitScene(page, 'CatSelect');
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { selected?: string } | undefined)?.selected !== null);
    const other = cats[5];
    await pickCat(page, other.id);
    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    await page.mouse.click(300, 300);
    await waitScene(page, 'DressUp', 20_000);
    expect((await settled(page)).layers).toEqual([]);
  });
});

test.describe('the name of the cat', () => {
  test.setTimeout(90_000);

  test('is limited to 12 characters, trimmed, and cannot be empty', async ({ page }) => {
    await startGame(page);
    await pickCat(page, CAT.id);
    // The default is the name of the cat.
    expect((await ui(page)).info.name).toBe(CAT.name);

    await typeName(page, 'abcdefghijklmnop');
    expect((await ui(page)).info.name).toBe('abcdefghijkl');

    await typeName(page, '');
    await clickButton(page, 'choose');
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { warning?: boolean } | undefined)?.warning === true);
    expect((await ui(page)).scene).toBe('CatSelect');

    await page.keyboard.type('  Mimi  ');
    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    expect((await page.evaluate(() => window.__VISTE__?.session))?.catName).toBe('Mimi');
  });

  test('typing over the default name replaces it, and accepting without typing keeps it', async ({ page }) => {
    await startGame(page);
    await pickCat(page, CAT.id);
    expect((await ui(page)).info).toMatchObject({ name: CAT.name, nameIsDefault: true });
    await page.keyboard.type('Bigote');
    expect((await ui(page)).info).toMatchObject({ name: 'Bigote', nameIsDefault: false });
    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    expect((await page.evaluate(() => window.__VISTE__?.session))?.catName).toBe('Bigote');
  });

  test('Backspace clears the whole default name at once', async ({ page }) => {
    await startGame(page);
    await pickCat(page, CAT.id);
    await page.keyboard.press('Backspace');
    expect((await ui(page)).info.name).toBe('');
  });

  test('without typing anything, "¡Este!" accepts the default name', async ({ page }) => {
    await startGame(page);
    await pickCat(page, CAT.id);
    await clickButton(page, 'choose');
    await waitScene(page, 'ShopEntrance');
    expect((await page.evaluate(() => window.__VISTE__?.session))?.catName).toBe(CAT.name);
  });

  test('keeps the name that the player typed when picking another cat, and follows the default otherwise', async ({ page }) => {
    await startGame(page);
    await pickCat(page, cats[0].id);
    expect((await ui(page)).info.name).toBe(cats[0].name);
    await pickCat(page, cats[1].id);
    expect((await ui(page)).info.name).toBe(cats[1].name);
    await typeName(page, 'Mimi');
    await pickCat(page, cats[2].id);
    expect((await ui(page)).info.name).toBe('Mimi');
  });
});

fresh.describe('mute button', () => {
  fresh.setTimeout(120_000);

  fresh('toggles the sound from the Title, the fitting room and the Showcase, and persists', async ({ page }) => {
    await page.goto('/');
    await waitScene(page, 'Title');
    expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(false);
    await clickButton(page, 'mute');
    await page.waitForFunction(() => window.__VISTE__?.muted === true);
    await page.reload();
    await waitScene(page, 'Title');
    expect(await page.evaluate(() => window.__VISTE__?.muted)).toBe(true);
    await clickButton(page, 'mute');
    await page.waitForFunction(() => window.__VISTE__?.muted === false);

    await openScene(page, 'DressUp');
    await waitScene(page, 'DressUp');
    await clickButton(page, 'mute');
    await page.waitForFunction(() => window.__VISTE__?.muted === true);
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    await clickButton(page, 'mute');
    await page.waitForFunction(() => window.__VISTE__?.muted === false);
  });
});

test('dragging still works after coming back from the Showcase', async ({ page }) => {
  test.setTimeout(120_000);
  await openScene(page, 'Showcase');
  await waitScene(page, 'Showcase');
  await clickButton(page, 'keep');
  await waitScene(page, 'DressUp');
  const item = bySlot('head')[0];
  const s = await equipItem(page, item);
  expect(s.layers).toEqual([item.id]);
});
