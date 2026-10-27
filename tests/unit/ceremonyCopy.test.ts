import { describe, expect, it } from 'vitest';
import { eventNote, formatPoints, noveltyNote, ratingLineText } from '../../src/game/domain/copy';
import tags from '../../src/game/data/tags.json';
import type { TagNames } from '../../src/game/domain/types';
import type { CeremonyEvent } from '../../src/game/domain/ceremony';

const names = tags as TagNames;

describe('formatPoints', () => {
  it('signs every number and uses the real minus', () => {
    expect(formatPoints(3)).toBe('+3');
    expect(formatPoints(-3)).toBe('−3');
    expect(formatPoints(0)).toBe('0');
  });
});

describe('ratingLineText (F15.3)', () => {
  it('says each kind of line in Spanish and names the tag', () => {
    expect(ratingLineText({ kind: 'style', points: 2, ref: 'clasico' }, undefined, names)).toBe('Todo muy de siempre');
    expect(ratingLineText({ kind: 'love', points: 2, ref: 'invierno' }, undefined, names)).toBe('Le encanta el invierno');
    expect(ratingLineText({ kind: 'dislike', points: -3, ref: 'gala' }, undefined, names)).toBe('No le tinca la ropa de gala');
    expect(ratingLineText({ kind: 'style', points: 2, ref: 'lana' }, undefined, names)).toBe('Todo de lana');
    expect(ratingLineText({ kind: 'complete', points: 2 })).toMatch(/completo/i);
    expect(ratingLineText({ kind: 'favoriteItem', points: 2 })).toMatch(/favorit/i);
    expect(ratingLineText({ kind: 'favoriteDye', points: 1 })).toMatch(/color/i);
  });
  it('never leaves the card blank: a bare cat is "Al natural" and a plain look is "Sin combinar"', () => {
    expect(ratingLineText({ kind: 'bare', points: 0 })).toBe('Al natural');
    expect(ratingLineText({ kind: 'plain', points: 0 })).toBe('Sin combinar');
  });
  it('uses the name of the combo when it is given, and the id otherwise', () => {
    expect(ratingLineText({ kind: 'combo', points: 3, ref: 'navidad' }, (id) => `Look ${id}!`)).toContain('Look navidad!');
    expect(ratingLineText({ kind: 'combo', points: 3, ref: 'navidad' })).toContain('navidad');
  });
  it('does not break without a ref', () => {
    expect(ratingLineText({ kind: 'style', points: 1 })).not.toContain('undefined');
  });
});

describe('noveltyNote (A3)', () => {
  it('explains the small payout of a repeated or near look, and says nothing for a new one', () => {
    expect(noveltyNote(0, 2)).toBe('Propina +2');
    expect(noveltyNote(1, 7)).toBe('Casi igual +7');
    expect(noveltyNote(2, 20)).toBeUndefined();
  });
});

describe('eventNote', () => {
  const notes: CeremonyEvent[] = [
    { type: 'milestone', stars: 5, amount: 50 },
    { type: 'tasteFound', taste: 'favorite', amount: 15 },
    { type: 'tasteFound', taste: 'love:gala', amount: 15 },
    { type: 'tasteFound', taste: 'dislike:gala', amount: 15 },
    { type: 'tasteFound', taste: 'color', amount: 15 },
    { type: 'comboFirst', comboId: 'navidad', amount: 40 },
    { type: 'setCompleted', setId: 'navidad' },
    { type: 'unlock', ids: ['a', 'b'] },
  ];
  it('gives every event a title, an icon and the reward when it pays', () => {
    for (const e of notes) {
      const n = eventNote(e);
      expect(n.title.length).toBeGreaterThan(3);
      expect(n.icon.length).toBeGreaterThan(0);
      expect(n.title).not.toContain('undefined');
      expect(n.reward).toBe('amount' in e ? `+${e.amount}` : undefined);
    }
  });
  it('mentions the stars of a record and the tag of a taste', () => {
    expect(eventNote(notes[0]!).title).toContain('5');
    expect(eventNote(notes[2]!, names).title).toBe('Le encanta la ropa de gala');
    expect(eventNote(notes[3]!, names).title).toBe('No le tinca la ropa de gala');
  });
});
