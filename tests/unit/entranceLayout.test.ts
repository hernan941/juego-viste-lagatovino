import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH } from '../../src/game/constants';
import { ENTRANCE_BUTTONS, ENTRANCE_SHOP, shopPartRects, stampRect } from '../../src/game/systems/entranceLayout';
import { rectsOverlap } from '../../src/game/systems/runwayLayout';

describe('shop entrance layout (F20.R)', () => {
  const { plaque, cornice } = shopPartRects(ENTRANCE_SHOP);

  it('the sound and motion stamps never touch the sign plaque nor the cornice', () => {
    for (const at of Object.values(ENTRANCE_BUTTONS)) {
      expect(rectsOverlap(stampRect(at), plaque)).toBe(false);
      expect(rectsOverlap(stampRect(at), cornice)).toBe(false);
    }
  });

  it('the stamps do not touch each other and stay inside the canvas', () => {
    const [a, b] = Object.values(ENTRANCE_BUTTONS).map(stampRect);
    expect(rectsOverlap(a, b)).toBe(false);
    for (const r of [a, b]) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(GAME_WIDTH);
      expect(r.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('the facade stays inside the canvas and keeps its feet on the street', () => {
    expect(cornice.x).toBeGreaterThanOrEqual(0);
    expect(cornice.x + cornice.width).toBeLessThanOrEqual(GAME_WIDTH);
    expect(ENTRANCE_SHOP.y + 520 * ENTRANCE_SHOP.scale).toBeLessThanOrEqual(GAME_HEIGHT);
  });
});
