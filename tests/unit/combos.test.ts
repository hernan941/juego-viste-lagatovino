import { describe, expect, it } from 'vitest';
import { findCompletedCombos, newlyCompleted, unlockSecret } from '../../src/game/domain/combos';
import type { ClothingDef, ComboDef } from '../../src/game/domain/types';

const item = (id: string, slot: ClothingDef['slot'], tags: string[] = []): ClothingDef => ({
  id, name: id, slot, category: slot === 'sweater' ? 'sweater' : 'head', texture: id, icon: id, tags,
});
const catalog = [
  item('xmas', 'sweater', ['navidad']),
  item('stripes', 'sweater'),
  item('pompom', 'head', ['navidad']),
  item('scarf', 'neck'),
];
const navidad: ComboDef = {
  id: 'navidad', name: 'Look Navidad', reaction: 'dance', rewardItemId: 'gift',
  requires: [{ itemId: 'xmas' }, { itemId: 'pompom' }, { itemId: 'scarf' }],
};
const festive: ComboDef = {
  id: 'festive', name: 'Festivo', reaction: 'spin', rewardItemId: 'gift2',
  requires: [{ slot: 'sweater', tag: 'navidad' }, { slot: 'head', tag: 'navidad' }],
};
const combos = [navidad, festive];

describe('findCompletedCombos', () => {
  it('finds nothing for an empty outfit', () => {
    expect(findCompletedCombos({}, combos, catalog)).toEqual([]);
  });

  it('matches by item id and by tag per slot', () => {
    const outfit = { sweater: 'xmas', head: 'pompom', neck: 'scarf' };
    expect(findCompletedCombos(outfit, combos, catalog).map((c) => c.id)).toEqual(['navidad', 'festive']);
  });

  it('does not match when a requirement is missing', () => {
    const outfit = { sweater: 'xmas', head: 'pompom' };
    expect(findCompletedCombos(outfit, combos, catalog).map((c) => c.id)).toEqual(['festive']);
  });

  it('does not match a tag in the wrong item', () => {
    expect(findCompletedCombos({ sweater: 'stripes', head: 'pompom' }, [festive], catalog)).toEqual([]);
  });

  it('never completes a combo with no requirements', () => {
    expect(findCompletedCombos({ sweater: 'xmas' }, [{ ...navidad, requires: [] }], catalog)).toEqual([]);
  });

  it('ignores equipped ids that are not in the catalog', () => {
    expect(findCompletedCombos({ sweater: 'ghost' }, combos, catalog)).toEqual([]);
  });
});

describe('newlyCompleted', () => {
  it('returns only combos completed by this change', () => {
    const prev = { sweater: 'xmas', head: 'pompom' };
    const next = { ...prev, neck: 'scarf' };
    expect(newlyCompleted(prev, next, combos, catalog).map((c) => c.id)).toEqual(['navidad']);
  });

  it('does not repeat combos that were already complete', () => {
    const outfit = { sweater: 'xmas', head: 'pompom' };
    expect(newlyCompleted(outfit, outfit, combos, catalog)).toEqual([]);
  });

  it('returns nothing when the change breaks a combo', () => {
    expect(newlyCompleted({ sweater: 'xmas', head: 'pompom' }, { sweater: 'xmas' }, combos, catalog)).toEqual([]);
  });
});

describe('unlockSecret', () => {
  it('unlocks a combo and reports the X/N counter', () => {
    const r = unlockSecret({ unlocked: [] }, 'navidad', combos);
    expect(r).toEqual({ state: { unlocked: ['navidad'] }, newlyUnlocked: true, count: 1, total: 2 });
  });

  it('does not unlock twice and keeps the state untouched', () => {
    const state = { unlocked: ['navidad'] };
    const r = unlockSecret(state, 'navidad', combos);
    expect(r.newlyUnlocked).toBe(false);
    expect(r.state).toBe(state);
    expect(r.count).toBe(1);
  });

  it('ignores unknown combo ids', () => {
    const r = unlockSecret({ unlocked: [] }, 'nope', combos);
    expect(r).toEqual({ state: { unlocked: [] }, newlyUnlocked: false, count: 0, total: 2 });
  });

  it('does not mutate the previous state', () => {
    const state = { unlocked: [] as string[] };
    unlockSecret(state, 'festive', combos);
    expect(state.unlocked).toEqual([]);
  });
});
