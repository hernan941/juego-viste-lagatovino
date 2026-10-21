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
