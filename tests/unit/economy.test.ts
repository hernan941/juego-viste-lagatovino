import { describe, expect, it } from 'vitest';
import {
  cartFromOutfit, checkout, dyePrice, lookSignature, milestoneBonus, novelty, payout, priceOf,
} from '../../src/game/domain/economy';
import type { ClothingDef, DyeDef, EconomyRules } from '../../src/game/domain/types';

const rules: EconomyRules = {
  startWallet: 100,
  scoring: {
    weights: { style: 1, love: 2, dislike: -3, complete: 1, combo: 3, favoriteItem: 2, favoriteDye: 1 },
    caps: { style: 6, love: 6 },
    starThresholds: [3, 6, 10, 14],
    ignoredTags: ['secreto', 'mece'],
  },
  prices: { basica: 40, linda: 70, lujo: 110, dye: 50 },
  payout: { byStars: { 1: 5, 2: 10, 3: 18, 4: 28, 5: 40 }, nearFactor: 0.5, tip: 2 },
  milestones: { threeStars: 15, fourStars: 25, fiveStars: 50 },
  novelty: { window: 3 },
  discoveryBonus: 15,
  comboBonus: 40,
};

const item = (id: string, slot: ClothingDef['slot'], extra: Partial<ClothingDef> = {}): ClothingDef => ({
  id, name: id, slot, category: slot === 'sweater' ? 'sweater' : 'head', texture: id, icon: id, tags: [], ...extra,
});
const catalog = [
  item('free', 'sweater', { starter: true }),
  item('cheap', 'head', { tier: 'basica' }),
  item('nice', 'neck', { tier: 'linda' }),
  item('fancy', 'face', { tier: 'lujo' }),
  item('gift', 'paws', { secret: true }),
];
const dyes: DyeDef[] = [
  { id: 'rosa', name: 'Rosa', hex: '#FFB6C9', starter: true },
  { id: 'cielo', name: 'Cielo', hex: '#9AD0F5' },
  { id: 'sol', name: 'Sol', hex: '#FFD66B' },
];
const ctx = { catalog, dyes, rules };

describe('priceOf', () => {
  it('takes the price from the tier', () => {
    expect(priceOf(catalog[1], rules)).toBe(40);
    expect(priceOf(catalog[2], rules)).toBe(70);
    expect(priceOf(catalog[3], rules)).toBe(110);
  });

  it('is free for starters and secret items (they have no tier)', () => {
    expect(priceOf(catalog[0], rules)).toBe(0);
    expect(priceOf(catalog[4], rules)).toBe(0);
  });

  it('prices a bottle from the rules, free if it is a starter', () => {
    expect(dyePrice(dyes[1], rules)).toBe(50);
    expect(dyePrice(dyes[0], rules)).toBe(0);
  });
});

describe('cartFromOutfit', () => {
  it('is empty when everything is owned or free', () => {
    const cart = cartFromOutfit({ sweater: 'free', paws: 'gift' }, {}, [], [], ctx);
    expect(cart).toEqual({ items: [], dyes: [], total: 0 });
  });

  it('lists worn items not owned, in slot order, with their price', () => {
    const cart = cartFromOutfit({ face: 'fancy', head: 'cheap', neck: 'nice' }, {}, ['nice'], [], ctx);
    expect(cart.items).toEqual([{ id: 'cheap', price: 40 }, { id: 'fancy', price: 110 }]);
    expect(cart.total).toBe(150);
  });

  it('charges a dye bottle once, even if two items use it, and skips starter or owned bottles', () => {
    const outfit = { head: 'cheap', neck: 'nice', sweater: 'free', face: 'fancy' };
    const dye = { cheap: 'cielo', nice: 'cielo', free: 'rosa', fancy: 'sol' };
    const cart = cartFromOutfit(outfit, dye, ['cheap', 'nice', 'fancy'], ['sol'], ctx);
    expect(cart.items).toEqual([]);
    expect(cart.dyes).toEqual([{ id: 'cielo', price: 50 }]);
    expect(cart.total).toBe(50);
  });

  it('ignores dyes of items that are not worn', () => {
    const cart = cartFromOutfit({ sweater: 'free' }, { cheap: 'cielo' }, [], [], ctx);
    expect(cart.dyes).toEqual([]);
  });

  it('ignores ids that are not in the catalog or bottles that do not exist', () => {
    expect(cartFromOutfit({ head: 'ghost' }, { ghost: 'cielo' }, [], [], ctx).total).toBe(0);
    expect(cartFromOutfit({ sweater: 'free' }, { free: 'nope' }, [], [], ctx).total).toBe(0);
  });
});

