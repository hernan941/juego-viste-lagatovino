// Pure helpers for the cat's idle life: blink timing and where the face looks.
import type { Point } from './types';

/** Time to the next blink: 3 to 5 seconds (art-direction.md section 8). `rand` in [0, 1). */
export function nextBlinkDelay(rand: number): number {
  return 3000 + rand * 2000;
}

/** Sometimes the cat blinks twice in a row. */
export function blinkCount(rand: number): 1 | 2 {
  return rand < 0.25 ? 2 : 1;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Offset of the face layer toward `target`: full `maxX`/`maxY` once the target is `range` px away. */
export function lookOffset(from: Point, target: Point, maxX: number, maxY: number, range: number): Point {
  return {
    x: clamp((target.x - from.x) / range, -1, 1) * maxX,
    y: clamp((target.y - from.y) / range, -1, 1) * maxY,
  };
}
