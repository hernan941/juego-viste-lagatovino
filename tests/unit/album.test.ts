import { describe, expect, it } from 'vitest';
import {
  ALBUM_MILESTONES,
  albumMilestones,
  completedSets,
  completion,
  crossedMilestones,
  gotEntries,
  newlySeen,
  photoUnlocks,
  type AlbumCatalogs,
} from '../../src/game/domain/album';
import type {
  CatDef,
  ClothingDef,
  ComboDef,
  DyeDef,
  KeychainRecipe,
  PhotoCatalog,
  PhotoPiece,
  PhotoUnlock,
  Progress,
  SetDef,
  Stars,
} from '../../src/game/domain/types';

// Fixtures with the shape of the real catalog (50 items, 12 cats x 5 tastes, 6 combos, 10 dyes + agua).
// When F11.10 lands, re-point `catalogs` to the real JSON in tests/unit/albumData.test.ts (total must be 138).
const item = (i: number, extra: Partial<ClothingDef> = {}): ClothingDef => ({
  id: `item${i}`, name: `Item ${i}`, slot: 'sweater', category: 'sweater', texture: `t${i}`, icon: `i${i}`, tags: [], ...extra,
});
const clothes: ClothingDef[] = [
  ...Array.from({ length: 44 }, (_, i) => item(i, i < 4 ? { starter: true } : { tier: 'basica' })),
  ...Array.from({ length: 6 }, (_, i) => item(100 + i, { secret: true })),
];
const cats: CatDef[] = Array.from({ length: 12 }, (_, i) => ({
  id: `cat${i}`, name: `Cat ${i}`, coat: 'x', texture: `c${i}`,
  prefs: { loves: ['a', 'b'], dislikes: ['c'], favoriteItem: 'item5', favoriteDye: 'rosa', hint: 'h' },
}));
const combos: ComboDef[] = Array.from({ length: 6 }, (_, i) => ({
  id: `combo${i}`, name: `Combo ${i}`, requires: [], reaction: 'r', rewardItemId: `item${100 + i}`,
}));
const dyes: DyeDef[] = [
  { id: 'agua', name: 'Agua', hex: '#FFFFFF', starter: true },
  { id: 'rosa', name: 'Rosa', hex: '#FF9EB5', starter: true },
  ...['cielo', 'sol', 'lila', 'durazno', 'naranjo', 'lapiz', 'frambuesa', 'tomate', 'hoja'].map((id) => ({ id, name: id, hex: '#123456' })),
];
const piece = (id: string, unlock: PhotoUnlock): PhotoPiece => ({ id, name: id, texture: id, unlock });
const photo: PhotoCatalog = {
  backgrounds: [piece('cuadriculado', 'starter'), piece('vichy', { set: 'abriguito' }), piece('rayado', { albumPct: 50 })],
  frames: [piece('polaroid', 'starter'), piece('kofi', { albumPct: 100 }), piece('dorado', { set: 'gala' })],
  stickers: [piece('estrella', 'starter'), piece('kofi', { set: 'michi' }), piece('pescadito', { firstFiveStar: true })],
  poses: [piece('sentadito', 'starter'), piece('dormilon', { albumPct: 75 })],
  keychain: { goldFrom: 4, charmFrom: 5, borderCopies: 12, borderRadius: 14, borderColor: '#FFF7EC', varnishAlpha: 0.5 },
};
const sets: SetDef[] = [
  { id: 'abriguito', name: 'Abriguito', requires: { items: ['item4', 'item5'] }, reward: ['vichy'] },
  { id: 'paleta', name: 'La paleta', requires: { dyes: ['rosa', 'lila'] }, reward: ['acuarela'] },
  { id: 'secretos', name: 'Secretos', requires: { combos: ['combo0', 'combo1'] }, reward: ['estrellas'] },
  { id: 'colgador', name: 'Colgador dorado', requires: { keychains: { count: 2, minStars: 4 } }, reward: ['x'] },
  { id: 'gala', name: 'Gala', requires: { items: ['item4'], dyes: ['lila'] }, reward: ['dorado'] },
  { id: 'michi', name: 'Michi', requires: { items: ['item101'] }, reward: ['kofi'] },
  { id: 'vacio', name: 'Vacio', requires: {}, reward: [] },
];
const catalogs: AlbumCatalogs = { clothes, cats, combos, dyes, sets, photo };

const recipe = (catId: string, stars: Stars): KeychainRecipe => ({
  catId, catName: catId, outfit: {}, itemDye: {}, pose: 'sentadito', stars,
  photo: { background: 'cuadriculado', frame: 'polaroid', stickers: [] }, createdAt: '2026-10-25',
});

const empty = (): Progress => ({
  wallet: 0, owned: [], dyesOwned: [], secrets: [], tastesFound: {}, bestStars: {}, ratedLooks: {}, keychains: {}, albumSeen: [],
});
const withP = (p: Partial<Progress>): Progress => ({ ...empty(), ...p });

