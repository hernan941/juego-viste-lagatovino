import { describe, expect, it } from 'vitest';
import { nextHint, pointsToNext } from '../../src/game/domain/nextHint';
import { judgeLines } from '../../src/game/domain/copy';
import type { CatDef, ClothingDef, RatingResult, Stars } from '../../src/game/domain/types';
import { rules } from './fixtures/economyRules';

const item = (id: string, slot: ClothingDef['slot'], tags: string[]): ClothingDef => ({
  id, name: id, slot, category: slot === 'sweater' ? 'sweater' : 'head', texture: id, icon: id, tags,
});
const catalog = [item('xmas', 'sweater', ['lana', 'invierno']), item('crown', 'head', ['gala']), item('star-hat', 'head', ['estrellas'])];
const cat: CatDef = {
  id: 'c', name: 'C', coat: 'x', texture: 'c',
  prefs: { loves: ['estrellas', 'invierno'], dislikes: ['tierno'], favoriteItem: 'nope', favoriteDye: 'lapiz', hint: '' },
};
const rated = (points: number, stars: Stars): RatingResult => ({ points, stars, breakdown: [] });

describe('pointsToNext (A4)', () => {
  it('counts the points left for the next star (thresholds 3, 6, 10, 14)', () => {
    expect(pointsToNext(0, rules)).toBe(3);
    expect(pointsToNext(8, rules)).toBe(2);
    expect(pointsToNext(10, rules)).toBe(4);
    expect(pointsToNext(13, rules)).toBe(1);
  });
  it('is null with 5 stars: there is nothing left to chase', () => {
    expect(pointsToNext(14, rules)).toBeNull();
    expect(pointsToNext(40, rules)).toBeNull();
  });
});

describe('nextHint (A4)', () => {
  const found = ['love:estrellas', 'love:invierno'];
  it('gives a hint with 4 and with 3 stars, with how much is missing', () => {
    expect(nextHint(rated(12, 4), cat, [], { sweater: 'xmas' }, catalog, rules)).toEqual({ missing: 2 });
    expect(nextHint(rated(8, 3), cat, [], { sweater: 'xmas' }, catalog, rules)).toEqual({ missing: 2 });
  });
  it('gives none with 1-2 stars (the judge comforts) or with 5', () => {
    expect(nextHint(rated(4, 2), cat, found, {}, catalog, rules)).toBeNull();
    expect(nextHint(rated(2, 1), cat, found, {}, catalog, rules)).toBeNull();
    expect(nextHint(rated(15, 5), cat, found, {}, catalog, rules)).toBeNull();
  });
  it('names a taste the player already knows and did not use', () => {
    // The look wears invierno (the sweater) but no stars: the known love that was left out is estrellas.
    expect(nextHint(rated(12, 4), cat, found, { sweater: 'xmas' }, catalog, rules)).toEqual({ missing: 2, love: 'estrellas' });
  });
  it('does not name a taste that was not discovered yet, nor one that is already worn', () => {
    expect(nextHint(rated(12, 4), cat, ['love:invierno'], { sweater: 'xmas' }, catalog, rules)).toEqual({ missing: 2 });
    expect(nextHint(rated(12, 4), cat, found, { sweater: 'xmas', head: 'star-hat' }, catalog, rules)).toEqual({ missing: 2 });
  });
  it('works for a cat without tastes', () => {
    expect(nextHint(rated(12, 4), { ...cat, prefs: undefined }, found, {}, catalog, rules)).toEqual({ missing: 2 });
  });
});

describe('the judge says the hint (A4)', () => {
  const judge = judgeLines({ name: 'Kofi' });
  const tags = { estrellas: { label: 'estrellas', love: 'las estrellas', style: 'Todo con estrellas' } };
  it('names the taste when there is one', () => {
    expect(judge.hint('Mau', { missing: 2, love: 'estrellas' }, tags)).toBe('Te faltaron 2 puntitos… ¿y si pruebas con las estrellas?');
  });
  it('asks what the cat loves when no taste is known', () => {
    expect(judge.hint('Mau', { missing: 2 })).toBe('Te faltaron 2 puntitos… ¿qué le encantará a Mau?');
  });
  it('says "puntito" for one', () => {
    expect(judge.hint('Mau', { missing: 1 })).toBe('Te faltó 1 puntito… ¿qué le encantará a Mau?');
  });
  it('is added after the verdict of 3 and 4 stars, but a repeated look keeps only its own line', () => {
    const hint = { missing: 2, love: 'estrellas' };
    expect(judge.say({ catName: 'Mau', stars: 4, hint, tags })).toBe(`${judge.verdict('Mau', 4)}\n${judge.hint('Mau', hint, tags)}`);
    expect(judge.say({ catName: 'Mau', stars: 4, novelty: 0, hint, tags })).toBe(judge.repeated());
    expect(judge.say({ catName: 'Mau', stars: 5 })).toBe(judge.verdict('Mau', 5));
  });
});
