import { describe, expect, it } from 'vitest';
import { tasteLines } from '../../src/game/domain/copy';
import { TASTE_KINDS, readFxPlan, tasteFxPlan } from '../../src/game/domain/tasteFx';

describe('tasteFxPlan', () => {
  it('has a plan for every kind of reaction', () => {
    for (const kind of TASTE_KINDS) expect(tasteFxPlan(kind)).toBeDefined();
  });

  it('love: amor for 900 ms, 3 extra hearts and a short purr', () => {
    expect(tasteFxPlan('love')).toMatchObject({ face: 'amor', ms: 900, hearts: 3, sound: 'purr', bubble: false });
  });

  it('dislike: the puaj face is the cat own (sayNo), a bubble and a low meow, no hearts', () => {
    expect(tasteFxPlan('dislike')).toMatchObject({ face: 'puaj', hearts: 0, sound: 'meowLow', bubble: true, sayNo: true });
  });

  it('favorite: amor for 1.5 s, golden sparkles and a long purr', () => {
    expect(tasteFxPlan('favorite')).toMatchObject({ face: 'amor', ms: 1500, sound: 'purrLong', sparks: 12, bubble: true });
  });

  it('color: the cat glances at the garment and says so', () => {
    expect(tasteFxPlan('color')).toMatchObject({ glance: true, bubble: true });
  });

  it('combo and neutral add nothing (the scene and the secrets already react)', () => {
    for (const kind of ['combo', 'neutral'] as const) {
      expect(tasteFxPlan(kind)).toMatchObject({ face: null, hearts: 0, sparks: 0, sound: null, bubble: false });
    }
  });

  it('every bubble has a line of text', () => {
    for (const kind of TASTE_KINDS) {
      if (tasteFxPlan(kind).bubble) expect(tasteLines.bubble(kind as 'dislike' | 'favorite' | 'color').length).toBeGreaterThan(0);
    }
  });
});

describe('readFxPlan (F14.5)', () => {
  it('has a plan for every kind of reaction', () => {
    for (const kind of TASTE_KINDS) expect(readFxPlan(kind)).toBeDefined();
  });

  it('is smaller than the reaction to a drop: a pop on the garment and a soft sound', () => {
    for (const kind of TASTE_KINDS) {
      const read = readFxPlan(kind);
      expect(read.hearts).toBeLessThanOrEqual(tasteFxPlan(kind).hearts);
      expect(read.sparks).toBeLessThanOrEqual(5);
      expect(read.volume).toBeLessThanOrEqual(0.6);
    }
  });

  it('love and the favorite throw hearts and purr; the favorite also sparkles', () => {
    expect(readFxPlan('love')).toMatchObject({ hearts: 1, sound: 'purr', mark: false });
    expect(readFxPlan('favorite').sparks).toBeGreaterThan(0);
    expect(readFxPlan('favorite').hearts).toBeGreaterThan(readFxPlan('love').hearts);
  });

  it('dislike marks the garment with a cross and a low meow, no hearts', () => {
    expect(readFxPlan('dislike')).toMatchObject({ hearts: 0, mark: true, sound: 'meowLow' });
  });

  it('color sparkles a little; combo and neutral add nothing', () => {
    expect(readFxPlan('color').sparks).toBeGreaterThan(0);
    for (const kind of ['combo', 'neutral'] as const) {
      expect(readFxPlan(kind)).toMatchObject({ hearts: 0, sparks: 0, mark: false, sound: null });
    }
  });
});