describe('completion', () => {
  it('has a total of 138 entries with the catalog shape', () => {
    expect(completion(empty(), catalogs).total).toBe(138);
  });

  it('counts the starters (4 items and the rosa bottle) at the beginning', () => {
    const c = completion(empty(), catalogs);
    expect(c.sections).toEqual({
      items: { got: 4, total: 50 },
      tastes: { got: 0, total: 60 },
      combos: { got: 0, total: 6 },
      dyes: { got: 1, total: 10 },
      keychains: { got: 0, total: 12 },
    });
    expect(c.got).toBe(5);
    expect(c.pct).toBe(3);
  });

  it('never counts the agua tool', () => {
    expect(completion(empty(), catalogs).sections.dyes.total).toBe(10);
    expect(gotEntries(withP({ dyesOwned: ['agua'] }), catalogs)).not.toContain('dye:agua');
  });

  it('counts bought items once, ignoring unknown and repeated ids', () => {
    const c = completion(withP({ owned: ['item10', 'item10', 'item11', 'ghost'] }), catalogs);
    expect(c.sections.items.got).toBe(6);
  });

  it('derives a secret item from its combo', () => {
    const c = completion(withP({ secrets: ['combo2'] }), catalogs);
    expect(c.sections.items.got).toBe(5);
    expect(c.sections.combos.got).toBe(1);
  });

  it('does not count a secret item that was only listed in owned', () => {
    expect(completion(withP({ owned: ['item103'] }), catalogs).sections.items.got).toBe(4);
  });

  it('counts tastes per cat, once each, only the valid ones', () => {
    const c = completion(
      withP({ tastesFound: { cat0: ['love:a', 'love:a', 'favorite', 'dislike:zzz', 'color'], ghost: ['favorite'] } }),
      catalogs,
    );
    expect(c.sections.tastes.got).toBe(3);
  });

  it('counts the first keychain of each cat and ignores unknown cats', () => {
    const c = completion(withP({ keychains: { cat0: recipe('cat0', 3), cat1: recipe('cat1', 5), ghost: recipe('ghost', 5) } }), catalogs);
    expect(c.sections.keychains.got).toBe(2);
  });

  it('reaches 100 % only when everything is got', () => {
    const full = withP({
      owned: clothes.filter((c) => !c.starter && !c.secret).map((c) => c.id),
      dyesOwned: dyes.map((d) => d.id),
      secrets: combos.map((c) => c.id),
      tastesFound: Object.fromEntries(cats.map((c) => [c.id, ['love:a', 'love:b', 'dislike:c', 'favorite', 'color']])),
      keychains: Object.fromEntries(cats.map((c) => [c.id, recipe(c.id, 1)])),
    });
    expect(completion(full, catalogs)).toMatchObject({ got: 138, total: 138, pct: 100 });
  });

  it('floors the percentage so 99.x never shows 100', () => {
    const almost = withP({
      owned: clothes.filter((c) => !c.starter && !c.secret).map((c) => c.id),
      dyesOwned: dyes.map((d) => d.id),
      secrets: combos.map((c) => c.id),
      tastesFound: Object.fromEntries(cats.map((c) => [c.id, ['love:a', 'love:b', 'dislike:c', 'favorite', 'color']])),
      keychains: Object.fromEntries(cats.slice(1).map((c) => [c.id, recipe(c.id, 1)])),
    });
    const c = completion(almost, catalogs);
    expect(c.got).toBe(137);
    expect(c.pct).toBe(99);
  });

  it('is 0 % with empty catalogs', () => {
    const none: AlbumCatalogs = { ...catalogs, clothes: [], cats: [], combos: [], dyes: [] };
    expect(completion(empty(), none)).toMatchObject({ got: 0, total: 0, pct: 0 });
  });

  it('a cat without prefs has no tastes to find', () => {
    const bare: AlbumCatalogs = { ...catalogs, cats: [{ id: 'c', name: 'C', coat: 'x', texture: 't' }] };
    expect(completion(empty(), bare).sections.tastes.total).toBe(0);
  });
});

describe('gotEntries', () => {
  it('lists namespaced ids of everything got', () => {
    const got = gotEntries(
      withP({ owned: ['item10'], dyesOwned: ['lila'], secrets: ['combo0'], tastesFound: { cat0: ['favorite'] }, keychains: { cat1: recipe('cat1', 2) } }),
      catalogs,
    );
    expect(got).toEqual(
      expect.arrayContaining(['item:item0', 'item:item10', 'item:item100', 'dye:rosa', 'dye:lila', 'combo:combo0', 'taste:cat0:favorite', 'keychain:cat1']),
    );
    expect(new Set(got).size).toBe(got.length);
  });
});

