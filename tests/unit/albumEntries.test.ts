// What each page of the album shows, derived from the progress (F17.3 and F17.4), against the real data.
import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import photoJson from '../../src/game/data/photo.json';
import setsJson from '../../src/game/data/sets.json';
import economy from '../../src/game/data/economy.json';
import { gotEntries, type AlbumCatalogs } from '../../src/game/domain/album';
import {
  HALF, HANGER, catEntries, goldCount, comboEntries, dyeEntries, gridPositions, hangerHooks, itemEntries, keychainEntries, paginate, setEntries, setMembership, tasteGlyph,
  type EntryContext,
} from '../../src/game/domain/albumEntries';
import type { CatDef, ClothingDef, ComboDef, DyeDef, EconomyRules, KeychainRecipe, PhotoCatalog, Progress, SetDef } from '../../src/game/domain/types';

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

const recipeOf = (cat: CatDef, stars: 1 | 2 | 3 | 4 | 5 = 3): KeychainRecipe => ({
  catId: cat.id, catName: 'Luna', outfit: {}, itemDye: {}, pose: 'pose-sentadito', stars,
  photo: { background: 'bg-cuadriculado', frame: 'frame-polaroid', stickers: [] }, createdAt: '2026-01-01T00:00:00.000Z',
});

describe('keychainEntries (F19.5)', () => {
  it('has one hook per cat, in the order of cats.json, all empty at the start', () => {
    const list = keychainEntries(ctx(empty()));
    expect(list.map((e) => e.catId)).toEqual((cats as CatDef[]).map((c) => c.id));
    expect(list).toHaveLength(12);
    for (const e of list) {
      expect(e).toMatchObject({ recipe: null, stars: null, isNew: false });
      expect(e.id).toBe(`keychain:${e.catId}`);
    }
  });

  it('a saved keychain fills its hook with its recipe and its stars, and is new until it is seen', () => {
    const cat = (cats as CatDef[])[2]!;
    const p = { ...empty(), keychains: { [cat.id]: recipeOf(cat, 5) } };
    const e = keychainEntries(ctx(p)).find((x) => x.catId === cat.id)!;
    expect(e).toMatchObject({ stars: 5, isNew: true, name: cat.name });
    expect(e.recipe).toBe(p.keychains[cat.id]);
    const seen = { ...p, albumSeen: [`keychain:${cat.id}`] };
    expect(keychainEntries(ctx(seen)).find((x) => x.catId === cat.id)!.isNew).toBe(false);
  });

  it('the entries it calls got are exactly the ones the album counts', () => {
    const cat = (cats as CatDef[])[0]!;
    const p = { ...empty(), keychains: { [cat.id]: recipeOf(cat) } };
    const got = keychainEntries(ctx(p)).filter((e) => e.recipe).map((e) => e.id);
    expect(gotEntries(p, catalogs).filter((id) => id.startsWith("keychain:"))).toEqual(got);
  });
});

describe('goldCount (K10)', () => {
  const rules = { goldFrom: 4 as const, charmFrom: 5 as const };
  const withStars = (...stars: (1 | 2 | 3 | 4 | 5)[]) => {
    const list = cats as CatDef[];
    const p = { ...empty(), keychains: Object.fromEntries(stars.map((s, i) => [list[i]!.id, recipeOf(list[i]!, s)])) };
    return keychainEntries(ctx(p));
  };
  it('counts the hooks with a gold ring: 4 stars or more', () => {
    expect(goldCount(withStars(), rules)).toBe(0);
    expect(goldCount(withStars(1, 3), rules)).toBe(0);
    expect(goldCount(withStars(4, 5, 3, 2), rules)).toBe(2);
    expect(goldCount(withStars(5, 5, 5), rules)).toBe(3);
  });
  it('follows the threshold of the rules, not a number of its own', () => {
    expect(goldCount(withStars(3, 4), { goldFrom: 3, charmFrom: 5 })).toBe(2);
  });
});

