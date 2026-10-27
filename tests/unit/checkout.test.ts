import { describe, expect, it } from 'vitest';
import { checkoutPlan, comboFate, combosDue, hasUnpaidPieces, keepOnlyOwned, payPlan } from '../../src/game/domain/checkout';
import { emptyProgress } from '../../src/game/domain/progress';
import type { ClothingDef, ComboDef, DyeDef, EconomyRules, Progress } from '../../src/game/domain/types';

const rules = {
  prices: { basica: 40, linda: 70, lujo: 110, dye: 50 },
} as unknown as EconomyRules;

const item = (id: string, slot: ClothingDef['slot'], extra: Partial<ClothingDef> = {}): ClothingDef => ({
  id, name: id, slot, category: slot === 'sweater' ? 'sweater' : 'head', texture: id, icon: id, tags: [], ...extra,
});
const catalog = [
  item('free', 'sweater', { starter: true }),
  item('cheap', 'head', { tier: 'basica' }),
  item('nice', 'neck', { tier: 'linda' }),
  item('fancy', 'face', { tier: 'lujo' }),
];
const dyes: DyeDef[] = [
  { id: 'rosa', name: 'Rosa', hex: '#FFB6C9', starter: true },
  { id: 'cielo', name: 'Cielo', hex: '#9AD0F5' },
];
const ctx = { catalog, dyes, rules };
const progress = (extra: Partial<Progress> = {}): Progress => ({ ...emptyProgress(100), ...extra });

describe('checkoutPlan', () => {
  it('an outfit of owned and free things has an empty cart', () => {
    const plan = checkoutPlan({ sweater: 'free', head: 'cheap' }, {}, progress({ owned: ['cheap'] }), ctx);
    expect(plan.cart.total).toBe(0);
    expect(plan.unpaidItems).toEqual([]);
    expect(plan.unpaidDyed).toEqual([]);
  });

  it('lists the unpaid items in slot order, with the total, and says if the wallet reaches', () => {
    const plan = checkoutPlan({ sweater: 'free', head: 'cheap', neck: 'nice' }, {}, progress({ wallet: 120 }), ctx);
    expect(plan.unpaidItems).toEqual(['nice', 'cheap']);
    expect(plan.cart.total).toBe(110);
    expect(plan.affordable).toBe(true);
    expect(plan.missing).toBe(0);
  });

  it('reports what is missing when the wallet is short', () => {
    const plan = checkoutPlan({ head: 'cheap', face: 'fancy' }, {}, progress({ wallet: 100 }), ctx);
    expect(plan.cart.total).toBe(150);
    expect(plan.affordable).toBe(false);
    expect(plan.missing).toBe(50);
  });

  it('an unpaid bottle is in the cart and marks every item that wears it', () => {
    const plan = checkoutPlan({ sweater: 'free', head: 'cheap' }, { free: 'cielo', cheap: 'cielo' }, progress({ owned: ['cheap'], wallet: 60 }), ctx);
    expect(plan.cart.dyes).toEqual([{ id: 'cielo', price: 50 }]);
    expect(plan.unpaidItems).toEqual([]);
    expect([...plan.unpaidDyed].sort()).toEqual(['cheap', 'free']);
  });

  it('starter bottles and owned bottles cost nothing', () => {
    const plan = checkoutPlan({ sweater: 'free' }, { free: 'rosa' }, progress(), ctx);
    expect(plan.unpaidDyed).toEqual([]);
    const owned = checkoutPlan({ sweater: 'free' }, { free: 'cielo' }, progress({ dyesOwned: ['cielo'] }), ctx);
    expect(owned.unpaidDyed).toEqual([]);
  });
});

describe('payPlan', () => {
  it('pays all or nothing', () => {
    const rich = progress({ wallet: 200 });
    const plan = checkoutPlan({ head: 'cheap', neck: 'nice' }, { cheap: 'cielo' }, rich, ctx);
    const paid = payPlan(rich, plan);
    expect(paid).not.toBeNull();
    expect(paid!.wallet).toBe(200 - 160);
    expect(paid!.owned).toEqual(['nice', 'cheap']);
    expect(paid!.dyesOwned).toEqual(['cielo']);
    expect(payPlan(progress({ wallet: 30 }), plan)).toBeNull();
  });

  it('does not change the input', () => {
    const p = progress({ wallet: 200 });
    const plan = checkoutPlan({ head: 'cheap' }, {}, p, ctx);
    payPlan(p, plan);
    expect(p.wallet).toBe(200);
    expect(p.owned).toEqual([]);
  });
});

