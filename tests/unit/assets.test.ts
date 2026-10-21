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
