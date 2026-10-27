// What each page of the album shows, derived from the progress (F17.3 and F17.4), against the real data.
import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import economy from '../../src/game/data/economy.json';
import { gotEntries, type AlbumCatalogs } from '../../src/game/domain/album';
import {
  HALF, catEntries, comboEntries, dyeEntries, gridPositions, itemEntries, paginate, tasteGlyph,
  type EntryContext,
} from '../../src/game/domain/albumEntries';
import type { CatDef, ClothingDef, ComboDef, DyeDef, EconomyRules, PhotoCatalog, Progress, SetDef } from '../../src/game/domain/types';

const catalogs: AlbumCatalogs & { economy: EconomyRules } = {
  clothes: clothes as ClothingDef[], cats: cats as CatDef[], combos: combos as ComboDef[], dyes: dyes as DyeDef[],
  sets: [] as SetDef[], photo: { backgrounds: [], frames: [], stickers: [], poses: [] } as unknown as PhotoCatalog, economy: economy as unknown as EconomyRules,
};
const empty = (): Progress => ({
  wallet: 0, owned: [], dyesOwned: [], secrets: [], tastesFound: {}, bestStars: {}, ratedLooks: {}, keychains: {}, albumSeen: [],
});
const ctx = (p: Progress): EntryContext => ({ catalog: catalogs, progress: p, seen: p.albumSeen });
const paid = clothes.find((c) => (c as ClothingDef).tier === 'linda') as ClothingDef;
const secret = clothes.find((c) => (c as ClothingDef).secret) as ClothingDef;

describe('paginate', () => {
  it('cuts a list in pages and clamps the page asked', () => {
    const list = Array.from({ length: 50 }, (_, i) => i);
    expect(paginate(list, 0, 30)).toMatchObject({ page: 0, pages: 2, items: list.slice(0, 30) });
    expect(paginate(list, 1, 30).items).toHaveLength(20);
    expect(paginate(list, 9, 30).page).toBe(1);
    expect(paginate(list, -3, 30).page).toBe(0);
  });
  it('has one page for an empty list', () => {
    expect(paginate([], 0, 10)).toEqual({ items: [], page: 0, pages: 1 });
  });
});

describe('the halves of the sheet', () => {
  it('leave the spine free in the middle', () => {
    expect(HALF.left.max).toBeLessThan(0);
    expect(HALF.right.min).toBeGreaterThan(0);
    expect(HALF.right.min + HALF.left.max).toBe(0);
    expect(HALF.left.center).toBe(-HALF.right.center);
  });
  it('fit inside the page area', () => {
    expect(HALF.left.min).toBeGreaterThanOrEqual(-450);
    expect(HALF.right.max).toBeLessThanOrEqual(450);
  });
});

describe('gridPositions', () => {
  it('centers each row on x = 0 and starts from the top', () => {
    const p = gridPositions(5, 3, 100, 50);
    expect(p).toHaveLength(5);
    expect(p[0]).toEqual({ x: -100, y: 25 });
    expect(p[2]).toEqual({ x: 100, y: 25 });
    expect(p[3]).toEqual({ x: -50, y: 75 });
    expect(p[4]).toEqual({ x: 50, y: 75 });
  });
});

describe('itemEntries', () => {
  it('has all 50 entries with the secret ones at the end', () => {
    const list = itemEntries(ctx(empty()));
    expect(list).toHaveLength(50);
    const firstSecret = list.findIndex((e) => e.state === 'secret');
    expect(list.slice(firstSecret).every((e) => e.state === 'secret')).toBe(true);
  });
  it('shows starters in color, unbought items as a pencil sketch with their price, secrets as a silhouette with a hint', () => {
    const list = itemEntries(ctx(empty()));
    expect(list.find((e) => e.id === paid.id)).toMatchObject({ state: 'sketch', price: catalogs.economy.prices.linda });
    const starter = list.find((e) => (clothes.find((c) => c.id === e.id) as ClothingDef).starter)!;
    expect(starter).toMatchObject({ state: 'got', price: 0 });
    const s = list.find((e) => e.id === secret.id)!;
    expect(s.state).toBe('secret');
    expect(s.hint).toMatch(/\S/);
    // The sketch is cut out of the art worn on the cat (it has a transparent background; the icon has a card behind it).
    expect(list.every((e) => e.texture === (clothes.find((c) => c.id === e.id) as ClothingDef).texture)).toBe(true);
  });
  it('turns an item into color when it is owned, and a secret when its combo is won', () => {
    const p = { ...empty(), owned: [paid.id], secrets: [(combos as ComboDef[]).find((c) => c.rewardItemId === secret.id)!.id] };
    const list = itemEntries(ctx(p));
    expect(list.find((e) => e.id === paid.id)!.state).toBe('got');
    expect(list.find((e) => e.id === secret.id)!.state).toBe('got');
  });
  it('agrees with the completion of the album', () => {
    const p = { ...empty(), owned: [paid.id] };
    const got = itemEntries(ctx(p)).filter((e) => e.state === 'got').map((e) => `item:${e.id}`);
    expect(got.sort()).toEqual(gotEntries(p, catalogs).filter((id) => id.startsWith('item:')).sort());
  });
  it('marks as new what is got and not seen yet', () => {
    const p = { ...empty(), owned: [paid.id], albumSeen: [] };
    const list = itemEntries(ctx(p));
    expect(list.find((e) => e.id === paid.id)!.isNew).toBe(true);
    expect(list.find((e) => e.id === paid.id)!.state).toBe('got');
    const seen = itemEntries(ctx({ ...p, albumSeen: [`item:${paid.id}`] }));
    expect(seen.find((e) => e.id === paid.id)!.isNew).toBe(false);
    expect(list.filter((e) => e.state !== 'got').every((e) => !e.isNew)).toBe(true);
  });
});

