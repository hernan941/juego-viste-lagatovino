// Pure TS, no Phaser (ADR 0010). The arc the buttons fly along: a quadratic Bezier with its control point lifted above the line.
import type { Point } from './types';

export function quadBezier(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** The control point of the arc of button `index`: above both ends, and each button leans a little differently (no chance involved). */
export function arcControl(from: Point, to: Point, index: number): Point {
  const lean = ((index * 37) % 11) - 5; // -5..5
  return { x: (from.x + to.x) / 2 + lean * 22, y: Math.min(from.y, to.y) - 140 - (index % 3) * 24 };
}
