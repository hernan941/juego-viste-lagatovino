import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import { buildManifest, catTailKey, clothingAssetName } from '../../src/game/data/assets';
import { EXPRESSIONS } from '../../src/game/domain/expressions';
import type { CatDef, ClothingDef } from '../../src/game/domain/types';

// Every file under public/assets, as /public/assets/... paths (resolved by Vite at test time).
const files = new Set(Object.keys(import.meta.glob('/public/assets/**/*.svg')));
const manifest = buildManifest(cats as CatDef[], clothes as ClothingDef[]);

describe('clothingAssetName', () => {
  it('strips the slot prefix from the id', () => {
    const base = { name: '', category: 'sweater' as const, texture: '', icon: '', tags: [] };
    expect(clothingAssetName({ ...base, id: 'sweater-rayas', slot: 'sweater' })).toBe('rayas');
    expect(clothingAssetName({ ...base, id: 'head-beanie-pompon', slot: 'head' })).toBe('beanie-pompon');
    expect(clothingAssetName({ ...base, id: 'otro', slot: 'head' })).toBe('otro');
  });
});

describe('buildManifest', () => {
  it('lists every cat, face, clothing texture and icon with unique keys', () => {
    const keys = manifest.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of cats) expect(keys).toContain(c.texture);
    for (const c of cats) expect(keys).toContain(catTailKey(c));
    for (const e of EXPRESSIONS) expect(keys).toContain(`face-${e}`);
    for (const c of clothes) {
      expect(keys).toContain(c.texture);
      expect(keys).toContain(c.icon);
    }
  });

  it('loads each cat as a tailless body plus its own tail layer (F3)', () => {
    for (const c of cats) {
      expect(manifest.find((m) => m.key === c.texture)?.path).toBe(`assets/cats/noface/${c.id}.svg`);
      expect(manifest.find((m) => m.key === catTailKey(c))?.path).toBe(`assets/cats/tail/${c.id}.svg`);
    }
    expect(catTailKey({ texture: 'cat-naranja' })).toBe('cat-naranja-tail');
  });

  it('every asset exists in public/assets (run npm run art if this fails)', () => {
    for (const m of manifest) expect(files.has(`/public/${m.path}`), m.path).toBe(true);
  });
});

// F12.7 (ADR 0016 y 0018): prendas con contorno de tinta y marcas data-dye en los sweaters.
const clothesSvg = import.meta.glob('/public/assets/clothes/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const svgOf = (texture: string, icon = false): string => {
  const c = (clothes as ClothingDef[]).find((x) => x.texture === texture);
  if (!c) return '';
  return clothesSvg[`/public/assets/clothes/${c.slot}/${clothingAssetName(c)}${icon ? '.icon' : ''}.svg`] ?? '';
};
// Las prendas teñibles las define clothes.json (F11.9): los 16 sweaters visibles.
const dyeable = (clothes as ClothingDef[]).filter((c) => c.dyeable === true);

describe('prendas con tinta y marcas data-dye (F12.7)', () => {
  it('los 16 sweaters visibles son teñibles', () => {
    expect(dyeable.filter((c) => c.slot === 'sweater')).toHaveLength(16);
    expect(dyeable).toHaveLength(16);
  });

  it.each(dyeable.map((c) => [c.id, c.texture] as const))('%s: tiene al menos un data-dye="a" con fill explícito', (_id, texture) => {
    const svg = svgOf(texture);
    expect(svg).toMatch(/<[^>]*fill="#[0-9A-Fa-f]{6}"[^>]*data-dye="a"|<[^>]*data-dye="a"[^>]*fill="#[0-9A-Fa-f]{6}"/);
  });

  it.each(dyeable.map((c) => [c.id, c.texture] as const))('%s: marca también el secundario b y su sombra es negro al 15 %%', (_id, texture) => {
    const svg = svgOf(texture);
    expect(svg).toContain('data-dye="b"');
    expect(svg).toContain('fill="#000" fill-opacity="0.15"');
  });

  it.each((clothes as ClothingDef[]).map((c) => [c.id, c.texture] as const))('%s: la prenda y su icono usan tinta, no el café de la v1', (_id, texture) => {
    for (const icon of [false, true]) {
      const svg = svgOf(texture, icon);
      expect(svg.length).toBeGreaterThan(0);
      expect(svg).toContain('#1F1B1A');
      expect(svg).not.toContain('#4A3036');
      expect(svg).not.toContain('#33242A');
    }
  });
});
