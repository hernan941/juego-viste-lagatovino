// The score balance with the real data (docs/design/segunda-etapa.md, S1): 5 stars must be reachable for every cat.
import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import economy from '../../src/game/data/economy.json';
import { bestPossible, bestPossibleStars } from '../../src/game/domain/score';
import type { CatDef, ClothingDef, ComboDef, DyeDef, EconomyRules } from '../../src/game/domain/types';

const catalog = clothes as ClothingDef[];
const comboList = combos as ComboDef[];
const rules = economy as unknown as EconomyRules;
const starterDyes = (dyes as DyeDef[]).filter((d) => d.starter).map((d) => d.id);
// bestPossible runs in ~0.5 s per cat; the budget has room for the v8 coverage instrumentation, which makes it ~4x slower.
const MAX_MS = 5000;
const eachCat = (cats as CatDef[]).map((c) => [c.id, c] as const);

describe('score balance with the real data', () => {
  it.each(eachCat)('%s can reach 5 stars with everything unlocked', (_id, cat) => {
    const t0 = performance.now();
    const best = bestPossible(cat, catalog, comboList, rules);
    const ms = performance.now() - t0;
    expect(best.stars).toBe(5);
    expect(bestPossibleStars(cat, catalog, comboList, rules)).toBe(5);
    expect(ms, `bestPossible took ${ms.toFixed(0)} ms`).toBeLessThan(MAX_MS);
  });

  it.each(eachCat)('%s gets at least 3 stars with only the starter items', (_id, cat) => {
    const dyeAvailable = starterDyes.includes(cat.prefs?.favoriteDye ?? '');
    const best = bestPossible(cat, catalog, comboList, rules, { owned: [], dyeAvailable });
    expect(best.stars, `${best.points} points`).toBeGreaterThanOrEqual(3);
  });
});
