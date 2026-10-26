import { describe, expect, it, vi } from 'vitest';
import { FontFaces } from '../../src/game/constants';
import { fontSpecs, loadFonts } from '../../src/game/systems/fonts';

const setOf = (load: (spec: string) => Promise<unknown>) => ({ load }) as unknown as FontFaceSet;

describe('fontSpecs', () => {
  it('builds one CSS font shorthand per face', () => {
    expect(fontSpecs()).toEqual(FontFaces.map((f) => `${f.weight} 16px "${f.family}"`));
    expect(fontSpecs()).toContain('900 16px "Londrina Solid"');
    expect(fontSpecs()).toContain('700 16px "Gaegu"');
  });
});

describe('loadFonts', () => {
  it('asks the browser to load every face and resolves when all are ready', async () => {
    const load = vi.fn().mockResolvedValue([]);
    await loadFonts(setOf(load), 1000);
    expect(load.mock.calls.map((c) => c[0])).toEqual(fontSpecs());
  });

  it('resolves after the timeout when a font never arrives (offline)', async () => {
    vi.useFakeTimers();
    let done = false;
    const p = loadFonts(setOf(() => new Promise(() => {})), 3000).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(2999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(done).toBe(true);
    vi.useRealTimers();
  });

  it('does not fail when a font fails to load', async () => {
    await expect(loadFonts(setOf(() => Promise.reject(new Error('404'))), 1000)).resolves.toBeUndefined();
  });

  it('does not leave the timeout pending once the fonts are ready', async () => {
    vi.useFakeTimers();
    await loadFonts(setOf(() => Promise.resolve([])), 3000);
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
