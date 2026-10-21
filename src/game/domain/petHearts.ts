// Where the hearts of a pet come out, and how big the burst of a drop is (F9), apart from Phaser so it can be tested.
import type { Point } from './types';

/** Hearts of a pet start this far (px) from the middle of the head, to the sides: the name sign hangs over the middle. */
export const PET_HEART_SIDE_PX = 140;

/** The burst where an item lands (before the combo power multiplies it): a few more hearts and sparkles than the first version (7 and 9). */
export const DROP_BURST = { hearts: 10, sparkles: 12 };

/** `n` places for the hearts of a pet, alternating the left and the right side of the head. */
export function petHeartSpots(head: Point, n: number): Point[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => ({
    x: head.x + (i % 2 === 0 ? -1 : 1) * (PET_HEART_SIDE_PX + (i >> 1) * 14),
    y: head.y - 10 - (i >> 1) * 18,
  }));
}