describe('hangerHooks (F19.5)', () => {
  const hooks = hangerHooks(12);
  it('has 4 columns by 3 rows of hooks, the first two columns on the left half and the other two on the right', () => {
    expect(hooks).toHaveLength(12);
    expect(hooks.filter((h) => h.side === 'left')).toHaveLength(6);
    expect(hooks.map((h) => h.side).slice(0, 4)).toEqual(['left', 'left', 'right', 'right']);
  });
  it('follows the hooks of the art (x = hook.x + stepX col, y = hook.y + stepY row) at the scale of the board', () => {
    const s = HANGER.scale;
    const { hook } = HANGER;
    const left = -(HANGER.art.width / 2) * s;
    const top = HANGER.centerY - (HANGER.art.height / 2) * s;
    expect(hooks[0]!.x).toBeCloseTo(left + hook.x * s);
    expect(hooks[5]!.x).toBeCloseTo(left + (hook.x + hook.stepX) * s);
    expect(hooks[5]!.y).toBeCloseTo(top + (hook.y + hook.stepY) * s);
    expect(hooks[11]!.x).toBeCloseTo(left + (hook.x + 3 * hook.stepX) * s);
  });
  it('gives the position inside its own half too', () => {
    for (const h of hooks) expect(h.localX).toBeCloseTo(h.x - HALF[h.side].center);
  });
  it('fits the page area, with the whole board inside it', () => {
    const s = HANGER.scale;
    expect(HANGER.centerY + (HANGER.art.height / 2) * s).toBeLessThanOrEqual(HALF.height / 2);
    expect(HANGER.centerY - (HANGER.art.height / 2) * s).toBeGreaterThanOrEqual(-HALF.height / 2);
    expect((HANGER.art.width / 2) * s).toBeLessThanOrEqual(450);
  });
  it('keeps the board under the title and the rings of the spine: its top is at least 12 px under the header line (K5)', () => {
    const top = HANGER.centerY - (HANGER.art.height / 2) * HANGER.scale;
    // The header line of a page is at y = -212 of the half; the board starts below its text.
    expect(top).toBeGreaterThanOrEqual(-212 + 12 + 14);
  });
  it('hangs each keychain from the tip of its hook: the ring sits where the hook curves (K5)', () => {
    const s = HANGER.scale;
    for (const h of hooks) {
      expect(h.tip.x).toBeCloseTo(h.x);
      expect(h.tip.y).toBeCloseTo(h.y + HANGER.hookTip * s);
      expect(h.tip.y).toBeGreaterThan(h.y);
    }
  });
  it('fits, in every row, the hook, the keychain and the name of the cat inside the board and above the next hook (K5)', () => {
    const s = HANGER.scale;
    // The name must end above the border of the cork, not just inside the art.
    const bottom = HANGER.centerY - (HANGER.art.height / 2) * s + HANGER.corkBottom * s;
    const content = (h: { tip: { y: number } }) => h.tip.y + HANGER.cell.fitHeight + HANGER.cell.nameGap + HANGER.cell.nameHeight;
    for (const h of hooks) expect(content(h)).toBeLessThanOrEqual(bottom - 6);
    expect(HANGER.corkBottom).toBeLessThan(HANGER.art.height - 10);
    // The name of a row ends before the circle of the hook of the next row (which starts about 9 art px above its origin).
    for (let i = 0; i + HANGER.columns < hooks.length; i++) expect(content(hooks[i]!)).toBeLessThanOrEqual(hooks[i + HANGER.columns]!.y - 9 * 1.15 * s);
  });
});

describe('setEntries (L1): the sets of the album', () => {
  const withSets: EntryContext = { ...ctx(empty()), catalog: { ...catalogs, sets: setsJson as SetDef[], photo: photoJson as unknown as PhotoCatalog } };
  const of = (p: Progress) => setEntries({ ...withSets, progress: p, seen: p.albumSeen });
  const abrigo = setsJson.find((s) => s.id === 'abriguito')!;

  it('lists the 7 sets of sets.json in order, each with its reward named from photo.json', () => {
    const list = of(empty());
    expect(list.map((e) => e.id)).toEqual(setsJson.map((s) => s.id));
    expect(list.find((e) => e.id === 'abriguito')!.rewards).toEqual([{ id: 'bg-vichy', name: 'Vichy celeste', texture: 'photo-bg-vichy', kind: 'background' }]);
    expect(list.find((e) => e.id === 'colgador-dorado')!.rewards).toEqual([{ id: 'sticker-dije', name: 'Dije dorado', texture: 'photo-sticker-dije', kind: 'sticker' }]);
  });

  it('counts the pieces that are yours: "3 de 5", and the set is done only with all of them', () => {
    const three = abrigo.requires.items!.slice(0, 3);
    const entry = of({ ...empty(), owned: three }).find((e) => e.id === 'abriguito')!;
    const real = entry.pieces.filter((p) => p.got).length;
    expect(entry.total).toBe(5);
    expect(entry.pieces).toHaveLength(5);
    expect(entry.pieces.map((p) => p.id)).toEqual(abrigo.requires.items);
    expect(entry.gotCount).toBe(real);
    expect(real).toBeGreaterThanOrEqual(3);
    expect(entry.done).toBe(false);
    const all = of({ ...empty(), owned: abrigo.requires.items! }).find((e) => e.id === 'abriguito')!;
    expect(all).toMatchObject({ gotCount: 5, done: true });
  });

  it('a piece that is an item carries its icon; a dye carries its color; a combo carries its name', () => {
    const list = of(empty());
    expect(list.find((e) => e.id === 'abriguito')!.pieces[0]).toMatchObject({ icon: expect.any(String), hex: null });
    expect(list.find((e) => e.id === 'la-paleta')!.pieces[0]).toMatchObject({ icon: null, hex: expect.stringMatching(/^#/) });
    expect(list.find((e) => e.id === 'todos-los-secretos')!.pieces).toHaveLength(6);
    expect(list.find((e) => e.id === 'fresas-y-flores')!.total).toBe(4);
  });

  it('the hanger set has no pieces, only a count of keychains with enough stars', () => {
    const entry = of({ ...empty(), keychains: { azul: { stars: 4 }, negro: { stars: 2 } } as never }).find((e) => e.id === 'colgador-dorado')!;
    expect(entry.pieces).toEqual([]);
    expect(entry).toMatchObject({ total: 12, gotCount: 1, done: false });
  });
});

describe('setMembership (L1): which sets a garment or a bottle belongs to', () => {
  const withSets: EntryContext = { ...ctx(empty()), catalog: { ...catalogs, sets: setsJson as SetDef[], photo: photoJson as unknown as PhotoCatalog } };

  it('names the set with the pieces got out of all', () => {
    const m = setMembership(withSets, 'item', 'paws-mitones');
    expect(m).toEqual([{ id: 'abriguito', name: 'Abriguito', got: expect.any(Number), total: 5 }]);
    const dye = setMembership(withSets, 'dye', 'rosa');
    expect(dye[0]).toMatchObject({ id: 'la-paleta', total: 10 });
    expect(dye[0]!.got).toBeGreaterThanOrEqual(1);
  });

  it('is empty for what belongs to no set', () => {
    expect(setMembership(withSets, 'item', 'no-existe')).toEqual([]);
  });
});
