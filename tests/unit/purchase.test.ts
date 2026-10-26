import { describe, expect, it } from 'vitest';
import { buyItem } from '../../src/game/domain/purchase';
import { emptyProgress } from '../../src/game/domain/progress';
import type { ClothingDef, EconomyRules } from '../../src/game/domain/types';
import economy from '../../src/game/data/economy.json';

const rules = economy as unknown as EconomyRules;
const item = (id: string, extra: Partial<ClothingDef> = {}): ClothingDef => ({
  id, name: id, slot: 'head', category: 'head', texture: id, icon: id, tags: [], ...extra,
});
const cheap = item('cheap', { tier: 'basica' });
const fancy = item('fancy', { tier: 'lujo' });

describe('buyItem (F13.5)', () => {
  it('pays the tier price, adds the item to owned and leaves the input alone', () => {
    const before = { ...emptyProgress(100), wallet: 100 };
    const result = buyItem(before, cheap, rules);
    expect(result).toMatchObject({ ok: true, price: 40 });
    if (!result.ok) return;
    expect(result.progress.wallet).toBe(60);
    expect(result.progress.owned).toEqual(['cheap']);
    expect(before.owned).toEqual([]);
    expect(before.wallet).toBe(100);
  });

  it('can pay with exactly the money it has', () => {
    const result = buyItem({ ...emptyProgress(0), wallet: 40 }, cheap, rules);
    expect(result.ok && result.progress.wallet).toBe(0);
  });

  it('when the wallet is short nothing changes and it says how much is missing', () => {
    expect(buyItem({ ...emptyProgress(0), wallet: 30 }, fancy, rules)).toEqual({ ok: false, reason: 'short', missing: 80 });
  });

  it('buying twice charges once: the second time it is already owned', () => {
    const first = buyItem({ ...emptyProgress(0), wallet: 200 }, cheap, rules);
    if (!first.ok) throw new Error('should pay');
    expect(buyItem(first.progress, cheap, rules)).toEqual({ ok: false, reason: 'nothing-to-pay' });
  });

  it('a starter or secret item (no tier) has nothing to pay', () => {
    expect(buyItem(emptyProgress(100), item('free', { starter: true }), rules)).toEqual({ ok: false, reason: 'nothing-to-pay' });
  });
});
