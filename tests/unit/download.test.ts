import { describe, expect, it, vi } from 'vitest';
import { dataUrlToFile, downloadDataUrl, savePhoto, type DownloadDocument } from '../../src/game/systems/download';

function fakeDoc() {
  const link = { href: '', download: '', style: { display: '' }, click: vi.fn(), remove: vi.fn() };
  const doc: DownloadDocument = { createElement: () => link, body: { append: vi.fn() } };
  return { doc, link };
}

describe('downloadDataUrl', () => {
  it('clicks a temporary link with the file name and removes it', () => {
    const { doc, link } = fakeDoc();
    downloadDataUrl(doc, 'data:image/png;base64,AAAA', 'viste-lagato-luna.png');
    expect(link.href).toBe('data:image/png;base64,AAAA');
    expect(link.download).toBe('viste-lagato-luna.png');
    expect(doc.body.append).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
  });
});

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('dataUrlToFile', () => {
  it('turns the picture into a PNG file with the given name', async () => {
    const file = dataUrlToFile(PNG, 'viste-lagato-luna.png');
    expect(file.name).toBe('viste-lagato-luna.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBe(8);
  });
});

describe('savePhoto', () => {
  it('on a phone that can share files, opens the share sheet (its "save image" is the reliable way on iOS)', async () => {
    const { doc, link } = fakeDoc();
    const nav = { canShare: vi.fn(() => true), share: vi.fn(async () => undefined) };
    expect(await savePhoto({ doc, nav, touch: true }, PNG, 'a.png')).toBe('shared');
    expect(nav.share).toHaveBeenCalledOnce();
    expect(link.click).not.toHaveBeenCalled();
  });

  it('closing the share sheet is not an error and does not download behind the player\'s back', async () => {
    const { doc, link } = fakeDoc();
    const nav = { canShare: () => true, share: vi.fn(async () => { throw new DOMException('closed', 'AbortError'); }) };
    expect(await savePhoto({ doc, nav, touch: true }, PNG, 'a.png')).toBe('shared');
    expect(link.click).not.toHaveBeenCalled();
  });

  it('falls back to the download link when sharing fails for another reason', async () => {
    const { doc, link } = fakeDoc();
    const nav = { canShare: () => true, share: vi.fn(async () => { throw new DOMException('no gesture', 'NotAllowedError'); }) };
    expect(await savePhoto({ doc, nav, touch: true }, PNG, 'a.png')).toBe('downloaded');
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('downloads on a computer, even if the browser can share', async () => {
    const { doc, link } = fakeDoc();
    const nav = { canShare: vi.fn(() => true), share: vi.fn() };
    expect(await savePhoto({ doc, nav, touch: false }, PNG, 'a.png')).toBe('downloaded');
    expect(nav.share).not.toHaveBeenCalled();
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('downloads when the browser has no share for files', async () => {
    const { doc, link } = fakeDoc();
    expect(await savePhoto({ doc, nav: {}, touch: true }, PNG, 'a.png')).toBe('downloaded');
    expect(await savePhoto({ doc, nav: { canShare: () => false, share: vi.fn() }, touch: true }, PNG, 'a.png')).toBe('downloaded');
    expect(link.click).toHaveBeenCalledTimes(2);
  });
});
