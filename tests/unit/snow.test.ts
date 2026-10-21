import { describe, expect, it } from 'vitest';
import { SNOW, snowSpan, snowReachesFloor, snowTotalMs } from '../../src/game/domain/snow';

describe('snow of the Navidad combo (F9, review of task 16)', () => {
  it('falls only inside the mirror (interior is the cat x +/- 214), not over the wallpaper', () => {
    const { min, max } = snowSpan(700);
    expect(min).toBeGreaterThanOrEqual(700 - 214);
    expect(max).toBeLessThanOrEqual(700 + 214);
    expect(max - min).toBeGreaterThan(300);
  });

  it('falls at 90 to 140 px/s and even the slowest flake reaches the rug before it fades', () => {
    expect(SNOW.speedY).toEqual({ min: 90, max: 140 });
    expect(snowReachesFloor(618)).toBe(true);
    expect(snowReachesFloor(5000)).toBe(false);
  });

  it('lives about 3 s and everything is over in 5 s or less', () => {
    expect(SNOW.lifespan).toBeGreaterThanOrEqual(2800);
    expect(SNOW.lifespan).toBeLessThanOrEqual(3200);
    expect(snowTotalMs()).toBeLessThanOrEqual(5000);
  });
});
