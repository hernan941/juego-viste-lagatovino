import { describe, expect, it } from 'vitest';
import {
  COMBO_REACTIONS, almostCombos, comboOutfit, comboReactionPlan, findCompletedCombos, newlyCompleted, secretRewards, unlockSecret,
} from '../../src/game/domain/combos';
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

describe('comboOutfit (a visible outfit that completes the combo)', () => {
  const hidden = { ...item('crown', 'head', ['navidad']), secret: true };
  const all = [...catalog, hidden];

  it('picks the first visible item for each requirement', () => {
    expect(comboOutfit(navidad, all)).toEqual({ sweater: 'xmas', head: 'pompom', neck: 'scarf' });
    expect(comboOutfit(festive, all)).toEqual({ sweater: 'xmas', head: 'pompom' });
  });

  it('never uses secret items, even when they carry the tag', () => {
    const onlySecret: ComboDef = { ...festive, requires: [{ slot: 'head', tag: 'navidad' }] };
    expect(comboOutfit(onlySecret, [hidden])).toBeNull();
  });

  it('shares one item between requirements of the same slot, or fails', () => {
    const same: ComboDef = { ...festive, requires: [{ itemId: 'xmas' }, { slot: 'sweater', tag: 'navidad' }] };
    expect(comboOutfit(same, all)).toEqual({ sweater: 'xmas' });
    const clash: ComboDef = { ...festive, requires: [{ itemId: 'stripes' }, { slot: 'sweater', tag: 'navidad' }] };
    expect(comboOutfit(clash, all)).toBeNull();
  });

  it('is null when a required item or tag does not exist', () => {
    expect(comboOutfit({ ...festive, requires: [{ itemId: 'ghost' }] }, all)).toBeNull();
    expect(comboOutfit({ ...festive, requires: [{ slot: 'neck', tag: 'nope' }] }, all)).toBeNull();
  });

  it('the outfit it returns completes the combo', () => {
    for (const c of combos) expect(findCompletedCombos(comboOutfit(c, all)!, [c], all)).toEqual([c]);
  });
});

describe('almostCombos (the "¡casi!" hint)', () => {
  it('reports combos with exactly one missing requirement and at least two met', () => {
    expect(almostCombos({ sweater: 'xmas', head: 'pompom' }, [navidad], catalog, []).map((c) => c.id)).toEqual(['navidad']);
  });

  it('stays quiet with fewer than two pieces, with every piece, or with two missing', () => {
    expect(almostCombos({ sweater: 'xmas' }, [navidad], catalog, [])).toEqual([]);
    expect(almostCombos({ sweater: 'xmas', head: 'pompom', neck: 'scarf' }, [navidad], catalog, [])).toEqual([]);
    expect(almostCombos({ sweater: 'xmas', head: 'pompom' }, [{ ...navidad, requires: [...navidad.requires, { slot: 'face', tag: 'x' }] }], catalog, [])).toEqual([]);
  });

  it('does not hint combos whose gift is already unlocked', () => {
    expect(almostCombos({ sweater: 'xmas', head: 'pompom' }, [navidad], catalog, ['navidad'])).toEqual([]);
  });
});

describe('secretRewards', () => {
  it('maps unlocked combo ids to the item ids of their prizes', () => {
    expect([...secretRewards(['festive', 'ghost'], combos)]).toEqual(['gift2']);
    expect(secretRewards([], combos).size).toBe(0);
  });
});

describe('comboReactionPlan', () => {
  it('has a plan for every known reaction, always ending in love or joy', () => {
    for (const kind of COMBO_REACTIONS) {
      const plan = comboReactionPlan(kind);
      expect(['amor', 'feliz']).toContain(plan.expression);
      expect(plan.ms).toBeGreaterThanOrEqual(900);
    }
  });

  it('galactic starts surprised, heartbeat lasts 1.5 s, royal is happy', () => {
    expect(comboReactionPlan('stars-orbit').lead).toBe('sorpresa');
    expect(comboReactionPlan('heartbeat').ms).toBe(1500);
    expect(comboReactionPlan('royal-pose').expression).toBe('feliz');
  });

  it('falls back to a love face for an unknown reaction', () => {
    expect(comboReactionPlan('whatever')).toEqual({ expression: 'amor', ms: 1600 });
  });
});
