import { describe, expect, it } from 'vitest';
import { bestPossible, bestPossibleStars, scoreLook, starsFor } from '../../src/game/domain/score';
import type { CatDef, ClothingDef, ComboDef, EconomyRules, Outfit, Stars } from '../../src/game/domain/types';
import type { Slot } from '../../src/game/domain/slots';
import { rules as baseRules } from './fixtures/economyRules';

const rules: EconomyRules = baseRules;

const item = (id: string, slot: Slot, tags: string[], extra: Partial<ClothingDef> = {}): ClothingDef => ({
  id, name: id, slot, category: slot === 'sweater' ? 'sweater' : 'head', texture: id, icon: id, tags, ...extra,
});

// A catalog shaped like the real one: the Navidad set shares tags, the random look does not.
const catalog: ClothingDef[] = [
  item('xmas-sweater', 'sweater', ['lana', 'clasico', 'invierno', 'navidad'], { dyeable: true, starter: true }),
  item('stripes', 'sweater', ['lana', 'deportivo'], { dyeable: true, starter: true }),
  item('pompom', 'head', ['clasico', 'invierno', 'navidad'], { starter: true }),
  item('chef', 'head', ['cocina'], { tier: 'basica' }),
  item('scarf', 'neck', ['clasico', 'invierno', 'navidad'], { starter: true }),
  item('shades', 'face', ['deportivo'], { tier: 'linda' }),
  item('mitts', 'paws', ['navidad'], { starter: true }),
  item('backpack', 'accessory', ['mochila'], { tier: 'linda' }),
  item('gift', 'accessory', ['secreto', 'mece'], { secret: true }),
];
const navidad: ComboDef = {
  id: 'navidad', name: 'Look Navidad', reaction: 'snowfall', rewardItemId: 'gift',
  requires: [{ itemId: 'xmas-sweater' }, { itemId: 'pompom' }, { itemId: 'scarf' }],
};
const festive: ComboDef = {
  id: 'festive', name: 'Festivo', reaction: 'snowfall', rewardItemId: 'gift',
  requires: [{ slot: 'sweater', tag: 'navidad' }, { slot: 'head', tag: 'navidad' }],
};
const combos = [navidad];

const cat = (prefs: CatDef['prefs']): CatDef => ({ id: 'c', name: 'C', coat: 'x', texture: 'c', prefs });
const neutral = cat(undefined);
const grisu = cat({
  loves: ['clasico', 'invierno'], dislikes: ['tierno'], favoriteItem: 'nope', favoriteDye: 'lapiz', hint: '',
});
const mandarina = cat({
  loves: ['deportivo', 'verano'], dislikes: ['invierno'], favoriteItem: 'nope', favoriteDye: 'sol', hint: '',
});

const navidadLook: Outfit = { sweater: 'xmas-sweater', head: 'pompom', neck: 'scarf', paws: 'mitts' };

const score = (outfit: Outfit, who: CatDef, dye: Record<string, string> = {}, cb = combos) =>
  scoreLook(outfit, dye, who, catalog, cb, rules);

