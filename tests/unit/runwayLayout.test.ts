import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH } from '../../src/game/constants';
import { NOTES_BAND, NOTES_TOP_MARGIN, RUNWAY_EXITS, RUNWAY_JUDGE_CARD, RUNWAY_SECRETS_TAG, noteRowFit, noteRowRect, rectsOverlap, runwayStage } from '../../src/game/systems/runwayLayout';

describe('runway layout (F20.6)', () => {
  it('the judge card clears the corner buttons (sound, motion, fullscreen end at y 86)', () => {
    expect(RUNWAY_JUDGE_CARD.y).toBeGreaterThanOrEqual(86);
  });

  const stage = runwayStage(370, 616);

  it('the paper stage lies under the cat feet and inside the canvas', () => {
    expect(stage.y).toBeLessThanOrEqual(616);
    expect(stage.y + stage.height).toBeGreaterThan(616);
    expect(stage.x).toBeGreaterThanOrEqual(0);
    expect(stage.x + stage.width).toBeLessThanOrEqual(GAME_WIDTH);
    expect(stage.y + stage.height).toBeLessThanOrEqual(GAME_HEIGHT);
  });

  it('never covers the exit buttons nor the judge card', () => {
    for (const exit of RUNWAY_EXITS) {
      expect(rectsOverlap(stage, exit)).toBe(false);
      expect(exit.y + exit.height).toBeLessThanOrEqual(GAME_HEIGHT);
    }
    expect(rectsOverlap(stage, RUNWAY_JUDGE_CARD)).toBe(false);
  });

  it('the exits do not overlap each other', () => {
    RUNWAY_EXITS.forEach((a, i) => RUNWAY_EXITS.slice(i + 1).forEach((b) => expect(rectsOverlap(a, b)).toBe(false)));
  });
});

describe('the notes of the ceremony (F20.R)', () => {
  const counts = [1, 2, 3, 4, 5, 6, 7, 8, 10];

  it('shrink when there are many and fit the band, whatever the count', () => {
    for (const n of counts) {
      const row = noteRowRect(n);
      expect(row.x).toBeGreaterThanOrEqual(NOTES_BAND.x - 0.5);
      expect(row.x + row.width).toBeLessThanOrEqual(NOTES_BAND.x + NOTES_BAND.width + 0.5);
    }
    expect(noteRowFit(7).scale).toBeLessThan(noteRowFit(2).scale);
  });

  it('never cover the Secretos tag (not even while it pops), the judge card nor the top edge of the notebook', () => {
    for (const n of counts) {
      const row = noteRowRect(n);
      expect(rectsOverlap(row, RUNWAY_SECRETS_TAG)).toBe(false);
      expect(rectsOverlap(row, RUNWAY_JUDGE_CARD)).toBe(false);
      expect(row.y).toBeGreaterThanOrEqual(NOTES_TOP_MARGIN);
    }
  });

  it('are 3 at most, readable: 110 apart at least and overlapping 15% at most (second pass)', () => {
    for (const n of [2, 3]) {
      const { scale, step } = noteRowFit(n);
      const width = 161 * scale;
      expect(step).toBeGreaterThanOrEqual(110);
      expect((width - step) / width).toBeLessThanOrEqual(0.15);
    }
  });

  it('with 3 notes the captions are never covered by the next paper (the pile comes last)', () => {
    const { scale, step } = noteRowFit(3);
    const width = 161 * scale;
    expect((width - step) / width).toBeLessThanOrEqual(0.02);
  });

  it('keep the way out clear', () => {
    for (const exit of RUNWAY_EXITS) expect(rectsOverlap(noteRowRect(10), exit)).toBe(false);
  });
});
