// The page around the canvas (index.html + public/style.css): the Lagatovino header and footer, the "back to Lagatovino" link and
// the fullscreen button. Phaser knows nothing about it. Pure decisions first; installPageChrome takes the document as a
// parameter so tests can fake it.
import { PageEvents } from '../game/constants';

/** Where "Volver a Lagatovino" goes unless VITE_HOME_URL says otherwise (staging, local tests...). */
export const DEFAULT_HOME_URL = 'https://lagatovino.com/';

/** Class set on <html> while the game area is fullscreen (public/style.css hides the page and shows the floating exit). */
export const FULLSCREEN_CLASS = 'page-fullscreen';

/** The configured home address, or the default if it is empty or not an http(s) / site-relative address. */
export function resolveHomeUrl(configured: string | undefined): string {
  const url = configured?.trim() ?? '';
  return /^(https?:\/\/\S+|\/\S*)$/i.test(url) ? url : DEFAULT_HOME_URL;
}

/** The fullscreen buttons exist only where the browser has the Fullscreen API (not Safari on iPhone). */
export function shouldShowPageFullscreen(env: { available: boolean }): boolean {
  return env.available;
}

export function fullscreenLabel(active: boolean): string {
  return active ? 'Salir' : 'Pantalla completa';
}

interface ButtonLike {
  hidden: boolean;
  addEventListener(type: 'click', fn: () => void): void;
  removeEventListener(type: 'click', fn: () => void): void;
  setAttribute(name: string, value: string): void;
}

export interface PageDocument {
  fullscreenElement: unknown;
  fullscreenEnabled?: boolean;
  exitFullscreen?(): Promise<void>;
  documentElement: { classList: { toggle(name: string, on: boolean): unknown } };
  getElementById(id: string): unknown;
  querySelectorAll(selector: string): ArrayLike<{ href: string }>;
  addEventListener(type: string, fn: () => void): void;
  removeEventListener(type: string, fn: () => void): void;
}

/** Wires the header link and the fullscreen buttons. Returns the function that undoes it. */
export function installPageChrome(doc: PageDocument, configuredHome: string | undefined): () => void {
  const button = doc.getElementById('page-fullscreen') as ButtonLike | null;
  const exit = doc.getElementById('page-fullscreen-exit') as ButtonLike | null;
  const label = doc.getElementById('page-fullscreen-label') as { textContent: string | null } | null;
  const area = doc.getElementById('stage') as { requestFullscreen?(): Promise<void> } | null;
  // Every link marked data-home (wordmark, "Volver", footer) goes to the same place.
  const homeUrl = resolveHomeUrl(configuredHome);
  for (const a of Array.from(doc.querySelectorAll('[data-home]'))) a.href = homeUrl;

  const available = shouldShowPageFullscreen({ available: !!doc.fullscreenEnabled && !!area?.requestFullscreen });
  for (const b of [button, exit]) if (b) b.hidden = !available;
  if (!available) return () => {};

  const sync = () => {
    const active = !!doc.fullscreenElement;
    doc.documentElement.classList.toggle(FULLSCREEN_CLASS, active);
    if (label) label.textContent = fullscreenLabel(active);
    button?.setAttribute('aria-pressed', String(active));
  };
  // The request starts inside the click (a browser rule); a refusal just leaves the page as it was.
  const toggle = () => {
    const request = doc.fullscreenElement ? doc.exitFullscreen?.() : area?.requestFullscreen?.();
    request?.catch(() => {});
  };

  // The game's invitation (a tap on "Iniciar" on a phone, ADR 0023): enter only, never leave.
  const invite = () => {
    if (!doc.fullscreenElement) area?.requestFullscreen?.()?.catch(() => {});
  };

  sync();
  doc.addEventListener(PageEvents.RequestFullscreen, invite);
  button?.addEventListener('click', toggle);
  exit?.addEventListener('click', toggle);
  doc.addEventListener('fullscreenchange', sync);
  return () => {
    doc.removeEventListener(PageEvents.RequestFullscreen, invite);
    button?.removeEventListener('click', toggle);
    exit?.removeEventListener('click', toggle);
    doc.removeEventListener('fullscreenchange', sync);
  };
}
