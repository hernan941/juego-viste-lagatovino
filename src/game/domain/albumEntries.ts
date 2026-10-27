// Pure TS, no Phaser (ADR 0010, 0019). What each page of the album shows: the state of every entry, derived from the progress,
// and the numbers of the layout (two halves of the open sheet with the spine free in the middle).
import { gotEntries, tasteKeys, type AlbumCatalogs } from './album';
import { WATER_DYE } from './dye';
import { dyePrice, priceOf } from './economy';
import { albumLines } from './copy/album';
import type { CatDef, ClothingDef, EconomyRules, KeychainRecipe, Progress, Stars } from './types';

/** The notebook is open: each page lives in one half of the sheet, and the rings of the spine run down the middle (x = 0). */
export const HALF = {
  left: { min: -440, max: -40, center: -240 },
  right: { min: 40, max: 440, center: 240 },
  width: 400,
  /** Height of the useful area (PAGE_AREA). */
  height: 480,
} as const;

/** What the entry builders need: the catalogs with the economy, the progress and the entries the player already saw. */
export interface EntryContext {
  catalog: AlbumCatalogs & { economy: EconomyRules };
  progress: Progress;
  seen: readonly string[];
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  pages: number;
}

/** One page of a long list; the page asked is clamped into range, and an empty list still has one page. */
export function paginate<T>(list: readonly T[], page: number, perPage: number): PageSlice<T> {
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const at = Math.min(pages - 1, Math.max(0, page));
  return { items: list.slice(at * perPage, (at + 1) * perPage), page: at, pages };
}

/** Centers of `count` cells in rows of `columns`: every row is centered on x = 0 and the first row is centered on y = cellH / 2. */
export function gridPositions(count: number, columns: number, cellW: number, cellH: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / columns);
    const inRow = Math.min(columns, count - row * columns);
    const col = i % columns;
    return { x: (col - (inRow - 1) / 2) * cellW, y: cellH / 2 + row * cellH };
  });
}

/** An entry is new while it is got and the player has not seen it yet. */
const isNewEntry = (id: string, got: ReadonlySet<string>, seen: ReadonlySet<string>): boolean => got.has(id) && !seen.has(id);

function sets(ctx: EntryContext): { got: Set<string>; seen: Set<string> } {
  return { got: new Set(gotEntries(ctx.progress, ctx.catalog)), seen: new Set(ctx.seen) };
}

export type EntryState = 'got' | 'sketch' | 'secret';

export interface ItemEntry {
  id: string;
  name: string;
  icon: string;
  /** Art worn on the cat (transparent background): the shape of the sketch and of the silhouette. */
  texture: string;
  state: EntryState;
  /** Price of the tag; 0 for what is free or won. */
  price: number;
  /** For a secret not won: the whisper of its combo. */
  hint: string | null;
  isNew: boolean;
}

/** The 50 clothes: what is yours in color, what is not as a pencil sketch with its price, the secrets last as a silhouette. */
export function itemEntries(ctx: EntryContext): ItemEntry[] {
  const { got, seen } = sets(ctx);
  const { clothes, combos, economy } = ctx.catalog;
  const entry = (c: ClothingDef): ItemEntry => {
    const albumId = `item:${c.id}`;
    const isGot = got.has(albumId);
    const hint = c.secret && !isGot ? (combos.find((k) => k.rewardItemId === c.id)?.hint ?? albumLines.secretHint) : null;
    return {
      id: c.id, name: c.name, icon: c.icon, texture: c.texture, state: isGot ? 'got' : c.secret ? 'secret' : 'sketch',
      price: isGot ? 0 : priceOf(c, economy), hint, isNew: isNewEntry(albumId, got, seen),
    };
  };
  return [...clothes.filter((c) => !c.secret), ...clothes.filter((c) => c.secret)].map(entry);
}

export interface DyeEntry {
  id: string;
  name: string;
  hex: string;
  state: 'got' | 'sketch';
  price: number;
  isNew: boolean;
}

/** The 10 bottles (the water is a tool, not an entry). */
export function dyeEntries(ctx: EntryContext): DyeEntry[] {
  const { got, seen } = sets(ctx);
  const { dyes, economy } = ctx.catalog;
  return dyes
    .filter((d) => d.id !== WATER_DYE)
    .map((d) => {
      const albumId = `dye:${d.id}`;
      const isGot = got.has(albumId);
      return { id: d.id, name: d.name, hex: d.hex, state: isGot ? 'got' : 'sketch', price: isGot ? 0 : dyePrice(d, economy), isNew: isNewEntry(albumId, got, seen) };
    });
}

/** The mark of a taste on the polaroid: ♥ loves, ✕ dislikes, ★ favorite item, ● favorite color. */
export function tasteGlyph(key: string): '♥' | '✕' | '★' | '●' {
  if (key.startsWith('love:')) return '♥';
  if (key.startsWith('dislike:')) return '✕';
  return key === 'favorite' ? '★' : '●';
}

export interface TasteEntry {
  key: string;
  glyph: '♥' | '✕' | '★' | '●';
  found: boolean;
  /** What it is, once found: the tag, the item name or the color name. */
  label: string;
}

export interface CatEntry {
  id: string;
  name: string;
  coat: string;
  def: CatDef;
  stars: Stars | null;
  tastes: TasteEntry[];
  found: number;
  /** The cat's own whisper while some taste is still hidden. */
  hint: string | null;
  isNew: boolean;
}

