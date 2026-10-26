// Pure TS, no Phaser (ADR 0010). What the polaroid of a cat shows under it: its best stars and "♥ found/total" tastes.
import { tasteKeys } from './album';
import type { CatDef, Progress, Stars } from './types';

export interface CatTally {
  /** Best rating of this cat, or null if it has none yet (or there is no progress). */
  stars: Stars | null;
  /** Tastes found out of the ones the cat can reveal; null when there is nothing to show. */
  tastes: { found: number; total: number; label: string } | null;
}

export function catTally(cat: CatDef, progress: Progress | undefined): CatTally {
  if (!progress) return { stars: null, tastes: null };
  const total = tasteKeys(cat).length;
  const found = progress.tastesFound[cat.id]?.length ?? 0;
  return {
    stars: progress.bestStars[cat.id] ?? null,
    tastes: total > 0 ? { found, total, label: `♥ ${found}/${total}` } : null,
  };
}
