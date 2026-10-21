import { describe, expect, it, vi } from 'vitest';
import { downloadDataUrl, type DownloadDocument } from '../../src/game/systems/download';

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
