// Pure TS, no Phaser (ADR 0010). The clue Kofi gives with 3 or 4 stars: how many points the next star needs and, when the player
// already knows a taste of the cat that the look left out, which one to try. It is "la próxima le saco 5" turned into words.
import { SLOT_ORDER } from './slots';
import type { CatDef, ClothingDef, EconomyRules, NextHint, Outfit, RatingResult, TasteKey } from './types';

/** Points left for the next star, or null when the look already has the five. */
export function pointsToNext(points: number, rules: EconomyRules): number | null {
  const next = rules.scoring.starThresholds.find((min) => points < min);
  return next === undefined ? null : next - points;
}

/** The clue for a look of 3 or 4 stars; null for 1-2 (he comforts) and for 5 (nothing left to chase). */
export function nextHint(
  result: RatingResult,
  cat: CatDef,
  found: readonly TasteKey[],
  outfit: Outfit,
  catalog: readonly ClothingDef[],
  rules: EconomyRules,
): NextHint | null {
  if (result.stars < 3 || result.stars > 4) return null;
  const missing = pointsToNext(result.points, rules);
  if (missing === null) return null;
  const worn = new Set(
    SLOT_ORDER.flatMap((slot) => catalog.find((c) => c.id === outfit[slot])?.tags ?? []),
  );
  const love = cat.prefs?.loves.find((tag) => found.includes(`love:${tag}`) && !worn.has(tag));
  return love === undefined ? { missing } : { missing, love };
}
