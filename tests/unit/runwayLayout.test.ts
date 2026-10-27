import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH } from '../../src/game/constants';
import { RUNWAY_EXITS, RUNWAY_JUDGE_CARD, rectsOverlap, runwayStage } from '../../src/game/systems/runwayLayout';

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
