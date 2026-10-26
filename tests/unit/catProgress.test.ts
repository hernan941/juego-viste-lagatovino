import { describe, expect, it } from 'vitest';
import { catTally } from '../../src/game/domain/catProgress';
import type { CatDef, Progress } from '../../src/game/domain/types';

const cat = { id: 'gato-01', name: 'Mau', prefs: { loves: ['a', 'b'], dislikes: ['c'] } } as unknown as CatDef;
const progress = (over: Partial<Progress> = {}): Progress => ({
  wallet: 0, owned: [], dyesOwned: [], secrets: [], tastesFound: {}, bestStars: {}, ratedLooks: {}, keychains: {}, albumSeen: [], ...over,
});

describe('catTally', () => {
  it('shows nothing without progress', () => {
    expect(catTally(cat, undefined)).toEqual({ stars: null, tastes: null });
  });

  it('counts the tastes found out of all the cat can reveal (loves, dislikes, favorite, color)', () => {
    const t = catTally(cat, progress({ tastesFound: { 'gato-01': ['love:a', 'favorite'] } }));
    expect(t.tastes).toEqual({ found: 2, total: 5, label: '♥ 2/5' });
  });

  it('shows 0 of the total for a cat nobody has dressed yet', () => {
    expect(catTally(cat, progress()).tastes?.label).toBe('♥ 0/5');
  });

  it('gives the best stars of that cat only', () => {
    expect(catTally(cat, progress({ bestStars: { 'gato-01': 4, 'gato-02': 5 } })).stars).toBe(4);
    expect(catTally(cat, progress({ bestStars: { 'gato-02': 5 } })).stars).toBeNull();
  });

  it('shows no hearts for a cat without tastes', () => {
    expect(catTally({ id: 'x', name: 'X' } as unknown as CatDef, progress()).tastes).toBeNull();
  });
});
