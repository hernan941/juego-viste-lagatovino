import { describe, expect, it } from 'vitest';
import clothesJson from '../../src/game/data/clothes.json';
import { buildManifest } from '../../src/game/data/assets';
import cats from '../../src/game/data/cats.json';
import { itemsInCategory, visibleCategories } from '../../src/game/domain/catalog';
import { equip, getLayers } from '../../src/game/domain/outfit';
import { SLOT_ORDER, slotZIndex } from '../../src/game/domain/slots';
import type { CatDef, ClothingDef, Outfit } from '../../src/game/domain/types';

const clothes = clothesJson as ClothingDef[];
const visible = clothes.filter((c) => !c.secret);
const secrets = clothes.filter((c) => c.secret);

// Every file under public/assets, as /public/assets/... paths.
const files = new Set(Object.keys(import.meta.glob('/public/assets/**/*.svg')));

/** The F4 wardrobe: art-direction.md section 5 (about 44 items in 6 categories) plus 6 secrets for F8. */
const TARGET = { sweater: 16, head: 8, neck: 6, face: 5, paws: 4, accessory: 5 } as const;

describe('F4 wardrobe', () => {
  it('has at least 44 visible items and exactly 6 secret ones', () => {
    expect(visible.length).toBeGreaterThanOrEqual(44);
    expect(secrets).toHaveLength(6);
  });

  it('fills the 6 categories of art-direction section 5', () => {
    for (const [category, count] of Object.entries(TARGET)) {
      expect(visible.filter((c) => c.category === category).length, category).toBeGreaterThanOrEqual(count);
    }
    expect(visibleCategories(clothes)).toEqual(['sweater', 'head', 'neck', 'face', 'paws', 'accessory']);
  });

  it('every item sits in the slot of its category, with the id prefixed by the slot', () => {
    for (const c of clothes) {
      expect(c.slot, c.id).toBe(c.category);
      expect(c.id.startsWith(`${c.slot}-`), c.id).toBe(true);
      expect(c.texture, c.id).toBe(c.id);
      expect(c.icon, c.id).toBe(`${c.id}-icon`);
    }
  });

  it('has unique ids and names, and useful tags', () => {
    expect(new Set(clothes.map((c) => c.id)).size).toBe(clothes.length);
    expect(new Set(clothes.map((c) => c.name)).size).toBe(clothes.length);
    for (const c of clothes) expect(c.tags.length, c.id).toBeGreaterThan(0);
  });

  it('the secret items are marked and never listed in the grid', () => {
    for (const c of secrets) expect(c.tags, c.id).toContain('secreto');
    const listed = new Set(SLOT_ORDER.flatMap((slot) => itemsInCategory(clothes, slot as ClothingDef['category']).map((c) => c.id)));
    for (const c of secrets) expect(listed.has(c.id), c.id).toBe(false);
    for (const c of visible) expect(c.tags, c.id).not.toContain('secreto');
  });

  it('every item has its art in public/assets (run npm run art if this fails)', () => {
    const manifest = buildManifest(cats as CatDef[], clothes);
    for (const c of clothes) {
      const paths = manifest.filter((m) => m.key === c.texture || m.key === c.icon).map((m) => m.path);
      expect(paths, c.id).toHaveLength(2);
      for (const path of paths) expect(files.has(`/public/${path}`), path).toBe(true);
    }
  });

  it('wearing one item per slot renders the layers in z order, back to front', () => {
    let outfit: Outfit = {};
    for (const slot of [...SLOT_ORDER].reverse()) {
      const item = clothes.find((c) => c.slot === slot);
      if (item) outfit = equip(outfit, item).outfit;
    }
    const layers = getLayers(outfit, clothes);
    expect(layers.map((l) => slotZIndex(l.slot))).toEqual([...layers.map((l) => slotZIndex(l.slot))].sort((a, b) => a - b));
    expect(layers.map((l) => l.slot)).toEqual(
      ['sweater', 'neck', 'head', 'face', 'paws', 'accessory'].filter((s) => clothes.some((c) => c.slot === s)),
    );
  });

  it('every item art is drawn on the shared 512 canvas with the outline color', () => {
    const art = import.meta.glob('/art/clothes/*/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    for (const c of clothes) {
      const name = c.id.slice(c.slot.length + 1);
      const svg = art[`/art/clothes/${c.slot}/${name}.svg`];
      expect(svg, c.id).toBeDefined();
      expect(svg, c.id).toContain('viewBox="0 0 512 512"');
      expect(svg, c.id).toContain('#4A3036');
    }
  });
});
