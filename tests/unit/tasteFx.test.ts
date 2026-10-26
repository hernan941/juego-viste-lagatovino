import { describe, expect, it } from 'vitest';
import { tasteLines } from '../../src/game/domain/copy';
import { TASTE_KINDS, tasteFxPlan } from '../../src/game/domain/tasteFx';

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