describe('checkout', () => {
  const cart = { items: [{ id: 'cheap', price: 40 }], dyes: [{ id: 'cielo', price: 50 }], total: 90 };

  it('pays, adds the items and bottles, and keeps the input untouched', () => {
    const owned = ['a'];
    const res = checkout(cart, 100, owned, ['b']);
    expect(res).toEqual({ ok: true, wallet: 10, owned: ['a', 'cheap'], dyesOwned: ['b', 'cielo'] });
    expect(owned).toEqual(['a']);
  });

  it('pays exactly when the wallet equals the total', () => {
    expect(checkout(cart, 90, [], [])).toMatchObject({ ok: true, wallet: 0 });
  });

  it('reports what is missing and changes nothing when it is not enough', () => {
    expect(checkout(cart, 60, [], [])).toEqual({ ok: false, missing: 30 });
  });

  it('an empty cart is a free ok', () => {
    expect(checkout({ items: [], dyes: [], total: 0 }, 5, ['x'], [])).toEqual({
      ok: true, wallet: 5, owned: ['x'], dyesOwned: [],
    });
  });
});

describe('lookSignature', () => {
  it('is stable regardless of key order and includes dyes only for worn items', () => {
    const a = lookSignature({ head: 'cheap', sweater: 'free' }, { free: 'rosa', nope: 'sol' });
    const b = lookSignature({ sweater: 'free', head: 'cheap' }, { free: 'rosa' });
    expect(a).toBe(b);
    expect(a).toBe('sweater:free~rosa|head:cheap');
  });

  it('differs when only the dye changes', () => {
    expect(lookSignature({ head: 'cheap' }, { cheap: 'sol' })).not.toBe(lookSignature({ head: 'cheap' }, {}));
  });

  it('an empty outfit has an empty signature', () => {
    expect(lookSignature({}, {})).toBe('');
  });
});

describe('novelty', () => {
  const base = lookSignature({ sweater: 'free', head: 'cheap', neck: 'nice' }, {});

  it('is 2 (all new) with no history', () => {
    expect(novelty(base, [], rules)).toBe(2);
  });

  it('is 0 for the same look', () => {
    expect(novelty(base, [base], rules)).toBe(0);
  });

  it('is 1 when one slot changes by item', () => {
    const next = lookSignature({ sweater: 'free', head: 'cheap', neck: 'fancy' }, {});
    expect(novelty(next, [base], rules)).toBe(1);
  });

  it('counts a dye change as a change', () => {
    const next = lookSignature({ sweater: 'free', head: 'cheap', neck: 'nice' }, { nice: 'sol' });
    expect(novelty(next, [base], rules)).toBe(1);
  });

  it('counts an added or removed slot as a change', () => {
    const added = lookSignature({ sweater: 'free', head: 'cheap', neck: 'nice', face: 'fancy' }, {});
    const removed = lookSignature({ sweater: 'free', head: 'cheap' }, {});
    expect(novelty(added, [base], rules)).toBe(1);
    expect(novelty(removed, [base], rules)).toBe(1);
  });

  it('is 2 with two or more changes, capped', () => {
    const next = lookSignature({ sweater: 'free', head: 'fancy', neck: 'cheap' }, { free: 'sol' });
    expect(novelty(next, [base], rules)).toBe(2);
  });

  it('compares against the closest of the recent looks', () => {
    const far = lookSignature({ head: 'fancy' }, {});
    expect(novelty(base, [far, base], rules)).toBe(0);
  });

  it('only looks at the last `window` entries', () => {
    const far = lookSignature({ head: 'fancy' }, {});
    expect(novelty(base, [base, far, far, far], rules)).toBe(2);
    expect(novelty(base, [base, far, far], rules)).toBe(0);
  });
});

describe('payout', () => {
  it.each([[1, 5], [2, 10], [3, 18], [4, 28], [5, 40]] as const)('a new look of %i stars pays %i', (stars, coins) => {
    expect(payout(stars, 2, rules)).toBe(coins);
  });

  it('pays half (rounded) for a near look', () => {
    expect(payout(3, 1, rules)).toBe(9);
    expect(payout(1, 1, rules)).toBe(3);
    expect(payout(4, 1, rules)).toBe(14);
  });

  it('pays only the tip for a repeated look, whatever the stars', () => {
    expect(payout(5, 0, rules)).toBe(2);
    expect(payout(1, 0, rules)).toBe(2);
  });
});

describe('milestoneBonus', () => {
  it('pays the first 3, 4 and 5 stars once', () => {
    expect(milestoneBonus(undefined, 3, rules)).toEqual([{ stars: 3, amount: 15 }]);
    expect(milestoneBonus(3, 4, rules)).toEqual([{ stars: 4, amount: 25 }]);
    expect(milestoneBonus(4, 5, rules)).toEqual([{ stars: 5, amount: 50 }]);
  });

  it('pays nothing when the record is not beaten or for 1-2 stars', () => {
    expect(milestoneBonus(undefined, 2, rules)).toEqual([]);
    expect(milestoneBonus(1, 2, rules)).toEqual([]);
    expect(milestoneBonus(4, 4, rules)).toEqual([]);
    expect(milestoneBonus(5, 3, rules)).toEqual([]);
  });

  it('pays every milestone skipped in a big jump', () => {
    expect(milestoneBonus(undefined, 5, rules)).toEqual([
      { stars: 3, amount: 15 }, { stars: 4, amount: 25 }, { stars: 5, amount: 50 },
    ]);
    expect(milestoneBonus(2, 4, rules)).toEqual([{ stars: 3, amount: 15 }, { stars: 4, amount: 25 }]);
  });
});
