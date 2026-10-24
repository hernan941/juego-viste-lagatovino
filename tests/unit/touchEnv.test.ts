import { describe, expect, it } from 'vitest';
import { ROTATE_CLASS, installRotateHint, readTouchEnv } from '../../src/game/systems/touchEnv';

/** A window with media queries we can flip, like a phone being turned. */
function fakeWindow(initial: { coarse: boolean; anyCoarse?: boolean; portrait: boolean }, size = { w: 863, h: 360 }) {
  const state = { ...initial };
  const listeners: Record<string, Array<() => void>> = {};
  const matches = (q: string) => (q.includes('any-pointer') ? (state.anyCoarse ?? state.coarse) : q.includes('pointer: coarse') ? state.coarse : q.includes('portrait') ? state.portrait : false);
  const win = {
    innerWidth: size.w,
    innerHeight: size.h,
    matchMedia: (q: string) => ({
      get matches() { return matches(q); },
      addEventListener: (_: string, fn: () => void) => { (listeners[q] ??= []).push(fn); },
      removeEventListener: (_: string, fn: () => void) => { listeners[q] = (listeners[q] ?? []).filter((f) => f !== fn); },
    }),
  };
  const flip = (patch: Partial<typeof state>) => {
    Object.assign(state, patch);
    for (const fns of Object.values(listeners)) for (const fn of [...fns]) fn();
  };
  return { win, flip, listeners };
}

function fakeDoc() {
  const classes = new Set<string>();
  return { classes, documentElement: { classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } } };
}

describe('readTouchEnv', () => {
  it('a phone: touch, with the landscape scale of its window', () => {
    const { win } = fakeWindow({ coarse: true, portrait: false });
    const env = readTouchEnv(win);
    expect(env.touch).toBe(true);
    expect(env.scale).toBeCloseTo(0.5, 1);
  });

  it('a desktop: no touch', () => {
    const { win } = fakeWindow({ coarse: false, portrait: false }, { w: 1280, h: 720 });
    expect(readTouchEnv(win)).toEqual({ touch: false, scale: 1 });
  });
});

describe('installRotateHint', () => {
  it('marks the page when a phone is held in portrait and unmarks it when turned', () => {
    const { win, flip } = fakeWindow({ coarse: true, portrait: true });
    const doc = fakeDoc();
    installRotateHint(win, doc);
    expect(doc.classes.has(ROTATE_CLASS)).toBe(true);
    flip({ portrait: false });
    expect(doc.classes.has(ROTATE_CLASS)).toBe(false);
    flip({ portrait: true });
    expect(doc.classes.has(ROTATE_CLASS)).toBe(true);
  });

  it('never marks a desktop window, however narrow', () => {
    const { win } = fakeWindow({ coarse: false, portrait: true }, { w: 400, h: 900 });
    const doc = fakeDoc();
    installRotateHint(win, doc);
    expect(doc.classes.has(ROTATE_CLASS)).toBe(false);
  });

  it('stops listening when disposed', () => {
    const { win, flip, listeners } = fakeWindow({ coarse: true, portrait: false });
    const doc = fakeDoc();
    const dispose = installRotateHint(win, doc);
    dispose();
    expect(Object.values(listeners).flat()).toHaveLength(0);
    flip({ portrait: true });
    expect(doc.classes.has(ROTATE_CLASS)).toBe(false);
  });

  it('copes with a browser without matchMedia', () => {
    const doc = fakeDoc();
    const dispose = installRotateHint({ innerWidth: 1, innerHeight: 1 } as never, doc);
    expect(typeof dispose).toBe('function');
    expect(doc.classes.size).toBe(0);
  });
});