describe('keepOnlyOwned', () => {
  it('takes off the unpaid items and the unpaid bottles, and keeps the rest', () => {
    const outfit = { sweater: 'free', head: 'cheap', neck: 'nice' } as const;
    const itemDye = { free: 'cielo', neck: 'rosa', cheap: 'rosa' };
    const plan = checkoutPlan(outfit, itemDye, progress({ owned: ['nice'] }), ctx);
    const kept = keepOnlyOwned(outfit, itemDye, plan);
    expect(kept.outfit).toEqual({ sweater: 'free', neck: 'nice' });
    expect(kept.itemDye).toEqual({ neck: 'rosa' });
  });

  it('is the same outfit when there is nothing to take off', () => {
    const outfit = { sweater: 'free' } as const;
    const plan = checkoutPlan(outfit, {}, progress(), ctx);
    expect(keepOnlyOwned(outfit, {}, plan)).toEqual({ outfit, itemDye: {} });
  });
});

describe('hasUnpaidPieces', () => {
  const byItem: ComboDef = { id: 'c1', name: 'C1', requires: [{ itemId: 'free' }, { itemId: 'cheap' }], reaction: 'petals', rewardItemId: 'x' };
  const byTag: ComboDef = { id: 'c2', name: 'C2', requires: [{ slot: 'head', tag: 'a' }], reaction: 'petals', rewardItemId: 'x' };
  const tagged = [catalog[0], item('cheap', 'head', { tier: 'basica', tags: ['a'] })];
  const c = { catalog: tagged, rules };

  it('is true when a piece of the combo is worn and not paid', () => {
    expect(hasUnpaidPieces(byItem, { sweater: 'free', head: 'cheap' }, [], c)).toBe(true);
    expect(hasUnpaidPieces(byTag, { head: 'cheap' }, [], c)).toBe(true);
  });

  it('is false when every piece is owned or free', () => {
    expect(hasUnpaidPieces(byItem, { sweater: 'free', head: 'cheap' }, ['cheap'], c)).toBe(false);
    expect(hasUnpaidPieces(byTag, { head: 'cheap' }, ['cheap'], c)).toBe(false);
  });

  it('ignores worn things that are not part of the combo', () => {
    expect(hasUnpaidPieces(byItem, { sweater: 'free', head: 'cheap', face: 'fancy' }, ['cheap'], { catalog: [...tagged, catalog[3]], rules })).toBe(false);
  });
});

describe('comboFate', () => {
  const combo: ComboDef = { id: 'c1', name: 'C1', requires: [{ itemId: 'free' }, { itemId: 'cheap' }], reaction: 'petals', rewardItemId: 'x' };
  const worn = { sweater: 'free', head: 'cheap' } as const;

  it('a combo whose prize is already won or on its way is a repeat', () => {
    expect(comboFate(combo, { won: true, outfit: worn, owned: [], ctx })).toBe('repeat');
    expect(comboFate(combo, { won: true, outfit: worn, owned: ['cheap'], ctx })).toBe('repeat');
  });

  it('a new combo with an unpaid piece is a hook: it sounds, but there is no box yet', () => {
    expect(comboFate(combo, { won: false, outfit: worn, owned: [], ctx })).toBe('hook');
  });

  it('a new combo with every piece paid is new: the box comes', () => {
    expect(comboFate(combo, { won: false, outfit: worn, owned: ['cheap'], ctx })).toBe('new');
  });
});

describe('combosDue', () => {
  const combos: ComboDef[] = [
    { id: 'c1', name: 'C1', requires: [{ itemId: 'free' }, { itemId: 'cheap' }], reaction: 'petals', rewardItemId: 'x' },
    { id: 'c2', name: 'C2', requires: [{ itemId: 'free' }, { itemId: 'nice' }], reaction: 'petals', rewardItemId: 'y' },
  ];
  const worn = { sweater: 'free', head: 'cheap', neck: 'nice' } as const;

  it('are the complete combos that are not won or queued and have no unpaid piece (what paying just made possible)', () => {
    expect(combosDue(worn, combos, [], ['cheap'], ctx).map((c) => c.id)).toEqual(['c1']);
    expect(combosDue(worn, combos, [], ['cheap', 'nice'], ctx).map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('skips the ones already won or queued, and the incomplete ones', () => {
    expect(combosDue(worn, combos, ['c1'], ['cheap', 'nice'], ctx).map((c) => c.id)).toEqual(['c2']);
    expect(combosDue({ sweater: 'free' }, combos, [], ['cheap', 'nice'], ctx)).toEqual([]);
  });
});
