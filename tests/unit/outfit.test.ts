import { describe, expect, it } from 'vitest';
import { equip, getLayers, isEquipped, unequip } from '../../src/game/domain/outfit';
import type { ClothingDef } from '../../src/game/domain/types';

const item = (id: string, slot: ClothingDef['slot'], category: ClothingDef['category'] = 'sweater'): ClothingDef => ({
  id, name: id, slot, category, texture: id, icon: `${id}-icon`, tags: [],
});
const stripes = item('stripes', 'sweater');
const xmas = item('xmas', 'sweater');
const beanie = item('beanie', 'head', 'head');
const scarf = item('scarf', 'neck', 'neck');
const catalog = [stripes, xmas, beanie, scarf];

describe('equip', () => {
  it('puts an item in its slot without replacing anything', () => {
    const { outfit, replaced } = equip({}, stripes);
    expect(outfit).toEqual({ sweater: 'stripes' });
    expect(replaced).toBeNull();
  });

  it('replaces the previous item of the same slot and reports it', () => {
    const { outfit, replaced } = equip({ sweater: 'stripes' }, xmas);
    expect(outfit).toEqual({ sweater: 'xmas' });
    expect(replaced).toBe('stripes');
  });

  it('is immutable', () => {
    const before = Object.freeze({ sweater: 'stripes' });
    const { outfit } = equip(before, beanie);
    expect(outfit).not.toBe(before);
    expect(before).toEqual({ sweater: 'stripes' });
    expect(outfit).toEqual({ sweater: 'stripes', head: 'beanie' });
  });

  it('equipping the same item again reports no replacement', () => {
    expect(equip({ sweater: 'stripes' }, stripes).replaced).toBeNull();
  });
});

describe('unequip', () => {
  it('removes the slot and returns a new outfit', () => {
    const before = { sweater: 'stripes', head: 'beanie' };
    const after = unequip(before, 'head');
    expect(after).toEqual({ sweater: 'stripes' });
    expect(before).toEqual({ sweater: 'stripes', head: 'beanie' });
  });

  it('is a no-op on an empty slot', () => {
    expect(unequip({ sweater: 'stripes' }, 'neck')).toEqual({ sweater: 'stripes' });
  });
});

describe('isEquipped', () => {
  it('tells whether an item is currently worn', () => {
    expect(isEquipped({ sweater: 'stripes' }, 'stripes')).toBe(true);
    expect(isEquipped({ sweater: 'stripes' }, 'xmas')).toBe(false);
    expect(isEquipped({}, 'stripes')).toBe(false);
  });
});

describe('getLayers', () => {
  it('returns the worn items ordered back to front by slot z index', () => {
    const layers = getLayers({ head: 'beanie', neck: 'scarf', sweater: 'stripes' }, catalog);
    expect(layers.map((l) => l.id)).toEqual(['stripes', 'scarf', 'beanie']);
  });

  it('returns an empty list for an empty outfit', () => {
    expect(getLayers({}, catalog)).toEqual([]);
  });

  it('ignores ids that are not in the catalog', () => {
    expect(getLayers({ sweater: 'ghost', head: 'beanie' }, catalog).map((l) => l.id)).toEqual(['beanie']);
  });
});
