// Geometry of the rainbow of the combo (F9): an elliptical arch that goes over the cat's head, inside the mirror.
import type { Point } from './types';

export const RAINBOW = {
  /** Outer radii of the ellipse: 205 wide (the glass is 428 wide) and 470 tall, so the top reaches the ears and not over the name sign. */
  rx: 205,
  ry: 470,
  /** Y of the feet of the arch (the rug). */
  cy: 600,
  band: 12,
  bands: 5,
};

/** Horizontal range of the arch for a cat at `catX`. */
export function rainbowSpan(catX: number): { min: number; max: number } {
  return { min: catX - RAINBOW.rx, max: catX + RAINBOW.rx };
}

/**
 * Points of the arch of band `index` (0 is the outermost): from the left foot over the top, up to `progress` (0 to 1) of
 * the way to the right foot. It is the upper half of an ellipse.
 */
export function rainbowPoints(catX: number, progress: number, index: number, steps = 48): Point[] {
  const rx = RAINBOW.rx - RAINBOW.band * (index + 0.5);
  const ry = RAINBOW.ry - RAINBOW.band * (index + 0.5);
  const n = Math.max(1, Math.round(steps * progress));
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = Math.PI + (Math.PI * progress * k) / n;
    return { x: catX + Math.cos(a) * rx, y: RAINBOW.cy + Math.sin(a) * ry };
  });
}
