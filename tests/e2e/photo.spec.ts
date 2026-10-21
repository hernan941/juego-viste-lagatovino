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
