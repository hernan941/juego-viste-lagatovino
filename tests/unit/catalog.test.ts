import { describe, expect, it } from 'vitest';
import { itemsInCategory, visibleCategories } from '../../src/game/domain/catalog';
import type { ClothingDef } from '../../src/game/domain/types';

const item = (id: string, category: ClothingDef['category'], secret = false): ClothingDef => ({
  id, name: id, slot: category === 'sweater' ? 'sweater' : 'head', category, texture: id, icon: `${id}-icon`, tags: [], secret,
});
const catalog = [item('a', 'head'), item('b', 'sweater'), item('c', 'sweater'), item('s', 'neck', true)];

describe('visibleCategories', () => {
  it('lists the categories with visible items in the canonical tab order', () => {
    expect(visibleCategories(catalog)).toEqual(['sweater', 'head']);
  });

  it('hides categories that only hold secret items', () => {
    expect(visibleCategories([item('s', 'neck', true)])).toEqual([]);
  });
});

describe('itemsInCategory', () => {
  it('returns the visible items of a category in catalog order', () => {
    expect(itemsInCategory(catalog, 'sweater').map((c) => c.id)).toEqual(['b', 'c']);
    expect(itemsInCategory(catalog, 'neck')).toEqual([]);
  });
});
