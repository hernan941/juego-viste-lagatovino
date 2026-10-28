import { describe, expect, it } from 'vitest';
import { captionSize, groupRewardNotes } from '../../src/game/domain/rewardNotes';
import type { CeremonyEvent } from '../../src/game/domain/ceremony';

const milestones: CeremonyEvent[] = [
  { type: 'milestone', stars: 3, amount: 15 },
  { type: 'milestone', stars: 4, amount: 25 },
  { type: 'milestone', stars: 5, amount: 50 },
];

describe('groupRewardNotes', () => {
  it('returns nothing for no events', () => {
    expect(groupRewardNotes([])).toEqual([]);
  });

  it('keeps a lone event as its own note', () => {
    const [note] = groupRewardNotes([{ type: 'comboFirst', comboId: 'navidad', amount: 40 }]);
    expect(note).toMatchObject({ title: 'Primer combo!', reward: '+40' });
    expect(note?.stack).toBeUndefined();
  });

  it('joins the star milestones in one note: the highest title and the sum of the buttons', () => {
    const notes = groupRewardNotes(milestones);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ icon: '★', title: 'Primeras 5 estrellas!', reward: '+90' });
  });

  it('joins the completed sets and the unlocks', () => {
    const notes = groupRewardNotes([
      { type: 'setCompleted', setId: 'a' }, { type: 'setCompleted', setId: 'b' },
      { type: 'unlock', ids: ['x'] }, { type: 'unlock', ids: ['y', 'z'] },
    ]);
    expect(notes.map((n) => n.title)).toEqual(['Novedades!', '2 sets completos!']);
    expect(notes.every((n) => n.reward === undefined)).toBe(true);
  });

  it('orders by priority: secrets and combos, then news, sets and milestones', () => {
    const notes = groupRewardNotes([
      ...milestones, { type: 'setCompleted', setId: 'a' }, { type: 'unlock', ids: ['x'] },
      { type: 'tasteFound', taste: 'favorite', amount: 15 },
    ], 4);
    expect(notes.map((n) => n.icon)).toEqual(['♥', '✿', '✦', '★']);
  });

  it('shows at most 3 notes and turns the 3rd into a stack with the rest', () => {
    const events: CeremonyEvent[] = [
      { type: 'tasteFound', taste: 'favorite', amount: 15 },
      { type: 'tasteFound', taste: 'color', amount: 15 },
      { type: 'comboFirst', comboId: 'navidad', amount: 40 },
      { type: 'unlock', ids: ['x'] },
      { type: 'setCompleted', setId: 'a' },
      ...milestones,
    ];
    const notes = groupRewardNotes(events);
    expect(notes).toHaveLength(3);
    expect(notes[2]).toMatchObject({ stack: 4, title: '+4 mas en tu album', reward: '+130' });
    expect(notes[0]?.stack).toBeUndefined();
  });

  it('never loses a button: the rewards of every note add up to the events', () => {
    const events: CeremonyEvent[] = [
      ...milestones, { type: 'tasteFound', taste: 'favorite', amount: 15 },
      { type: 'tasteFound', taste: 'color', amount: 15 }, { type: 'comboFirst', comboId: 'c', amount: 40 },
    ];
    const sum = groupRewardNotes(events).reduce((n, note) => n + Number(note.reward?.slice(1) ?? 0), 0);
    expect(sum).toBe(15 + 25 + 50 + 15 + 15 + 40);
  });

  it('keeps every note when they fit', () => {
    expect(groupRewardNotes(milestones, 3)).toHaveLength(1);
    expect(groupRewardNotes([{ type: 'unlock', ids: ['x'] }, { type: 'setCompleted', setId: 'a' }])).toHaveLength(2);
  });
});

describe('captionSize', () => {
  it('writes short titles big (20 units or more once the note is scaled) and long ones smaller so they stay in two lines', () => {
    expect(captionSize('Set completo!', 0.8) * 0.8).toBeGreaterThanOrEqual(20);
    expect(captionSize('+4 mas en tu album', 0.8)).toBeLessThanOrEqual(captionSize('Novedades!', 0.8));
    expect(captionSize('Le encantan los gorros con orejas!', 0.8)).toBeLessThan(captionSize('Set completo!', 0.8));
    expect(captionSize('Set completo!', 1)).toBe(24);
  });
});
