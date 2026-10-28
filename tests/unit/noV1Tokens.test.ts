import { describe, expect, it } from 'vitest';

const sources = import.meta.glob('/src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const pages = import.meta.glob(['/index.html', '/public/style.css', '/art/preview.html'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// Strip comments so the explanations may still mention what was removed.
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('F20.7: no v1 tokens or Fredoka left', () => {
  it('no file in src/ reads the old palette, FONT_FAMILY, Fredoka or the v1 ui helpers', () => {
    const offenders = Object.entries(sources)
      .filter(([, s]) => /\bPalette\b|\bPaletteToken\b|\bFONT_FAMILY\b|Fredoka|\bdrawPanel\b|\bmakePill\b|\bmakeText\b|\bhex\(/.test(code(s)))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it('the page, the stylesheet and the preview do not load Fredoka or Google Fonts', () => {
    expect(Object.keys(pages)).toHaveLength(3);
    for (const [file, source] of Object.entries(pages)) {
      expect(source, file).not.toMatch(/Fredoka|fonts\.googleapis|fonts\.gstatic/);
    }
  });
});
