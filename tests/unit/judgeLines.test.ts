import { describe, expect, it } from 'vitest';
import { judgeLines } from '../../src/game/domain/copy';

const judge = judgeLines({ name: 'Kofi' });

describe('the judge lines per case (F15.6)', () => {
  it('has a different line for 1-2, 3, 4 and 5 stars', () => {
    const lines = [2, 3, 4, 5].map((s) => judge.verdict('Mau', s));
    expect(new Set(lines).size).toBe(4);
    expect(judge.verdict('Mau', 1)).toBe(judge.verdict('Mau', 2));
    expect(judge.verdict('Mau', 1)).toBe('¡Igual te ves adorable, Mau!');
    expect(judge.verdict('Mau', 4)).toBe('¡Uf, Mau! Casi perfecto…');
  });
  it('says the novelty cases', () => {
    expect(judge.repeated()).toBe('Este look ya me lo mostraste… ¡sorpréndeme!');
    expect(judge.nearSame()).toBe('Mmm, se parece harto al de recién');
    expect(judge.bare()).toBe('¿Y la ropa? ¡Igual te ves adorable!');
  });
  it('never guesses the gender of a cat with the @', () => {
    const all = [1, 2, 3, 4, 5].map((s) => judge.verdict('Mau', s)).concat(judge.repeated(), judge.nearSame(), judge.bare(), judge.comfort('Mau'));
    for (const t of all) expect(t).not.toContain('@');
    expect(judge.comfort('Mau')).not.toMatch(/tiern/);
  });
});
