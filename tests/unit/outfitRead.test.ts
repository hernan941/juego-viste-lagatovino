import { describe, expect, it } from 'vitest';
import { readOutfit, readingFeel } from '../../src/game/domain/tastes';
import type { CatDef, ClothingDef } from '../../src/game/domain/types';

const item = (id: string, slot: ClothingDef['slot'], tags: string[]): ClothingDef => ({
  id, name: id, slot, category: slot === 'sweater' ? 'sweater' : 'head', texture: id, icon: id, tags,
});
const catalog = [
  item('fav', 'sweater', []),
  item('stars', 'head', ['estrellas']),
  item('fruit', 'neck', ['frutal']),
  item('plain', 'face', ['clasico']),
  item('paws', 'paws', ['clasico']),
];
const cat: CatDef = {
  id: 'luna', name: 'Luna', coat: 'gris', texture: 'luna',
  prefs: { loves: ['estrellas'], dislikes: ['frutal'], favoriteItem: 'fav', favoriteDye: 'lila', hint: '' },
};

describe('readOutfit', () => {
  it('has one read per worn item, in slot order, 80 ms apart', () => {
    const reads = readOutfit({ head: 'stars', sweater: 'fav', neck: 'fruit' }, {}, cat, catalog);
    expect(reads.map((r) => r.item.id)).toEqual(['fav', 'fruit', 'stars']);
    expect(reads.map((r) => r.delay)).toEqual([0, 80, 160]);
  });

  it('tells what the cat feels about each one', () => {
    const reads = readOutfit({ head: 'stars', sweater: 'fav', neck: 'fruit', face: 'plain' }, {}, cat, catalog);
    expect(reads.map((r) => r.reaction.kind)).toEqual(['favorite', 'dislike', 'love', 'neutral']);
    expect(reads[1].reaction).toEqual({ kind: 'dislike', tag: 'frutal' });
  });

  it('the dye on an item counts (the favorite color)', () => {
    const reads = readOutfit({ face: 'plain' }, { plain: 'lila' }, cat, catalog);
    expect(reads[0].reaction.kind).toBe('color');
  });

  it('never reads a combo: the combos have their own reaction', () => {
    const reads = readOutfit({ sweater: 'fav', head: 'stars' }, {}, cat, catalog);
    expect(reads.some((r) => r.reaction.kind === 'combo')).toBe(false);
  });

  it('ignores ids that are not in the catalog, and an empty outfit reads nothing', () => {
    expect(readOutfit({ head: 'ghost' }, {}, cat, catalog)).toEqual([]);
    expect(readOutfit({}, {}, cat, catalog)).toEqual([]);
  });

  it('a cat with no tastes feels nothing about everything', () => {
    const bare: CatDef = { id: 'x', name: 'X', coat: 'c', texture: 'x' };
    const reads = readOutfit({ head: 'stars', sweater: 'fav' }, {}, bare, catalog);
    expect(reads.map((r) => r.reaction.kind)).toEqual(['neutral', 'neutral']);
  });

  it('the step can change', () => {
    const reads = readOutfit({ head: 'stars', sweater: 'fav' }, {}, cat, catalog, 50);
    expect(reads.map((r) => r.delay)).toEqual([0, 50]);
  });
});

describe('readingFeel', () => {
  const kinds = (...k: string[]) => k.map((kind) => ({ kind })) as never;

  it('is nothing when every item is neutral or there are none', () => {
    expect(readingFeel(kinds())).toBeNull();
    expect(readingFeel(kinds('neutral', 'neutral'))).toBeNull();
  });

  it('a favorite wins: it is the star of the look', () => {
    expect(readingFeel(kinds('dislike', 'favorite', 'dislike'))).toBe('favorite');
  });

  it('loves and colors against dislikes: the bigger side wins, a tie is a happy one', () => {
    expect(readingFeel(kinds('love', 'love', 'dislike'))).toBe('love');
    expect(readingFeel(kinds('love', 'dislike', 'dislike'))).toBe('dislike');
    expect(readingFeel(kinds('love', 'dislike'))).toBe('love');
  });

  it('only dislikes is a dislike; only a color is a color', () => {
    expect(readingFeel(kinds('dislike', 'neutral'))).toBe('dislike');
    expect(readingFeel(kinds('color'))).toBe('color');
  });
});