describe('starsFor', () => {
  it.each([[-5, 1], [0, 1], [2, 1], [3, 2], [5, 2], [6, 3], [9, 3], [10, 4], [13, 4], [14, 5], [40, 5]] as const)(
    '%i points are %i stars', (points, stars) => {
      expect(starsFor(points, rules)).toBe(stars);
    },
  );

  it('never goes down as points go up', () => {
    let last = 0;
    for (let p = -20; p <= 60; p++) {
      const s = starsFor(p, rules);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });
});

describe('scoreLook, examples of the design (S1)', () => {
  it('a random look on a neutral cat is 2 stars (style 1 + complete 2)', () => {
    const r = score({ sweater: 'stripes', head: 'chef', face: 'shades', accessory: 'backpack' }, neutral);
    expect(r.points).toBe(3);
    expect(r.stars).toBe(2);
  });

  it('the Navidad look on Grisu is 5 stars: style 6 + love 6 + complete 2 + combo 3 = 17', () => {
    const r = score(navidadLook, grisu);
    expect(r.points).toBe(17);
    expect(r.stars).toBe(5);
    expect(r.breakdown.map((l) => [l.kind, l.points])).toEqual([
      ['style', 6], ['love', 6], ['complete', 2], ['combo', 3],
    ]);
  });

  it('the same look on Mandarina (hates invierno) is 1 star, and it is a joke, not a crash', () => {
    const r = score(navidadLook, mandarina);
    expect(r.points).toBe(6 + 2 + 3 - 9);
    expect(r.stars).toBe(1);
    expect(r.breakdown.find((l) => l.kind === 'dislike')).toEqual({ kind: 'dislike', points: -9, ref: 'invierno' });
  });

  it('the combo look without tastes in its favor is 4 stars (11 points)', () => {
    const r = score(navidadLook, neutral);
    expect(r.points).toBe(11);
    expect(r.stars).toBe(4);
  });
});

describe('scoreLook, rules', () => {
  it('an empty outfit is 0 points and 1 star, never 0 stars, and the card is not left blank (A2)', () => {
    expect(score({}, grisu)).toEqual({ points: 0, stars: 1, breakdown: [{ kind: 'bare', points: 0 }] });
  });

  it('a look with clothes but no points says so, not "al natural" (A2)', () => {
    const r = score({ sweater: 'stripes', head: 'chef' }, neutral);
    expect(r.points).toBe(0);
    expect(r.breakdown).toEqual([{ kind: 'plain', points: 0 }]);
  });

  it('stars are at least 1 even with a very negative score', () => {
    const hater = cat({ loves: [], dislikes: ['clasico', 'invierno', 'navidad'], favoriteItem: 'x', favoriteDye: 'y', hint: '' });
    const r = score(navidadLook, hater);
    expect(r.points).toBeLessThan(0);
    expect(r.stars).toBe(1);
  });

  it('style counts tags beyond the first item, and caps at the rule', () => {
    expect(score({ sweater: 'stripes', face: 'shades' }, neutral).points).toBe(1);
    const lots = { ...rules, scoring: { ...rules.scoring, caps: { style: 2, love: 6 } } };
    const r = scoreLook(navidadLook, {}, neutral, catalog, [], lots);
    expect(r.breakdown.find((l) => l.kind === 'style')?.points).toBe(2);
  });

  it('love is +2 per item with at least one loved tag (once per item) and caps', () => {
    const one = score({ sweater: 'xmas-sweater' }, grisu);
    expect(one.breakdown.find((l) => l.kind === 'love')?.points).toBe(2);
    const many = score({ sweater: 'xmas-sweater', head: 'pompom', neck: 'scarf' }, grisu, {}, []);
    expect(many.breakdown.find((l) => l.kind === 'love')?.points).toBe(6);
    const capped = scoreLook(
      { sweater: 'xmas-sweater', head: 'pompom', neck: 'scarf' }, {}, grisu, catalog, [],
      { ...rules, scoring: { ...rules.scoring, caps: { style: 6, love: 4 } } },
    );
    expect(capped.breakdown.find((l) => l.kind === 'love')?.points).toBe(4);
  });

  it('dislike is -3 per item and has no cap', () => {
    const r = score({ sweater: 'xmas-sweater', head: 'pompom', neck: 'scarf', paws: 'mitts' }, mandarina, {}, []);
    expect(r.breakdown.find((l) => l.kind === 'dislike')?.points).toBe(-9);
  });

  it('dislike weight works with a positive or a negative number in the rules', () => {
    const pos = { ...rules, scoring: { ...rules.scoring, weights: { ...rules.scoring.weights, dislike: 3 } } };
    expect(scoreLook({ sweater: 'xmas-sweater' }, {}, mandarina, catalog, [], pos).breakdown[0].points)
      .toBe(score({ sweater: 'xmas-sweater' }, mandarina).breakdown[0].points);
  });

  it('the favorite item gives +2', () => {
    const fan = cat({ loves: [], dislikes: [], favoriteItem: 'chef', favoriteDye: 'x', hint: '' });
    const r = score({ head: 'chef' }, fan);
    expect(r.points).toBe(2);
    expect(r.breakdown).toEqual([{ kind: 'favoriteItem', points: 2, ref: 'chef' }]);
  });

  it('complete is +1 with 3 slots and +2 with 4 or more', () => {
    const three = score({ sweater: 'stripes', head: 'chef', accessory: 'backpack' }, neutral);
    expect(three.breakdown).toEqual([{ kind: 'complete', points: 1 }]);
    const four = score({ sweater: 'stripes', head: 'chef', accessory: 'backpack', face: 'shades' }, neutral);
    expect(four.breakdown.find((l) => l.kind === 'complete')?.points).toBe(2);
    expect(score({ sweater: 'stripes', head: 'chef' }, neutral).breakdown.some((l) => l.kind === 'complete')).toBe(false);
  });

  it('combos give +3 each and cap at two', () => {
    const r = score(navidadLook, neutral, {}, [navidad, festive]);
    expect(r.breakdown.find((l) => l.kind === 'combo')).toEqual({ kind: 'combo', points: 6, ref: 'navidad' });
    const three = score(navidadLook, neutral, {}, [navidad, festive, { ...festive, id: 'third' }]);
    expect(three.breakdown.find((l) => l.kind === 'combo')?.points).toBe(6);
  });

  it('the cap of combos and of color can be set in the rules', () => {
    const custom = { ...rules, scoring: { ...rules.scoring, caps: { style: 6, love: 6, combo: 3, color: 1 } } };
    const r = scoreLook(navidadLook, { 'xmas-sweater': 'lapiz', pompom: 'lapiz' }, grisu, catalog, [navidad, festive], custom);
    expect(r.breakdown.find((l) => l.kind === 'combo')?.points).toBe(3);
    expect(r.breakdown.find((l) => l.kind === 'favoriteDye')?.points).toBe(1);
  });

  it('their color: +1 per worn item dyed with the favorite dye, capped at 2; unworn or other dyes do not count', () => {
    const dyed = { 'xmas-sweater': 'lapiz', stripes: 'lapiz', scarf: 'rosa' };
    const r = score(navidadLook, grisu, dyed, []);
    expect(r.breakdown.find((l) => l.kind === 'favoriteDye')).toEqual({ kind: 'favoriteDye', points: 1, ref: 'lapiz' });
    const two = score(navidadLook, grisu, { ...dyed, pompom: 'lapiz', scarf: 'lapiz' }, []);
    expect(two.breakdown.find((l) => l.kind === 'favoriteDye')?.points).toBe(2);
  });

  it('technical tags never count as style, love or dislike', () => {
    const tricky = cat({ loves: ['secreto'], dislikes: ['mece'], favoriteItem: 'x', favoriteDye: 'y', hint: '' });
    const r = score({ accessory: 'gift', sweater: 'stripes' }, tricky, {}, []);
    expect(r.points).toBe(0);
  });

  it('technical tags come from the rules, not from a fixed list', () => {
    const custom = { ...rules, scoring: { ...rules.scoring, ignoredTags: ['navidad'] } };
    const a = scoreLook({ sweater: 'xmas-sweater', head: 'pompom' }, {}, neutral, catalog, [], custom);
    const b = scoreLook({ sweater: 'xmas-sweater', head: 'pompom' }, {}, neutral, catalog, [], rules);
    expect(b.points - a.points).toBe(1);
  });

  it('points is the sum of the breakdown and zero lines are left out (but for the placeholder of an empty card)', () => {
    for (const who of [neutral, grisu, mandarina]) {
      const r = score(navidadLook, who);
      expect(r.points).toBe(r.breakdown.reduce((s, l) => s + l.points, 0));
      expect(r.breakdown.every((l) => l.points !== 0)).toBe(true);
    }
  });

  it('ignores ids that are not in the catalog', () => {
    expect(score({ sweater: 'ghost' }, grisu).points).toBe(0);
  });

  it('is monotone: adding a loved item never lowers the points', () => {
    const base = score({ sweater: 'stripes' }, mandarina).points;
    expect(score({ sweater: 'stripes', face: 'shades' }, mandarina).points).toBeGreaterThanOrEqual(base);
  });
});

describe('bestPossible', () => {
  const brute = (who: CatDef, pool: ClothingDef[]) => {
    const slots = [...new Set(pool.map((i) => i.slot))];
    let best = -Infinity;
    const walk = (i: number, outfit: Outfit): void => {
      if (i === slots.length) {
        best = Math.max(best, score(outfit, who).points);
        return;
      }
      walk(i + 1, outfit);
      for (const it of pool.filter((p) => p.slot === slots[i])) walk(i + 1, { ...outfit, [slots[i]]: it.id });
    };
    walk(0, {});
    return best;
  };

  it('finds the same maximum as trying every outfit (no dyes involved)', () => {
    const visible = catalog.filter((c) => !c.secret);
    for (const who of [neutral, grisu, mandarina]) {
      const found = bestPossible(who, catalog, combos, rules, { dyeAvailable: false });
      expect(found.points).toBe(brute(who, visible));
      // and the outfit it returns really scores that much
      expect(score(found.outfit, who, found.itemDye).points).toBe(found.points);
    }
  });

  it('adds the color bonus on dyeable items when the favorite dye is available', () => {
    const without = bestPossible(grisu, catalog, combos, rules, { dyeAvailable: false });
    const withDye = bestPossible(grisu, catalog, combos, rules);
    expect(withDye.points).toBe(without.points + 1);
    expect(Object.values(withDye.itemDye)).toEqual(['lapiz']);
    expect(score(withDye.outfit, grisu, withDye.itemDye).points).toBe(withDye.points);
  });

  it('only uses the starters and what is owned when a pool is given', () => {
    const starters = bestPossible(neutral, catalog, combos, rules, { owned: [], dyeAvailable: false });
    const worn = Object.values(starters.outfit);
    expect(worn.every((id) => catalog.find((c) => c.id === id)?.starter)).toBe(true);
    const more = bestPossible(neutral, catalog, combos, rules, { owned: ['chef', 'shades'], dyeAvailable: false });
    expect(more.points).toBeGreaterThanOrEqual(starters.points);
  });

  it('never picks a secret item', () => {
    const r = bestPossible(neutral, catalog, combos, rules);
    expect(Object.values(r.outfit)).not.toContain('gift');
  });

  it('bestPossibleStars returns the stars of that outfit', () => {
    const stars: Stars = bestPossibleStars(grisu, catalog, combos, rules);
    expect(stars).toBe(5);
    expect(bestPossibleStars(mandarina, catalog, combos, rules, { owned: [], dyeAvailable: false })).toBeLessThan(5);
  });
});
