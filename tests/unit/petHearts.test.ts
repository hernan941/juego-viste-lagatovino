import { describe, expect, it } from 'vitest';
import { DROP_BURST, PET_HEART_SIDE_PX, petHeartSpots } from '../../src/game/domain/petHearts';

describe('hearts of the pet and of the drop (F9, review of task 16)', () => {
  it('the pet hearts come out at the two sides of the head, outside the name sign that hangs over it', () => {
    const spots = petHeartSpots({ x: 700, y: 300 }, 3);
    expect(spots).toHaveLength(3);
    for (const s of spots) expect(Math.abs(s.x - 700)).toBeGreaterThanOrEqual(PET_HEART_SIDE_PX);
    expect(new Set(spots.map((s) => Math.sign(s.x - 700))).size).toBe(2); // both sides
    for (const s of spots) expect(s.y).toBeGreaterThanOrEqual(300 - 40); // not above the head, where the sign is
  });

  it('gives nothing for zero hearts (reduced motion can scale them down)', () => {
    expect(petHeartSpots({ x: 0, y: 0 }, 0)).toEqual([]);
  });

  it('the burst of a drop has more hearts than before (7) and some more sparkles', () => {
    expect(DROP_BURST.hearts).toBeGreaterThanOrEqual(10);
    expect(DROP_BURST.sparkles).toBeGreaterThanOrEqual(12);
  });
});
