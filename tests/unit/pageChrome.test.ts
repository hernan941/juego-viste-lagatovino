import { PageEvents } from '../../src/game/constants';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_HOME_URL, FULLSCREEN_CLASS, fullscreenLabel, fullscreenMode, installPageChrome, isAppleTouch, resolveHomeUrl, shouldShowPageFullscreen,
} from '../../src/page/pageChrome';

describe('resolveHomeUrl', () => {
  it('falls back to lagatovino.com when nothing is configured', () => {
    expect(DEFAULT_HOME_URL).toBe('https://lagatovino.com/');
    expect(resolveHomeUrl(undefined)).toBe(DEFAULT_HOME_URL);
    expect(resolveHomeUrl('')).toBe(DEFAULT_HOME_URL);
    expect(resolveHomeUrl('   ')).toBe(DEFAULT_HOME_URL);
  });

  it('takes an http(s) or site-relative address, trimmed', () => {
    expect(resolveHomeUrl(' https://staging.lagatovino.com/ ')).toBe('https://staging.lagatovino.com/');
    expect(resolveHomeUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(resolveHomeUrl('/')).toBe('/');
  });

  it('refuses anything else (javascript:, data:, garbage)', () => {
    expect(resolveHomeUrl('javascript:alert(1)')).toBe(DEFAULT_HOME_URL);
    expect(resolveHomeUrl('data:text/html,hi')).toBe(DEFAULT_HOME_URL);
    expect(resolveHomeUrl('lagatovino')).toBe(DEFAULT_HOME_URL);
  });
});

describe('fullscreenMode', () => {
  it('uses the real API wherever it exists, even on an iPad', () => {
    expect(fullscreenMode({ available: true, appleTouch: false, standalone: false })).toBe('api');
    expect(fullscreenMode({ available: true, appleTouch: true, standalone: false })).toBe('api');
  });

  it('shows the "add to home screen" card on an iPhone, which has no API', () => {
    expect(fullscreenMode({ available: false, appleTouch: true, standalone: false })).toBe('hint');
  });

  it('hides everything when it is already a home-screen app, or there is no API on a non-Apple browser', () => {
    expect(fullscreenMode({ available: false, appleTouch: true, standalone: true })).toBe('none');
    expect(fullscreenMode({ available: true, appleTouch: true, standalone: true })).toBe('none');
    expect(fullscreenMode({ available: false, appleTouch: false, standalone: false })).toBe('none');
  });
});

describe('isAppleTouch', () => {
  it('recognises iPhone, iPad, iPod and the iPadOS that poses as a Mac', () => {
    expect(isAppleTouch('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 0)).toBe(true);
    expect(isAppleTouch('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 5)).toBe(true);
    expect(isAppleTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
  });
  it('rejects a real Mac, Android and Windows', () => {
    expect(isAppleTouch('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(isAppleTouch('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe(false);
    expect(isAppleTouch('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe(false);
  });
});

describe('shouldShowPageFullscreen / fullscreenLabel', () => {
  it('shows the button only where the Fullscreen API exists', () => {
    expect(shouldShowPageFullscreen({ available: true })).toBe(true);
    expect(shouldShowPageFullscreen({ available: false })).toBe(false);
  });

  it('says "salir" while it is fullscreen', () => {
    expect(fullscreenLabel(false)).toBe('Pantalla completa');
    expect(fullscreenLabel(true)).toBe('Salir');
  });
});

/** A tiny fake page: just what installPageChrome touches. */
function fakePage(opts: { api: boolean }) {
  const listeners: Record<string, Array<() => void>> = {};
  const fire = (t: string) => (listeners[t] ?? []).forEach((f) => f());
  const makeButton = () => {
    const handlers: Array<() => void> = [];
    return {
      hidden: false, attrs: {} as Record<string, string>, handlers,
      addEventListener: (_t: string, fn: () => void) => handlers.push(fn),
      removeEventListener: (_t: string, fn: () => void) => handlers.splice(handlers.indexOf(fn), 1),
      setAttribute(k: string, v: string) { this.attrs[k] = v; },
    };
  };
  const button = makeButton();
  const exit = makeButton();
  const hint = makeButton();
  hint.hidden = true;
  const hintClose = makeButton();
  const label = { textContent: '' };
  const home = { href: '' };
  const home2 = { href: '' };
  const classes = new Set<string>();
  const doc = {
    fullscreenElement: null as unknown,
    fullscreenEnabled: opts.api,
    exitFullscreen: vi.fn(async () => { doc.fullscreenElement = null; fire('fullscreenchange'); }),
    documentElement: { classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } },
    querySelectorAll: () => [home, home2],
    getElementById: (id: string): unknown => ({ 'page-fullscreen': button, 'page-fullscreen-exit': exit, 'page-fullscreen-label': label, 'a2hs-hint': hint, 'a2hs-hint-close': hintClose, stage: target }[id] ?? null),
    addEventListener: (t: string, fn: () => void) => (listeners[t] ??= []).push(fn),
    removeEventListener: (t: string, fn: () => void) => { listeners[t] = (listeners[t] ?? []).filter((f) => f !== fn); },
  };
  const target = { requestFullscreen: vi.fn(async () => { doc.fullscreenElement = target; fire('fullscreenchange'); }) };
  return { doc, button, exit, hint, hintClose, label, home, home2, classes, target, listeners };
}

describe('installPageChrome: invitation from the game', () => {
  it('enters fullscreen on the game area when the game asks, and stops listening on cleanup', () => {
    const p = fakePage({ api: true });
    const off = installPageChrome(p.doc, undefined);
    p.listeners[PageEvents.RequestFullscreen]!.forEach((f) => f());
    expect(p.target.requestFullscreen).toHaveBeenCalledTimes(1);
    off();
    expect(p.listeners[PageEvents.RequestFullscreen]).toEqual([]);
  });

  it('does not ask again when it is already fullscreen, and a refusal leaves no error', async () => {
    const p = fakePage({ api: true });
    installPageChrome(p.doc, undefined);
    p.doc.fullscreenElement = p.target;
    p.listeners[PageEvents.RequestFullscreen]!.forEach((f) => f());
    expect(p.target.requestFullscreen).not.toHaveBeenCalled();
    p.doc.fullscreenElement = null;
    p.target.requestFullscreen.mockRejectedValueOnce(new Error('denied'));
    p.listeners[PageEvents.RequestFullscreen]!.forEach((f) => f());
    await Promise.resolve();
  });

  it('ignores the game when there is no API', () => {
    const p = fakePage({ api: false });
    installPageChrome(p.doc, undefined);
    expect(p.listeners[PageEvents.RequestFullscreen] ?? []).toEqual([]);
  });
});

describe('installPageChrome', () => {
  it('points every home link at the configured address', () => {
    const p = fakePage({ api: true });
    installPageChrome(p.doc, 'https://example.com/');
    expect(p.home.href).toBe('https://example.com/');
    expect(p.home2.href).toBe('https://example.com/');
  });

  it('hides both fullscreen buttons when there is no API (and it is not an Apple phone)', () => {
    const p = fakePage({ api: false });
    installPageChrome(p.doc, undefined);
    expect(p.button.hidden).toBe(true);
    expect(p.exit.hidden).toBe(true);
  });

  it('on an iPhone keeps the button and opens / closes the add-to-home-screen card', () => {
    const p = fakePage({ api: false });
    installPageChrome(p.doc, undefined, { appleTouch: true, standalone: false });
    expect(p.button.hidden).toBe(false);
    expect(p.exit.hidden).toBe(true);
    p.button.handlers[0]();
    expect(p.hint.hidden).toBe(false);
    expect(p.target.requestFullscreen).not.toHaveBeenCalled();
    p.hintClose.handlers[0]();
    expect(p.hint.hidden).toBe(true);
  });

  it('hides the button once the game runs as a home-screen app', () => {
    const p = fakePage({ api: false });
    installPageChrome(p.doc, undefined, { appleTouch: true, standalone: true });
    expect(p.button.hidden).toBe(true);
  });

  it('enters fullscreen on the game area, then leaves it, keeping label and class in step', async () => {
    const p = fakePage({ api: true });
    installPageChrome(p.doc, undefined);
    expect(p.button.hidden).toBe(false);
    expect(p.label.textContent).toBe('Pantalla completa');

    p.button.handlers[0]();
    await Promise.resolve();
    expect(p.target.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(p.classes.has(FULLSCREEN_CLASS)).toBe(true);
    expect(p.label.textContent).toBe('Salir');
    expect(p.button.attrs['aria-pressed']).toBe('true');

    p.exit.handlers[0]();
    await Promise.resolve();
    expect(p.doc.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(p.classes.has(FULLSCREEN_CLASS)).toBe(false);
    expect(p.label.textContent).toBe('Pantalla completa');
  });

  it('follows the browser when fullscreen ends on its own (Esc)', () => {
    const p = fakePage({ api: true });
    installPageChrome(p.doc, undefined);
    p.doc.fullscreenElement = p.target;
    p.listeners['fullscreenchange'].forEach((f) => f());
    expect(p.classes.has(FULLSCREEN_CLASS)).toBe(true);
    p.doc.fullscreenElement = null;
    p.listeners['fullscreenchange'].forEach((f) => f());
    expect(p.classes.has(FULLSCREEN_CLASS)).toBe(false);
  });

  it('does not throw if the browser refuses the request', async () => {
    const p = fakePage({ api: true });
    p.target.requestFullscreen.mockRejectedValueOnce(new Error('denied'));
    installPageChrome(p.doc, undefined);
    p.button.handlers[0]();
    await new Promise((r) => setTimeout(r, 0));
    expect(p.classes.has(FULLSCREEN_CLASS)).toBe(false);
  });

  it('stops listening when uninstalled', () => {
    const p = fakePage({ api: true });
    const off = installPageChrome(p.doc, undefined);
    off();
    expect(p.listeners['fullscreenchange']).toEqual([]);
    expect(p.button.handlers).toEqual([]);
  });
});
