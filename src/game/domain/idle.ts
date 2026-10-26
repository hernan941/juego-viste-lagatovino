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

/** The cat glances aside every 8 to 12 s. `rand` in [0, 1). */
export function nextIdleLookDelay(rand: number): number {
  return 8000 + rand * 4000;
}

/** A spontaneous tail wag every 6 to 10 s, so the cat looks like it is thinking. `rand` in [0, 1). */
export function nextFlickDelay(rand: number): number {
  return 6000 + rand * 4000;
}

/** Where the face drifts when the cat glances aside: left or right by `px`. */
export function idleLookOffset(rand: number, px: number): Point {
  return { x: rand < 0.5 ? -px : px, y: 0 };
}

/** How long the face of affection stays: a slow blink, like the "I love you" of real cats (F12.R B1). */
export const AFFECTION_MS = 600;

/** The cat shows the happy face every 8 to 12 s while idle. `rand` in [0, 1). */
export function nextAffectionDelay(rand: number): number {
  return 8000 + rand * 4000;
}
