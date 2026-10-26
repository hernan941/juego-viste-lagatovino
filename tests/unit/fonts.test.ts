import { describe, expect, it, vi } from 'vitest';
import { FontFaces, Fonts } from '../../src/game/constants';
import { ACCENT_SAMPLE, fontSpecs, loadFonts } from '../../src/game/systems/fonts';

const setOf = (load: (spec: string) => Promise<unknown>) => ({ load }) as unknown as FontFaceSet;

describe('fontSpecs', () => {
  it('builds one CSS font shorthand per face', () => {
    expect(fontSpecs()).toEqual(FontFaces.map((f) => `${f.weight} 16px "${f.family}"`));
    expect(fontSpecs()).toContain('900 16px "Londrina Solid"');
    expect(fontSpecs()).toContain('700 16px "Gaegu"');
  });
});

describe('accent alias (F12.R M2)', () => {
  it('Voice falls back to the accents-only alias before Londrina Solid', () => {
    expect(Fonts.Voice).toBe("Gaegu, 'Londrina Acentos', 'Londrina Solid', sans-serif");
  });

  it('the alias is declared for both Gaegu weights, from the Londrina 400 file', () => {
    const alias = FontFaces.filter((f) => f.family === 'Londrina Acentos');
    expect(alias.map((f) => f.weight)).toEqual([400, 700]);
    expect(alias.every((f) => f.file === 'LondrinaSolid-400.woff2')).toBe(true);
  });

  it('is loaded with a sample of the accented glyphs (a unicode-range face ignores the default space)', () => {
    expect(ACCENT_SAMPLE).toMatch(/[áéíóúñ¡¿]/);
  });
});

describe('loadFonts', () => {
  it('asks the browser to load every face and resolves when all are ready', async () => {
    const load = vi.fn().mockResolvedValue([]);
    await loadFonts(setOf(load), 1000);
    expect(load.mock.calls.map((c) => c[0])).toEqual(fontSpecs());
    expect(load.mock.calls.every((c) => c[1] === ACCENT_SAMPLE)).toBe(true);
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
