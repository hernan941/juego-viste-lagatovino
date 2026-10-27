import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import dyes from '../../src/game/data/dyes.json';
import { catSheetEntries, catSheetHint, tasteChip, type NameLookup } from '../../src/game/domain/catSheet';
import { tasteKeys } from '../../src/game/domain/tastes';
import type { CatDef, ClothingDef, DyeDef } from '../../src/game/domain/types';

const catDefs = cats as unknown as CatDef[];
const names: NameLookup = {
  item: (id) => (clothes as unknown as ClothingDef[]).find((c) => c.id === id)?.name ?? id,
  dye: (id) => (dyes as unknown as DyeDef[]).find((d) => d.id === id)?.name ?? id,
};
const cat = catDefs.find((c) => c.id === 'naranja')!;

describe('tasteChip (F14.3)', () => {
  it('love: a heart and the tag', () => expect(tasteChip('love:estrellas', names)).toEqual({ kind: 'love', glyph: '♥', label: 'estrellas' }));
  it('dislike: a cross and the tag', () => expect(tasteChip('dislike:frutal', names)).toEqual({ kind: 'dislike', glyph: '✕', label: 'frutal' }));
  it('favorite: a star and the name of the item', () => {
    const chip = tasteChip('favorite', names, cat);
    expect(chip).toMatchObject({ kind: 'favorite', glyph: '★' });
    expect(chip.label).toBe(names.item(cat.prefs!.favoriteItem));
  });
  it('color: a dot and the name of the dye', () => {
    const chip = tasteChip('color', names, cat);
    expect(chip).toMatchObject({ kind: 'color', glyph: '●' });
    expect(chip.label).toBe(names.dye(cat.prefs!.favoriteDye));
  });
});

describe('catSheetEntries (F14.4)', () => {
  it('lists the five tastes of the cat, none found at the start', () => {
    const entries = catSheetEntries(cat, [], names);
    expect(entries.map((e) => e.key)).toEqual(tasteKeys(cat));
    expect(entries).toHaveLength(5);
    expect(entries.every((e) => !e.found)).toBe(true);
  });

  it('marks the found ones and keeps the order of the keys', () => {
    const found = ['favorite', tasteKeys(cat)[0]];
    const entries = catSheetEntries(cat, found, names);
    expect(entries.filter((e) => e.found).map((e) => e.key).sort()).toEqual([...found].sort());
  });

  it('an unknown key in the save is ignored', () => {
    expect(catSheetEntries(cat, ['love:nada-que-ver'], names).every((e) => !e.found)).toBe(true);
  });

  it('a cat without prefs has no entries', () => {
    expect(catSheetEntries({ ...cat, prefs: undefined }, [], names)).toEqual([]);
  });
});

describe('catSheetHint', () => {
  it('shows the hint of the cat while something is missing', () => {
    expect(catSheetHint(cat, [])).toBe(cat.prefs!.hint);
    expect(catSheetHint(cat, tasteKeys(cat).slice(1))).toBe(cat.prefs!.hint);
  });
  it('when the five are found, the cat says it knows you', () => {
    expect(catSheetHint(cat, tasteKeys(cat))).not.toBe(cat.prefs!.hint);
    expect(catSheetHint(cat, tasteKeys(cat))).toMatch(/conoces/i);
  });
});
