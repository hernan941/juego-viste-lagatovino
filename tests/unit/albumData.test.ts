// The album and the photo mode against the real data (ADR 0017).
import { describe, expect, it } from 'vitest';
import brand from '../../src/game/data/brand.json';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import photo from '../../src/game/data/photo.json';
import sets from '../../src/game/data/sets.json';
import { buildManifest } from '../../src/game/data/assets';
import { ALBUM_MILESTONES, completedSets, completion, photoUnlocks, type AlbumCatalogs } from '../../src/game/domain/album';
import type { BrandDef, CatDef, ClothingDef, ComboDef, DyeDef, PhotoCatalog, PhotoPose, Progress, SetDef } from '../../src/game/domain/types';

const catalogs: AlbumCatalogs = {
  clothes: clothes as ClothingDef[],
  cats: cats as CatDef[],
  combos: combos as ComboDef[],
  dyes: dyes as DyeDef[],
  sets: sets as SetDef[],
  photo: photo as unknown as PhotoCatalog,
};
const empty = (): Progress => ({
  wallet: 0, owned: [], dyesOwned: [], secrets: [], tastesFound: {}, bestStars: {}, ratedLooks: {}, keychains: {}, albumSeen: [],
});
const manifest = buildManifest(catalogs.cats, catalogs.clothes, { dyes: catalogs.dyes, photo: catalogs.photo, brand: brand as BrandDef });
const textures = new Set(manifest.map((m) => m.key));
const SECTIONS = ['backgrounds', 'frames', 'stickers', 'poses'] as const;
const allPieces = (): PhotoPose[] => SECTIONS.flatMap((s) => catalogs.photo[s] as PhotoPose[]);

describe('album with the real data', () => {
  it('has 138 entries: 50 items, 60 tastes, 6 combos, 10 dyes and 12 keychains', () => {
    const c = completion(empty(), catalogs);
    expect(c.sections).toEqual({
      items: { got: catalogs.clothes.filter((c) => c.starter).length, total: 50 },
      tastes: { got: 0, total: 60 },
      combos: { got: 0, total: 6 },
      dyes: { got: 1, total: 10 },
      keychains: { got: 0, total: 12 },
    });
    expect(c.total).toBe(138);
  });

  it('counts the starters as already got', () => {
    const starters = catalogs.clothes.filter((c) => c.starter).length;
    expect(completion(empty(), catalogs).sections.items.got).toBe(starters);
  });

  it('reaches 100 % when everything is got', () => {
    const full: Progress = {
      ...empty(),
      owned: catalogs.clothes.map((c) => c.id),
      dyesOwned: catalogs.dyes.map((d) => d.id),
      secrets: catalogs.combos.map((c) => c.id),
      tastesFound: Object.fromEntries(
        catalogs.cats.map((c) => [c.id, ['favorite', 'color', ...c.prefs!.loves.map((t) => `love:${t}`), ...c.prefs!.dislikes.map((t) => `dislike:${t}`)]]),
      ),
      keychains: Object.fromEntries(
        catalogs.cats.map((c) => [c.id, { catId: c.id, catName: c.name, outfit: {}, itemDye: {}, pose: 'pose-sentadito', stars: 5, photo: { background: 'bg-cielo', frame: 'frame-polaroid', stickers: [] }, createdAt: '2026-10-26' }]),
      ),
    };
    const c = completion(full, catalogs);
    expect(c.got).toBe(c.total);
    expect(c.pct).toBe(100);
    expect(completedSets(full, catalogs)).toEqual(catalogs.sets.map((s) => s.id));
    const unlocked = photoUnlocks({ ...full, bestStars: { naranja: 5 } }, catalogs);
    for (const s of SECTIONS) expect([...unlocked[s]].sort(), s).toEqual(catalogs.photo[s].map((p) => p.id).sort());
  });
});

describe('sets.json with the real data', () => {
  it('points only to ids that exist', () => {
    const itemIds = new Set(catalogs.clothes.map((c) => c.id));
    const dyeIds = new Set(catalogs.dyes.map((d) => d.id));
    const comboIds = new Set(catalogs.combos.map((c) => c.id));
    for (const set of catalogs.sets) {
      for (const id of set.requires.items ?? []) expect(itemIds.has(id), `${set.id}: item ${id}`).toBe(true);
      for (const id of set.requires.dyes ?? []) expect(dyeIds.has(id), `${set.id}: dye ${id}`).toBe(true);
      for (const id of set.requires.combos ?? []) expect(comboIds.has(id), `${set.id}: combo ${id}`).toBe(true);
    }
  });

  it('only rewards ids of photo.json, and each one is unlocked by that same set', () => {
    const byId = new Map(allPieces().map((p) => [p.id, p]));
    for (const set of catalogs.sets) {
      for (const id of set.reward) {
        expect(byId.has(id), `${set.id}: reward ${id}`).toBe(true);
        expect(byId.get(id)?.unlock, id).toEqual({ set: set.id });
      }
    }
  });
});

describe('photo.json with the real data', () => {
  it('has set unlocks that point to real sets', () => {
    const setIds = new Set(catalogs.sets.map((s) => s.id));
    const pointing = allPieces().filter((p) => typeof p.unlock === 'object' && 'set' in p.unlock);
    expect(pointing.length).toBeGreaterThan(0);
    for (const p of pointing) expect(setIds.has((p.unlock as { set: string }).set), p.id).toBe(true);
  });

  it('uses prefixed ids that do not repeat between sections', () => {
    const prefixes = { backgrounds: 'bg-', frames: 'frame-', stickers: 'sticker-', poses: 'pose-' } as const;
    for (const s of SECTIONS) for (const p of catalogs.photo[s]) expect(p.id.startsWith(prefixes[s]), p.id).toBe(true);
    const ids = allPieces().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a texture in the manifest for every background, frame and sticker', () => {
    for (const s of ['backgrounds', 'frames', 'stickers'] as const) {
      for (const p of catalogs.photo[s]) expect(textures.has(p.texture), p.id).toBe(true);
    }
  });

  it('gives every album milestone a prize (a piece that opens at that percentage)', () => {
    const pcts = allPieces().flatMap((p) => (typeof p.unlock === 'object' && 'albumPct' in p.unlock ? [p.unlock.albumPct] : []));
    for (const m of ALBUM_MILESTONES) expect(pcts, `${m} %`).toContain(m);
  });

  it('opens only the starters on an empty progress', () => {
    const u = photoUnlocks(empty(), catalogs);
    for (const s of SECTIONS) {
      const starters = catalogs.photo[s].filter((p) => p.unlock === 'starter').map((p) => p.id);
      expect([...u[s]].sort(), s).toEqual(starters.sort());
    }
  });
});