/** The 12 polaroids: best star, the five tastes (found or hidden) and the hint of what is missing. */
export function catEntries(ctx: EntryContext): CatEntry[] {
  const { seen } = sets(ctx);
  const { cats, clothes, dyes } = ctx.catalog;
  return cats.map((cat) => {
    const keys = tasteKeys(cat);
    const foundKeys = ctx.progress.tastesFound[cat.id] ?? [];
    const label = (key: string): string => {
      if (key === 'favorite') return clothes.find((c) => c.id === cat.prefs?.favoriteItem)?.name ?? '';
      if (key === 'color') return dyes.find((d) => d.id === cat.prefs?.favoriteDye)?.name ?? '';
      return key.slice(key.indexOf(':') + 1);
    };
    const tastes = keys.map((key) => ({ key, glyph: tasteGlyph(key), found: foundKeys.includes(key), label: label(key) }));
    const found = tastes.filter((t) => t.found).length;
    return {
      id: cat.id, name: cat.name, coat: cat.coat, def: cat, stars: ctx.progress.bestStars[cat.id] ?? null, tastes, found,
      hint: found < tastes.length ? (cat.prefs?.hint ?? albumLines.catHintFallback) : null,
      isNew: tastes.some((t) => t.found && !seen.has(`taste:${cat.id}:${t.key}`)),
    };
  });
}

export interface ComboPiece {
  /** Item id, or the tag when the requirement is "any item with this tag in this slot". */
  id: string;
  /** Icon texture of the item; none for a tag requirement. */
  icon: string | null;
  label: string;
}

export interface ComboEntry {
  id: string;
  name: string;
  state: 'got' | 'missing';
  hint: string;
  pieces: ComboPiece[];
  /** The prize item: its icon is the silhouette of the empty hole. */
  reward: { id: string; icon: string; texture: string; name: string };
  isNew: boolean;
}

/** The 6 special looks: a hole with washi each, the card with its name and pieces once won. */
export function comboEntries(ctx: EntryContext): ComboEntry[] {
  const { got, seen } = sets(ctx);
  const { combos, clothes } = ctx.catalog;
  const byId = new Map(clothes.map((c) => [c.id, c]));
  return combos.map((combo) => {
    const albumId = `combo:${combo.id}`;
    const prize = byId.get(combo.rewardItemId)!;
    const pieces = combo.requires.map((req): ComboPiece => {
      if ('itemId' in req) {
        const item = byId.get(req.itemId);
        return { id: req.itemId, icon: item?.icon ?? null, label: item?.name ?? req.itemId };
      }
      return { id: req.tag, icon: null, label: req.tag };
    });
    return {
      id: combo.id, name: combo.name, state: got.has(albumId) ? 'got' : 'missing', hint: combo.hint ?? albumLines.secretHint, pieces,
      reward: { id: prize.id, icon: prize.icon, texture: prize.texture, name: prize.name }, isNew: isNewEntry(albumId, got, seen),
    };
  });
}

export interface KeychainEntry {
  /** The id the album counts it by (`keychain:<catId>`). */
  id: string;
  catId: string;
  name: string;
  def: CatDef;
  /** What hangs on the hook; null while it is empty. */
  recipe: KeychainRecipe | null;
  stars: Stars | null;
  isNew: boolean;
}

/** The 12 hooks of the hanger, one per cat in the order of cats.json: the saved recipe (or none) and whether it is new to the player. */
export function keychainEntries(ctx: EntryContext): KeychainEntry[] {
  const { seen } = sets(ctx);
  return ctx.catalog.cats.map((cat) => {
    const recipe = ctx.progress.keychains[cat.id] ?? null;
    const id = `keychain:${cat.id}`;
    return { id, catId: cat.id, name: cat.name, def: cat, recipe, stars: recipe?.stars ?? null, isNew: recipe !== null && !seen.has(id) };
  });
}

/** The cork board of the hanger on the open sheet (art `hanger-board.svg`, 960 x 540): a scale and where its middle sits on the page. */
export const HANGER = {
  scale: 0.78,
  art: { width: 960, height: 540 },
  /** Y of the middle of the board in the page: the margin above it is for the title. */
  centerY: 28,
  columns: 4,
  /** Hooks of the art: x = 120 + 240 * column, y = 58 + 170 * row. */
  hook: { x: 120, y: 58, stepX: 240, stepY: 170 },
} as const;

export interface HangerHook {
  index: number;
  /** In the coordinates of the page (its middle is 0, 0) and of its own half. */
  x: number;
  y: number;
  side: 'left' | 'right';
  localX: number;
}

/** Where each hook is: the board spans the spine, so the first two columns belong to the left half and the other two to the right one. */
export function hangerHooks(count: number): HangerHook[] {
  const { scale, art, centerY, columns, hook } = HANGER;
  const left = -(art.width / 2) * scale;
  const top = centerY - (art.height / 2) * scale;
  return Array.from({ length: count }, (_, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = left + (hook.x + hook.stepX * col) * scale;
    const y = top + (hook.y + hook.stepY * row) * scale;
    const side = col < columns / 2 ? 'left' : 'right';
    return { index, x, y, side, localX: x - HALF[side].center };
  });
}
