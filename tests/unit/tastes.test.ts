import { describe, expect, it } from 'vitest';
import {
  TECHNICAL_TAGS, activeTastes, discoverTaste, tasteKeyOf, tasteKeys, tasteReaction,
} from '../../src/game/domain/tastes';
import type { CatDef, ClothingDef, ComboDef } from '../../src/game/domain/types';

const item = (id: string, tags: string[]): ClothingDef => ({
  id, name: id, slot: 'sweater', category: 'sweater', texture: id, icon: id, tags,
});
const cat: CatDef = {
  id: 'luna', name: 'Luna', coat: 'gris', texture: 'luna',
  prefs: { loves: ['estrellas', 'gala'], dislikes: ['frutal'], favoriteItem: 'fav', favoriteDye: 'lila', hint: 'De noche brilla más.' },
};
const combo: ComboDef = { id: 'c', name: 'C', requires: [], reaction: 'x', rewardItemId: 'y' };

describe('tasteReaction', () => {
  it('is neutral for an item with no matching tag', () => {
    expect(tasteReaction(item('a', ['clasico']), undefined, cat)).toEqual({ kind: 'neutral' });
  });

  it('is neutral when the cat has no prefs', () => {
    const bare: CatDef = { id: 'x', name: 'X', coat: 'c', texture: 'x' };
    expect(tasteReaction(item('a', ['estrellas']), 'lila', bare)).toEqual({ kind: 'neutral' });
  });

  it('love carries the tag that matched', () => {
    expect(tasteReaction(item('a', ['x', 'gala']), undefined, cat)).toEqual({ kind: 'love', tag: 'gala' });
  });

  it('dislike carries the tag', () => {
    expect(tasteReaction(item('a', ['frutal']), undefined, cat)).toEqual({ kind: 'dislike', tag: 'frutal' });
  });

  it('the favorite item has no tag', () => {
    expect(tasteReaction(item('fav', []), undefined, cat)).toEqual({ kind: 'favorite' });
  });

  it('color only counts when the item is dyed with the favorite dye', () => {
    const plain = item('a', ['clasico']);
    expect(tasteReaction(plain, 'lila', cat)).toEqual({ kind: 'color' });
    expect(tasteReaction(plain, 'rosa', cat)).toEqual({ kind: 'neutral' });
    expect(tasteReaction(plain, undefined, cat)).toEqual({ kind: 'neutral' });
  });

  describe('priority combo > favorite > dislike > love > color > neutral', () => {
    const fav = item('fav', ['frutal', 'estrellas']);
    const mixed = item('m', ['frutal', 'estrellas']);

    it('combo beats everything', () => {
      expect(tasteReaction(fav, 'lila', cat, [combo])).toEqual({ kind: 'combo' });
    });

    it('an empty combo list does not count', () => {
      expect(tasteReaction(fav, undefined, cat, [])).toEqual({ kind: 'favorite' });
    });

    it('favorite beats dislike, love and color', () => {
      expect(tasteReaction(fav, 'lila', cat).kind).toBe('favorite');
    });

    it('dislike beats love', () => {
      expect(tasteReaction(mixed, undefined, cat)).toEqual({ kind: 'dislike', tag: 'frutal' });
    });

    it('love beats color', () => {
      expect(tasteReaction(item('a', ['gala']), 'lila', cat).kind).toBe('love');
    });
  });

  it('technical tags never match, even if a cat listed them', () => {
    const odd: CatDef = { ...cat, prefs: { ...cat.prefs!, loves: ['secreto', 'mece'], dislikes: ['secreto'] } };
    expect(TECHNICAL_TAGS).toEqual(['secreto', 'mece']);
    expect(tasteReaction(item('a', ['secreto', 'mece']), undefined, odd)).toEqual({ kind: 'neutral' });
  });
});

describe('activeTastes', () => {
  it('lists every taste the drop touches, in priority order', () => {
    const it1 = item('fav', ['frutal', 'estrellas']);
    expect(activeTastes(it1, 'lila', cat)).toEqual(['favorite', 'dislike:frutal', 'love:estrellas', 'color']);
  });

  it('is empty for neutral and for cats without prefs', () => {
    expect(activeTastes(item('a', []), undefined, cat)).toEqual([]);
    expect(activeTastes(item('a', ['gala']), undefined, { id: 'x', name: 'X', coat: 'c', texture: 'x' })).toEqual([]);
  });

  it('lists each matching love tag once', () => {
    expect(activeTastes(item('a', ['gala', 'estrellas', 'gala']), undefined, cat)).toEqual(['love:estrellas', 'love:gala']);
  });
});

describe('tasteKeyOf', () => {
  it('maps a reaction to the key stored in tastesFound', () => {
    expect(tasteKeyOf({ kind: 'love', tag: 'gala' })).toBe('love:gala');
    expect(tasteKeyOf({ kind: 'dislike', tag: 'frutal' })).toBe('dislike:frutal');
    expect(tasteKeyOf({ kind: 'favorite' })).toBe('favorite');
    expect(tasteKeyOf({ kind: 'color' })).toBe('color');
  });

  it('neutral and combo are not tastes', () => {
    expect(tasteKeyOf({ kind: 'neutral' })).toBeNull();
    expect(tasteKeyOf({ kind: 'combo' })).toBeNull();
  });
});

describe('tasteKeys', () => {
  it('has the 5 keys of a cat', () => {
    expect(tasteKeys(cat)).toEqual(['love:estrellas', 'love:gala', 'dislike:frutal', 'favorite', 'color']);
  });

  it('is empty without prefs', () => {
    expect(tasteKeys({ id: 'x', name: 'X', coat: 'c', texture: 'x' })).toEqual([]);
  });
});

describe('discoverTaste', () => {
  it('records a taste the first time, once', () => {
    const first = discoverTaste({}, 'luna', 'favorite');
    expect(first).toEqual({ found: { luna: ['favorite'] }, isNew: true });
    const again = discoverTaste(first.found, 'luna', 'favorite');
    expect(again.isNew).toBe(false);
    expect(again.found).toBe(first.found);
  });

  it('does not mutate the input and keeps other cats', () => {
    const found = { nieve: ['color'], luna: ['favorite'] };
    const res = discoverTaste(found, 'luna', 'color');
    expect(res.found).toEqual({ nieve: ['color'], luna: ['favorite', 'color'] });
    expect(found.luna).toEqual(['favorite']);
  });

  it('the same key is new for another cat', () => {
    expect(discoverTaste({ luna: ['favorite'] }, 'nieve', 'favorite').isNew).toBe(true);
  });
});
