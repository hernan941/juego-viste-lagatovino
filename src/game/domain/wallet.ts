// Pure TS, no Phaser (ADR 0010). The numbers behind the wallet HUD and the flying buttons (docs/design/segunda-etapa.md, S3):
// how the counter ticks, how many buttons fly, what each one credits and the curve it follows.
import { buttonCount, COIN_FLIGHT_MS, COIN_GAP_MS } from './ceremony';
import type { Point } from './types';

/** The counter never takes longer than this to reach its new value. */
export const COUNT_MAX_MS = 1200;
/** One tick per unit, at most this often. */
export const COUNT_TICK_MS = 40;

export interface CountPlan {
  /** Values the counter shows, one per tick, ending exactly on the target. */
  values: number[];
  stepMs: number;
}

/** The ticks from `from` to `to`: one per unit while it fits in 1.2 s, fewer (skipping numbers) when the jump is big. */
export function countSteps(from: number, to: number): CountPlan {
  const delta = to - from;
  if (delta === 0) return { values: [], stepMs: COUNT_TICK_MS };
  const maxSteps = Math.floor(COUNT_MAX_MS / COUNT_TICK_MS);
  const steps = Math.min(Math.abs(delta), maxSteps);
  const values = Array.from({ length: steps }, (_, i) => (i === steps - 1 ? to : from + Math.round((delta * (i + 1)) / steps)));
  return { values, stepMs: COUNT_TICK_MS };
}

/** Buttons drawn for a payout: one per 5 coins, 12 at most, 3 with reduced motion. */
export function flightButtons(coins: number, reduced: boolean): number {
  return buttonCount(coins, reduced ? 'reduced' : 'full');
}

/** Splits the coins among the buttons so the credits add up to the total (the last button takes the rest). */
export function splitCredits(coins: number, count: number): number[] {
  if (count <= 0) return [];
  const each = Math.floor(coins / count);
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? coins - each * (count - 1) : each));
}

export interface FlightButton {
  /** Delay from the start of the flight, in ms. */
  delay: number;
  ms: number;
  /** Coins this button adds to (or takes from) the counter when it lands (or leaves). */
  credit: number;
  /** Follows a bowed curve; with reduced motion it only fades in place. */
  arc: boolean;
}

export function flightPlan(coins: number, reduced: boolean): FlightButton[] {
  const count = flightButtons(coins, reduced);
  return splitCredits(coins, count).map((credit, i) => ({ delay: i * COIN_GAP_MS, ms: COIN_FLIGHT_MS, credit, arc: !reduced }));
}

/** The control point of a quadratic curve that bows `lift` px above the middle of the straight line. */
export function arcControl(from: Point, to: Point, lift: number): Point {
  return { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift };
}

/** Point of a quadratic Bezier at `t` (0..1). */
export function bezierPoint(from: Point, control: Point, to: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
  };
}
