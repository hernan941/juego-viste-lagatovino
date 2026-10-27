import { describe, expect, it } from 'vitest';

// Gaegu (Fonts.Voice) has no accented letters, ñ, ¡ or ¿: they would fall back to another face and look broken.
const FORBIDDEN = /[áéíóúüÁÉÍÓÚÜñÑ¡¿]/;
// A trailing comment with this mark flags a line drawn with Fonts.Title (Londrina Solid), which has accents.
const TITLE_MARK = 'Fonts.Title: accents allowed';

const json = import.meta.glob<string>('/src/game/data/*.json', { query: '?raw', import: 'default', eager: true });
const copy = import.meta.glob<string>('/src/game/domain/copy/*.ts', { query: '?raw', import: 'default', eager: true });
// Bubbles and toasts written straight inside scenes and objects.
const inline = import.meta.glob<string>(
  [
    '/src/game/scenes/ShopEntrance.ts',
    '/src/game/scenes/Showcase.ts',
    '/src/game/scenes/CatSelect.ts',
    '/src/game/objects/comboFx.ts',
    '/src/game/objects/GiftBox.ts',
    '/src/game/objects/dressup/SecretsController.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
);

function strings(value: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (k !== '$comment') strings(v, `${path}.${k}`, out);
  }
}

function offenders(pairs: Array<[string, string]>): string[] {
  return pairs.filter(([, text]) => FORBIDDEN.test(text)).map(([where, text]) => `${where}: ${text}`);
}

function codeLines(file: string, source: string, skip: RegExp | null = null): Array<[string, string]> {
  const lines: Array<[string, string]> = [];
  source.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
    if (skip && skip.test(line)) return;
    if (line.includes(TITLE_MARK)) return;
    lines.push([`${file}:${i + 1}`, line]);
  });
  return lines;
}

describe('texts drawn with Fonts.Voice', () => {
  for (const [file, source] of Object.entries(json).filter(([f]) => !f.endsWith('anchors.json'))) {
    it(`${file} has no accents, ñ, ¡ or ¿`, () => {
      const out: Array<[string, string]> = [];
      strings(JSON.parse(source), file, out);
      expect(offenders(out)).toEqual([]);
    });
  }

  for (const [file, source] of Object.entries(copy)) {
    it(`${file} has no accents, ñ, ¡ or ¿`, () => {
      expect(offenders(codeLines(file, source))).toEqual([]);
    });
  }

  it('the bubbles and toasts written inside scenes avoid them too', () => {
    // Button labels use Fonts.Title (Londrina Solid) and keep their accents.
    const lines = Object.entries(inline).flatMap(([file, source]) => codeLines(file, source, /new Button\(/));
    expect(offenders(lines)).toEqual([]);
  });
});
