import { describe, expect, it } from 'vitest';
import { flourishFor, shouldPurr } from '../../src/game/domain/pose';
import { idleLookOffset, nextFlickDelay, nextIdleLookDelay } from '../../src/game/domain/idle';
import { staggerDelays } from '../../src/game/domain/stagger';
import { showcaseTitle } from '../../src/game/domain/copy';
import { giftedFrom } from '../../src/game/domain/flow';

describe('shouldPurr (the Showcase purr must not tire: 2 times, then now and then)', () => {
  it('purrs on the first two in-love poses whatever the dice say', () => {
    expect(shouldPurr(0, () => 0.99)).toBe(true);
    expect(shouldPurr(1, () => 0.99)).toBe(true);
  });

  it('afterwards purrs one time in four', () => {
    expect(shouldPurr(2, () => 0.1)).toBe(true);
    expect(shouldPurr(2, () => 0.24)).toBe(true);
    expect(shouldPurr(2, () => 0.25)).toBe(false);
    expect(shouldPurr(9, () => 0.9)).toBe(false);
  });

  it('about a quarter of the later poses purr', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let n = 0;
    for (let i = 2; i < 2002; i++) if (shouldPurr(i, rng)) n++;
    expect(n / 2000).toBeGreaterThan(0.2);
    expect(n / 2000).toBeLessThan(0.3);
  });
});

describe('flourishFor (the pose is never mechanical: squash, a wag, or a glance aside)', () => {
  it('rotates through the three, so no two in a row are the same', () => {
    const seq = Array.from({ length: 9 }, (_, i) => flourishFor(i));
    expect(new Set(seq.slice(0, 3)).size).toBe(3);
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
    expect(seq.slice(0, 3)).toEqual(seq.slice(3, 6));
  });
});

describe('idle extras', () => {
  it('looks aside every 8 to 12 s', () => {
    expect(nextIdleLookDelay(0)).toBe(8000);
    expect(nextIdleLookDelay(0.5)).toBe(10_000);
    expect(nextIdleLookDelay(0.999)).toBeLessThan(12_000);
  });

  it('wags the tail by itself every 6 to 10 s', () => {
    expect(nextFlickDelay(0)).toBe(6000);
    expect(nextFlickDelay(0.5)).toBe(8000);
    expect(nextFlickDelay(0.999)).toBeLessThan(10_000);
  });

  it('the glance goes left or right, a few px', () => {
    expect(idleLookOffset(0.1, 5).x).toBe(-5);
    expect(idleLookOffset(0.9, 5).x).toBe(5);
    expect(idleLookOffset(0.1, 5).y).toBeGreaterThanOrEqual(0);
  });
});

describe('staggerDelays', () => {
  it('pops one layer every 80 ms by default', () => {
    expect(staggerDelays(4)).toEqual([0, 80, 160, 240]);
    expect(staggerDelays(3, 50)).toEqual([0, 50, 100]);
    expect(staggerDelays(0)).toEqual([]);
  });
});

describe('showcaseTitle (the plaque reads the look)', () => {
  it('praises a normal look', () => {
    for (const n of [1, 2, 3, 4]) expect(showcaseTitle('Luna', n)).toBe('¡Qué lindo look, Luna!');
    expect(showcaseTitle('Luna')).toBe('¡Qué lindo look, Luna!');
  });

  it('celebrates a cat with nothing on, as it is', () => {
    expect(showcaseTitle('Luna', 0)).toBe('¡Al natural, Luna!');
  });

  it('celebrates a very dressed cat (5 or 6 pieces)', () => {
    expect(showcaseTitle('Luna', 5)).toBe('¡Qué look tan completo, Luna!');
    expect(showcaseTitle('Luna', 6)).toBe('¡Qué look tan completo, Luna!');
  });
});

describe('giftedFrom (a prize that was delivered quietly when the player left the fitting room)', () => {
  it('reads the combo ids from the scene data', () => {
    expect(giftedFrom({ gifted: ['a', 'b'], transition: 'heart' })).toEqual(['a', 'b']);
  });

  it('is empty for anything else', () => {
    for (const d of [undefined, null, {}, { gifted: 'a' }, { gifted: [1] }, 5]) expect(giftedFrom(d)).toEqual([]);
    expect(giftedFrom({ gifted: ['a', 3, 'b'] })).toEqual(['a', 'b']);
  });
});