describe('completedSets', () => {
  it('completes by items (bought or starter)', () => {
    expect(completedSets(empty(), catalogs)).not.toContain('abriguito');
    expect(completedSets(withP({ owned: ['item4', 'item5'] }), catalogs)).toContain('abriguito');
    expect(completedSets(withP({ owned: ['item5'] }), catalogs)).not.toContain('abriguito'); // item4 is not a starter here
  });

  it('completes by dyes, counting the starter bottle', () => {
    expect(completedSets(withP({ dyesOwned: ['lila'] }), catalogs)).toContain('paleta');
    expect(completedSets(empty(), catalogs)).not.toContain('paleta');
  });

  it('completes by combos', () => {
    expect(completedSets(withP({ secrets: ['combo0'] }), catalogs)).not.toContain('secretos');
    expect(completedSets(withP({ secrets: ['combo0', 'combo1'] }), catalogs)).toContain('secretos');
  });

  it('completes by keychains with at least the stars asked', () => {
    const one = withP({ keychains: { cat0: recipe('cat0', 5), cat1: recipe('cat1', 3) } });
    expect(completedSets(one, catalogs)).not.toContain('colgador');
    const two = withP({ keychains: { cat0: recipe('cat0', 5), cat1: recipe('cat1', 4) } });
    expect(completedSets(two, catalogs)).toContain('colgador');
  });

  it('mixes requirement kinds and a secret item via its combo', () => {
    expect(completedSets(withP({ owned: ['item4'] }), catalogs)).not.toContain('gala');
    expect(completedSets(withP({ owned: ['item4'], dyesOwned: ['lila'] }), catalogs)).toContain('gala');
    expect(completedSets(withP({ secrets: ['combo1'] }), catalogs)).toContain('michi');
  });

  it('a set with no requirements is never completed', () => {
    expect(completedSets(empty(), catalogs)).not.toContain('vacio');
  });

  it('keeps the order of sets.json', () => {
    const p = withP({ owned: ['item4', 'item5'], dyesOwned: ['lila'], secrets: ['combo1'] });
    expect(completedSets(p, catalogs)).toEqual(['abriguito', 'paleta', 'gala', 'michi']);
  });
});

describe('photoUnlocks', () => {
  it('only the starters at the beginning, by kind', () => {
    const u = photoUnlocks(empty(), catalogs);
    expect([...u.backgrounds]).toEqual(['cuadriculado']);
    expect([...u.frames]).toEqual(['polaroid']);
    expect([...u.stickers]).toEqual(['estrella']);
    expect([...u.poses]).toEqual(['sentadito']);
  });

  it('keeps the same id of different kinds apart (kofi frame vs kofi sticker)', () => {
    const u = photoUnlocks(withP({ secrets: ['combo1'] }), catalogs);
    expect(u.stickers.has('kofi')).toBe(true);
    expect(u.frames.has('kofi')).toBe(false);
  });

  it('unlocks by set', () => {
    const u = photoUnlocks(withP({ owned: ['item4', 'item5'] }), catalogs);
    expect(u.backgrounds.has('vichy')).toBe(true);
  });

  it('unlocks by album percentage', () => {
    const few = photoUnlocks(empty(), catalogs);
    expect(few.backgrounds.has('rayado')).toBe(false);
    const half = withP({
      owned: clothes.filter((c) => !c.starter && !c.secret).map((c) => c.id),
      tastesFound: Object.fromEntries(cats.slice(0, 5).map((c) => [c.id, ['love:a', 'love:b', 'dislike:c', 'favorite', 'color']])),
    });
    expect(completion(half, catalogs).pct).toBeGreaterThanOrEqual(50);
    expect(photoUnlocks(half, catalogs).backgrounds.has('rayado')).toBe(true);
    expect(photoUnlocks(half, catalogs).poses.has('dormilon')).toBe(false);
  });

  it('unlocks the first five-star piece', () => {
    expect(photoUnlocks(withP({ bestStars: { cat0: 4 } }), catalogs).stickers.has('pescadito')).toBe(false);
    expect(photoUnlocks(withP({ bestStars: { cat0: 4, cat1: 5 } }), catalogs).stickers.has('pescadito')).toBe(true);
  });

  it('is derived: the same progress gives the same result', () => {
    const p = withP({ owned: ['item4', 'item5'] });
    expect(photoUnlocks(p, catalogs)).toEqual(photoUnlocks(p, catalogs));
  });
});

describe('newlySeen', () => {
  it('returns what was got and not seen yet, in order', () => {
    expect(newlySeen(['a'], ['a', 'b', 'c'])).toEqual(['b', 'c']);
  });

  it('is empty when everything was seen', () => {
    expect(newlySeen(['a', 'b'], ['b'])).toEqual([]);
  });

  it('ignores repeated ids', () => {
    expect(newlySeen([], ['a', 'a'])).toEqual(['a']);
  });
});

describe('albumMilestones', () => {
  it('lists the milestones reached', () => {
    expect(ALBUM_MILESTONES).toEqual([25, 50, 75, 100]);
    expect(albumMilestones(0)).toEqual([]);
    expect(albumMilestones(24)).toEqual([]);
    expect(albumMilestones(25)).toEqual([25]);
    expect(albumMilestones(74)).toEqual([25, 50]);
    expect(albumMilestones(100)).toEqual([25, 50, 75, 100]);
  });

  it('crossedMilestones tells which ones a jump of percentage just reached', () => {
    expect(crossedMilestones(20, 30)).toEqual([25]);
    expect(crossedMilestones(20, 80)).toEqual([25, 50, 75]);
    expect(crossedMilestones(25, 30)).toEqual([]);
    expect(crossedMilestones(60, 40)).toEqual([]);
  });
});
