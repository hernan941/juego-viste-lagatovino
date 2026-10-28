import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_HOME_URL, FULLSCREEN_CLASS, fullscreenLabel, installPageChrome, resolveHomeUrl, shouldShowPageFullscreen,
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
    getElementById: (id: string): unknown => ({ 'page-fullscreen': button, 'page-fullscreen-exit': exit, 'page-fullscreen-label': label, stage: target }[id] ?? null),
    addEventListener: (t: string, fn: () => void) => (listeners[t] ??= []).push(fn),
    removeEventListener: (t: string, fn: () => void) => { listeners[t] = (listeners[t] ?? []).filter((f) => f !== fn); },
  };
  const target = { requestFullscreen: vi.fn(async () => { doc.fullscreenElement = target; fire('fullscreenchange'); }) };
  return { doc, button, exit, label, home, home2, classes, target, listeners };
}

describe('installPageChrome', () => {
  it('points every home link at the configured address', () => {
    const p = fakePage({ api: true });
    installPageChrome(p.doc, 'https://example.com/');
    expect(p.home.href).toBe('https://example.com/');
    expect(p.home2.href).toBe('https://example.com/');
  });

  it('hides both fullscreen buttons when there is no API', () => {
    const p = fakePage({ api: false });
    installPageChrome(p.doc, undefined);
    expect(p.button.hidden).toBe(true);
    expect(p.exit.hidden).toBe(true);
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
