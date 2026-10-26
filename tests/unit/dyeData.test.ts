// Dyes against the real data and the real SVGs (ADR 0018).
import { describe, expect, it } from 'vitest';
import clothes from '../../src/game/data/clothes.json';
import dyes from '../../src/game/data/dyes.json';
import { clothingAssetName } from '../../src/game/data/assets';
import { WATER_DYE, dyeColors, recolorSvg } from '../../src/game/domain/dye';
import type { ClothingDef } from '../../src/game/domain/types';

const files = import.meta.glob('/public/assets/clothes/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const svgOf = (item: ClothingDef): string => files[`/public/assets/clothes/${item.slot}/${clothingAssetName(item)}.svg`];
const dyeable = (clothes as ClothingDef[]).filter((c) => c.dyeable);
const sweaters = (clothes as ClothingDef[]).filter((c) => c.slot === 'sweater');
const INK = /#1F1B1A/gi;
const MARKED = /<[a-zA-Z][^<>]*?\bdata-dye=(["'])[ab]\1[^<>]*>/g;
const fillOf = (tag: string) => /\sfill=(["'])([^"']*)\1/.exec(tag)?.[2];

describe('dyes.json', () => {
  it('has valid, unique #RRGGBB hex values and ids', () => {
    for (const d of dyes) expect(d.hex, d.id).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(new Set(dyes.map((d) => d.id)).size).toBe(dyes.length);
    expect(new Set(dyes.map((d) => d.hex.toUpperCase())).size).toBe(dyes.length);
  });

  it('does not list the water tool as a bottle', () => {
    expect(dyes.map((d) => d.id)).not.toContain(WATER_DYE);
  });
});

describe('dyeable items and their real SVGs', () => {
  it('has dyeable items, and every visible sweater is one', () => {
    expect(dyeable.length).toBeGreaterThan(0);
    expect(sweaters.filter((s) => !s.secret && !s.dyeable).map((s) => s.id)).toEqual([]);
  });

  it.each(dyeable.map((c) => [c.id, c] as const))('%s has a data-dye="a" mark in its SVG', (_id, item) => {
    const svg = svgOf(item);
    expect(svg, 'svg file exists').toBeTypeOf('string');
    expect(svg).toMatch(/data-dye=(["'])a\1/);
  });

  it.each(sweaters.map((c) => [c.id, c] as const))('%s: recolorSvg changes the marks and leaves the ink alone', (_id, item) => {
    const svg = svgOf(item);
    const colors = dyeColors(dyes[0].hex);
    const out = recolorSvg(svg, colors);
    expect(out).not.toBe(svg);
    // Every marked element that has a fill gets the dye color of its mark.
    for (const tag of out.match(MARKED) ?? []) {
      const fill = fillOf(tag);
      if (fill !== undefined && fill !== 'none') expect(fill).toBe(tag.includes('data-dye="a"') ? colors.a : colors.b);
    }
    // The ink is never a mark: same count, and everything but the marked tags is identical.
    expect(out.match(INK)?.length).toBe(svg.match(INK)?.length);
    expect(out.replace(MARKED, '')).toBe(svg.replace(MARKED, ''));
  });

  it('keeps the ink with every bottle', () => {
    const svg = svgOf(sweaters[0]);
    for (const d of dyes) expect(recolorSvg(svg, dyeColors(d.hex)).match(INK)?.length).toBe(svg.match(INK)?.length);
  });
});
