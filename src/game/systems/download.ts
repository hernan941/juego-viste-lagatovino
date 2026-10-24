// Saves a picture the browser way: a temporary <a download> that is clicked. Takes the document so tests can fake it.
export interface DownloadLink {
  href: string;
  download: string;
  style: { display: string };
  click(): void;
  remove(): void;
}

export interface DownloadDocument<L extends DownloadLink = DownloadLink> {
  createElement(tag: 'a'): L;
  body: { append(link: L): void };
}

export function downloadDataUrl<L extends DownloadLink>(doc: DownloadDocument<L>, url: string, filename: string): void {
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  doc.body.append(link);
  link.click();
  link.remove();
}

/** The bytes of a `data:` URL as a File (what the share sheet takes). */
export function dataUrlToFile(url: string, filename: string): File {
  const [head, data = ''] = url.split(',');
  const type = /^data:([^;,]+)/.exec(head)?.[1] ?? 'image/png';
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], filename, { type });
}

export interface ShareNavigator {
  canShare?(data: { files: File[] }): boolean;
  share?(data: { files: File[]; title?: string }): Promise<void>;
}

/**
 * Saves the photo (ADR 0014). A computer downloads it with a link. A phone opens the share sheet when the browser can share
 * files ("save image" is the dependable way on iOS, where a download link may just open the picture over the game), and
 * downloads when it cannot or when sharing fails. Closing the sheet is a normal ending, not an error.
 */
export async function savePhoto<L extends DownloadLink>(
  env: { doc: DownloadDocument<L>; nav: ShareNavigator; touch: boolean }, url: string, filename: string,
): Promise<'shared' | 'downloaded'> {
  const { doc, nav, touch } = env;
  if (touch && nav.share && nav.canShare) {
    const file = dataUrlToFile(url, filename);
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'Viste Lagato' });
        return 'shared';
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
      }
    }
  }
  downloadDataUrl(doc, url, filename);
  return 'downloaded';
}