describe('dyeEntries', () => {
  it('lists the 10 bottles (not the water) with price and state', () => {
    const list = dyeEntries(ctx(empty()));
    expect(list).toHaveLength(10);
    expect(list.some((e) => e.id === 'agua')).toBe(false);
    expect(list.find((e) => e.id === 'rosa')).toMatchObject({ state: 'got', price: 0 });
    expect(list.find((e) => e.id === 'sol')).toMatchObject({ state: 'sketch', price: catalogs.economy.prices.dye });
  });
  it('colors a bought bottle and carries its hex', () => {
    const e = dyeEntries(ctx({ ...empty(), dyesOwned: ['sol'] })).find((x) => x.id === 'sol')!;
    expect(e.state).toBe('got');
    expect(e.hex).toBe('#F3C04A');
  });
});

describe('catEntries', () => {
  it('has the 12 cats with five tastes each, all hidden at the start', () => {
    const list = catEntries(ctx(empty()));
    expect(list).toHaveLength(12);
    for (const c of list) {
      expect(c.tastes).toHaveLength(5);
      expect(c.tastes.every((t) => !t.found)).toBe(true);
      expect(c.stars).toBeNull();
      expect(c.hint).toBeTruthy();
    }
  });
  it('shows a found taste with its glyph and name, and the best star', () => {
    const cat = (cats as CatDef[])[0]!;
    const love = cat.prefs!.loves[0]!;
    const p = { ...empty(), tastesFound: { [cat.id]: [`love:${love}`, 'favorite', 'color'] }, bestStars: { [cat.id]: 4 as const } };
    const e = catEntries(ctx(p)).find((c) => c.id === cat.id)!;
    expect(e.stars).toBe(4);
    expect(e.tastes.filter((t) => t.found)).toHaveLength(3);
    const t = e.tastes.find((x) => x.key === `love:${love}`)!;
    expect(t).toMatchObject({ glyph: '♥', found: true, label: love });
    expect(e.tastes.find((x) => x.key === 'favorite')!.label).toBe(
      (clothes as ClothingDef[]).find((c) => c.id === cat.prefs!.favoriteItem)!.name,
    );
    expect(e.tastes.find((x) => x.key === 'color')!.label).toBe((dyes as DyeDef[]).find((d) => d.id === cat.prefs!.favoriteDye)!.name);
    expect(e.found).toBe(3);
  });
  it('keeps the hint only while a taste is missing', () => {
    const cat = (cats as CatDef[])[0]!;
    const all = Object.fromEntries([[cat.id, ['love:' + cat.prefs!.loves[0], 'love:' + cat.prefs!.loves[1], 'dislike:' + cat.prefs!.dislikes[0], 'favorite', 'color']]]);
    const e = catEntries(ctx({ ...empty(), tastesFound: all })).find((c) => c.id === cat.id)!;
    expect(e.found).toBe(5);
    expect(e.hint).toBeNull();
  });
  it('is new while one of its found tastes is not seen', () => {
    const cat = (cats as CatDef[])[0]!;
    const p = { ...empty(), tastesFound: { [cat.id]: ['favorite'] } };
    expect(catEntries(ctx(p)).find((c) => c.id === cat.id)!.isNew).toBe(true);
    expect(catEntries(ctx({ ...p, albumSeen: [`taste:${cat.id}:favorite`] })).find((c) => c.id === cat.id)!.isNew).toBe(false);
  });
  it('maps each kind of taste to its glyph', () => {
    expect(['love:x', 'dislike:x', 'favorite', 'color'].map(tasteGlyph)).toEqual(['♥', '✕', '★', '●']);
  });
});

describe('comboEntries', () => {
  it('has the 6 looks, empty at the start with a hint and the silhouette of the prize', () => {
    const list = comboEntries(ctx(empty()));
    expect(list).toHaveLength(6);
    for (const c of list) {
      expect(c.state).toBe('missing');
      expect(c.hint).toMatch(/\S/);
      expect(c.reward.icon).toBeTruthy();
      expect(c.reward.texture).toBe((clothes as ClothingDef[]).find((i) => i.id === c.reward.id)!.texture);
    }
  });
  it('fills a won look with the icons of its pieces', () => {
    const combo = (combos as ComboDef[])[0]!;
    const e = comboEntries(ctx({ ...empty(), secrets: [combo.id] })).find((c) => c.id === combo.id)!;
    expect(e.state).toBe('got');
    const wanted = combo.requires.filter((r) => 'itemId' in r).map((r) => (r as { itemId: string }).itemId);
    expect(e.pieces.filter((p) => p.icon).map((p) => p.id)).toEqual(wanted);
    expect(e.pieces).toHaveLength(combo.requires.length);
    expect(e.isNew).toBe(true);
  });
  it('names the pieces that are a tag of a slot by the tag', () => {
    const navidad = (combos as ComboDef[]).find((c) => c.id === 'navidad')!;
    const e = comboEntries(ctx({ ...empty(), secrets: ['navidad'] })).find((c) => c.id === 'navidad')!;
    const loose = e.pieces.find((p) => !p.icon)!;
    expect(loose.label).toBe('invierno');
    expect(navidad.requires).toHaveLength(e.pieces.length);
  });
});
