import { expect, type Page } from '@playwright/test';
import { bySlot, cats, clickButton, equipItem, openScene, settled, sharedTest as test, ui, waitScene } from './helpers';

const CAT = cats[1];

/** Keeps the links that the game clicks to download (the data URL and the file name), since the link is removed right away. */
async function recordDownloads(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __downloads?: unknown };
    if (w.__downloads) return; // already recording in this page
    const seen: { href: string; download: string }[] = [];
    (window as unknown as { __downloads: typeof seen }).__downloads = seen;
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) seen.push({ href: this.href, download: this.download });
      return click.call(this);
    };
  });
}

/** Decodes the last downloaded picture in the page: size, bytes and how many different colors it has. */
async function inspectLastDownload(page: Page) {
  return page.evaluate(async () => {
    const seen = (window as unknown as { __downloads: { href: string; download: string }[] }).__downloads;
    const last = seen[seen.length - 1];
    const img = new Image();
    img.src = last.href;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const colors = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 97) colors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return { type: last.href.slice(0, 22), bytes: last.href.length, width: img.width, height: img.height, colors: colors.size, count: seen.length };
  });
}

test.describe('"Descargar foto" in the Showcase', () => {
  test.setTimeout(120_000);

  test('downloads a named PNG of the dressed cat, with shutter, flash and a confirmation', async ({ page }, testInfo) => {
    await openScene(page, 'DressUp', { cat: CAT.id, name: 'Doña Bigotes' });
    await settled(page);
    await recordDownloads(page);
    await equipItem(page, bySlot('sweater')[0]);
    await equipItem(page, bySlot('head')[0]);
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    await page.screenshot({ path: testInfo.outputPath('showcase.png') });

    const download = page.waitForEvent('download');
    await clickButton(page, 'photo');
    await page.waitForFunction(() => window.__VISTE__?.sounds.includes('sfx-shutter'));
    const file = await download;
    expect(file.suggestedFilename()).toBe('viste-lagato-dona-bigotes.png');
    await file.saveAs(testInfo.outputPath(file.suggestedFilename()));

    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { photos?: number } | undefined)?.photos === 1);
    expect((await ui(page)).info).toMatchObject({ lastPhoto: 'viste-lagato-dona-bigotes.png', photoBusy: false });
    const png = await inspectLastDownload(page);
    expect(png).toMatchObject({ type: 'data:image/png;base64,', width: 1080, height: 1350 });
    expect(png.bytes).toBeGreaterThan(20_000);
    await page.screenshot({ path: testInfo.outputPath('showcase-after.png') });
  });

  test('the photo is not blank: it has many different colors', async ({ page }) => {
    await openScene(page, 'Showcase', { cat: CAT.id, name: 'Mimi' });
    await waitScene(page, 'Showcase');
    await recordDownloads(page);
    const download = page.waitForEvent('download');
    await clickButton(page, 'photo');
    expect((await download).suggestedFilename()).toBe('viste-lagato-mimi.png');
    expect((await inspectLastDownload(page)).colors).toBeGreaterThan(40);
  });

  test('the photo shows the love eyes that the player sees, even when the pose was the happy one at the click', async ({ page }) => {
    await openScene(page, 'Showcase', { cat: CAT.id, name: 'Mimi' });
    await waitScene(page, 'Showcase');
    await recordDownloads(page);
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { pose?: string } | undefined)?.pose === 'feliz');
    const download = page.waitForEvent('download');
    await clickButton(page, 'photo');
    await download;
    // The heart eyes are #E2578B; the happy eyes are dark arcs. Count the heart pixels around the left eye of the picture.
    const hearts = await page.evaluate(async () => {
      const seen = (window as unknown as { __downloads: { href: string }[] }).__downloads;
      const img = new Image();
      img.src = seen[seen.length - 1].href;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      // Left eye at canvas (192, 218); the photo draws the 512 canvas at 860 px with the feet at y = 1073.
      const k = 860 / 512;
      const x = 540 + (192 - 256) * k;
      const y = 1073 + (218 - 490) * k;
      const d = ctx.getImageData(Math.round(x - 40), Math.round(y - 40), 80, 80).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (Math.hypot(d[i] - 226, d[i + 1] - 87, d[i + 2] - 139) < 30) n++;
      return n;
    });
    expect(hearts, 'pixels of the heart eye in the picture').toBeGreaterThan(300);
    // The thumbnail of the photo showed itself and has been cleaned up.
    await page.waitForFunction(() => (window.__VISTE__?.ui?.info as { reveals?: number } | undefined)?.reveals === 1);
    await page.waitForFunction(() => {
      const i = window.__VISTE__?.ui?.info as { revealing?: boolean; revealTextures?: number } | undefined;
      return i?.revealing === false && i.revealTextures === 0;
    }, undefined, { timeout: 15_000 });
  });

  test('"¡Foto lista!" appears when the thumbnail has landed, not before', async ({ page }) => {
    await openScene(page, 'DressUp', { cat: CAT.id, name: 'Doña Bigotes' });
    await settled(page);
    await equipItem(page, bySlot('sweater')[0]);
    await clickButton(page, 'finish');
    await waitScene(page, 'Showcase');
    // The page watches every frame and notes whether the thumbnail had landed on the frame where the bubble showed up.
    const watching = page.evaluate(() => new Promise<{ settled: boolean; revealing: boolean }>((resolve) => {
      const tick = () => {
        const i = window.__VISTE__?.ui?.info as { toasts?: string[]; revealSettled?: boolean; revealing?: boolean } | undefined;
        if (i?.toasts?.includes('¡Foto lista!')) return resolve({ settled: i.revealSettled === true, revealing: i.revealing === true });
        requestAnimationFrame(tick);
      };
      tick();
    }));
    await clickButton(page, 'photo');
    expect(await watching).toEqual({ settled: true, revealing: true });
  });

  test('a double click downloads one photo', async ({ page }) => {
    await openScene(page, 'Showcase', { cat: CAT.id, name: 'Mimi' });
    await waitScene(page, 'Showcase');
    const downloads: string[] = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));
    const { x, y } = (await ui(page)).buttons.photo;
    await page.mouse.move(x, y);
    await page.mouse.dblclick(x, y);
    // The whole capture is over (counted, confirmed and unlocked again) when the second click would have had its chance.
    await page.waitForFunction(() => {
      const i = window.__VISTE__?.ui?.info as { photos?: number; photoBusy?: boolean } | undefined;
      return i?.photos === 1 && i.photoBusy === false;
    });
    // The download event travels to the test a moment after the page is done.
    await expect.poll(() => downloads).toEqual(['viste-lagato-mimi.png']);
  });
});
