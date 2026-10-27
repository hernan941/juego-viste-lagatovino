import { describe, expect, it } from 'vitest';
import brand from '../../src/game/data/brand.json';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import economy from '../../src/game/data/economy.json';
import photo from '../../src/game/data/photo.json';
import tags from '../../src/game/data/tags.json';
import sets from '../../src/game/data/sets.json';
import { UI_ART, buildManifest } from '../../src/game/data/assets';
import { validateGameData } from '../../src/game/data/schema';
import type { BrandDef, CatDef, ClothingDef, DyeDef, PhotoCatalog } from '../../src/game/domain/types';

const extras = { dyes: dyes as DyeDef[], photo: photo as unknown as PhotoCatalog, brand: brand as BrandDef };
const manifest = buildManifest(cats as CatDef[], clothes as ClothingDef[], extras);
const files = import.meta.glob('/public/assets/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const raw = () => ({ cats, clothes, combos, economy, dyes, sets, photo, brand, tags, textures: new Set(manifest.map((m) => m.key)) });

describe('the real data files (F11.9 and F11.10)', () => {
  it('pass the whole validation', () => {
    const r = validateGameData(raw());
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('give each of the 12 cats five tastes (2 loves, 1 dislike, favorite, color)', () => {
    expect(cats).toHaveLength(12);
    for (const c of cats) {
      expect(c.prefs.loves, c.id).toHaveLength(2);
      expect(c.prefs.dislikes, c.id).toHaveLength(1);
    }
    expect(cats.find((c) => c.id === 'gris')?.prefs).toMatchObject({ loves: ['clasico', 'invierno'], dislikes: ['tierno'], favoriteItem: 'sweater-trenzado', favoriteDye: 'lapiz' });
  });

  it('every cat loves a tag that some starter item has', () => {
    const starterTags = new Set((clothes as ClothingDef[]).filter((c) => c.starter).flatMap((c) => c.tags));
    for (const c of cats) expect(c.prefs.loves.some((t) => starterTags.has(t)), c.id).toBe(true);
  });

  it('has the 7 sets of the design', () => {
    expect(sets.map((s) => s.id)).toEqual(['abriguito', 'de-gala', 'fresas-y-flores', 'michi-mood', 'la-paleta', 'todos-los-secretos', 'colgador-dorado']);
  });

  it('starts the photo mode with 2 backgrounds, 2 poses, 1 frame and 4 stickers', () => {
    const starters = (list: { unlock: unknown }[]) => list.filter((p) => p.unlock === 'starter').length;
    expect([starters(photo.backgrounds), starters(photo.poses), starters(photo.frames), starters(photo.stickers)]).toEqual([2, 2, 1, 4]);
  });
});

describe('buildManifest with the second-stage data (F11.10)', () => {
  it('has unique keys and keeps the base entries first', () => {
    const keys = manifest.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(buildManifest(cats as CatDef[], clothes as ClothingDef[])).toEqual(manifest.slice(0, buildManifest(cats as CatDef[], clothes as ClothingDef[]).length));
  });

  it('lists a bottle per dye plus the water, every photo piece and the characters', () => {
    const keys = manifest.map((m) => m.key);
    for (const d of dyes) expect(keys).toContain(`ui-dye-${d.id}`);
    expect(keys).toContain('ui-dye-agua');
    for (const p of [...photo.backgrounds, ...photo.frames, ...photo.stickers]) expect(keys).toContain(p.texture);
    expect(keys).toEqual(expect.arrayContaining(['char-judge', 'char-seller', 'ui-coin', 'ui-price-tag', 'ui-stamp', 'ui-notebook']));
  });

  it('every file exists and is rasterized at its viewBox size', () => {
    for (const m of manifest) {
      const svg = files[`/public/${m.path}`];
      expect(svg, m.path).toBeDefined();
      const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      if (!m.path.startsWith('assets/ui/') && !m.path.startsWith('assets/photo/')) continue;
      expect([m.size, m.height ?? m.size], m.path).toEqual([Number(vb?.[1]), Number(vb?.[2])]);
    }
  });

  it('loads every UI and photo file that the game uses (no v1 button or panel is left over)', () => {
    const loaded = new Set(manifest.map((m) => `/public/${m.path}`));
    const orphans = Object.keys(files).filter((f) => /^\/public\/assets\/(ui|photo)\//.test(f) && !loaded.has(f));
    expect(orphans).toEqual([]);
    expect(UI_ART.length).toBeGreaterThan(20);
  });
});
