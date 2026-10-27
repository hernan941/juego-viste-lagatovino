// Pure TS, no Phaser (ADR 0010, ADR 0017). What the Showcase needs to turn a look into a verdict: it rates the look and applies the
// rating to the progress in one step (the progress is written BEFORE the ceremony plays, so watching it or not changes nothing).
import type { AlbumCatalogs } from './album';
import type { CatDef, ClothingDef, ComboDef, EconomyRules, ItemDye, Outfit, Progress, ProgressEvent, RatingResult } from './types';
import { lookSignature } from './economy';
import { applyAlbumNews, applyRating } from './progress';
import { scoreLook } from './score';

/** The look on the runway: the cat, its name and what it wears (with its dyes). */
export interface RunwayLook {
  catId: string;
  catName: string;
  outfit: Outfit;
  itemDye: ItemDye;
}

/** What `rateLook` needs of the catalog. */
export interface RunwayCatalog {
  cats: readonly CatDef[];
  clothes: readonly ClothingDef[];
  combos: readonly ComboDef[];
  economy: EconomyRules;
  /** With these three the album news (sets completed, pieces unlocked) ride along; a small fixture can leave them out. */
  dyes?: AlbumCatalogs['dyes'];
  sets?: AlbumCatalogs['sets'];
  photo?: AlbumCatalogs['photo'];
}

export interface Rated {
  result: RatingResult;
  progress: Progress;
  events: ProgressEvent[];
}

/** Rates the look (an unknown cat falls back to the first one) and applies the rating. The input progress is never changed. */
export function rateLook(progress: Progress, look: RunwayLook, catalog: RunwayCatalog): Rated {
  const cat = catalog.cats.find((c) => c.id === look.catId) ?? catalog.cats[0]!;
  const result = scoreLook(look.outfit, look.itemDye, cat, catalog.clothes, catalog.combos, catalog.economy);
  const applied = applyRating(progress, result, catalog.economy, { catId: cat.id, signature: lookSignature(look.outfit, look.itemDye) });
  const { dyes, sets, photo } = catalog;
  if (!dyes || !sets || !photo) return { result, progress: applied.progress, events: applied.events };
  const news = applyAlbumNews(applied.progress, { ...catalog, dyes, sets, photo });
  return { result, progress: news.progress, events: [...applied.events, ...news.events] };
}

/** What the Showcase passes to the photo mode (ADR 0019): the look and, when there is one, its rating. */
export function photoArgs(look: RunwayLook, rating: RatingResult | null): { look: { catId: string; catName: string; outfit: Outfit }; rating?: RatingResult } {
  const args = { look: { catId: look.catId, catName: look.catName, outfit: look.outfit } };
  return rating ? { ...args, rating } : args;
}

/** The words of the runway that are not the judge's. */
export const runwayLines = {
  skip: (touch: boolean): string => (touch ? 'Toca para seguir' : 'Clic para seguir'),
  photo: 'Modo foto',
  keepDressing: 'Seguir vistiendo',
  change: 'Otro gato',
} as const;
