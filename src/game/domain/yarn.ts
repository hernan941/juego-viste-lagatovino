// Pure TS, no Phaser (ADR 0010). The Preloader's ball of yarn: it rolls along and unwinds as the load progresses.
import type { Point } from './types';

export interface YarnOptions {
  x0: number;
  x1: number;
  /** Baseline of the thread. */
  y: number;
  /** Height of the waves of the thread. */
  amp: number;
  waves: number;
  /** Radius of the full ball. */
  radius: number;
  /** The ball ends at this fraction of its radius. */
  minRadiusRatio: number;
  segments: number;
}

export interface YarnState {
  ball: { x: number; y: number; radius: number; rotation: number };
  /** Thread from the start to the ball. */
  thread: Point[];
}

export function yarnState(progress: number, o: YarnOptions): YarnState {
  const p = Math.min(1, Math.max(0, progress));
  const span = o.x1 - o.x0;
  const wave = (x: number) => o.y + o.amp * Math.sin(o.waves * 2 * Math.PI * ((x - o.x0) / span));
  const x = o.x0 + span * p;
  const k = 1 - o.minRadiusRatio;
  // Rolling without slipping: the rotation is the distance covered divided by the (shrinking) radius.
  const rotation = (span / (o.radius * k)) * -Math.log(1 - k * p) + 0; // + 0 turns -0 into 0
  const n = Math.ceil(o.segments * p) + 1;
  const thread: Point[] =
    n === 1 ? [{ x, y: wave(x) }] : Array.from({ length: n }, (_, i) => {
      const tx = o.x0 + (x - o.x0) * (i / (n - 1));
      return { x: tx, y: wave(tx) };
    });
  return { ball: { x, y: wave(x), radius: o.radius * (1 - k * p), rotation }, thread };
}

/** Time constant (ms) of the easing of the bar: about what 12 % per frame gave at 60 fps. */
const EASE_TAU_MS = 130;
/** ... and once everything is loaded, so the ball does not make the player wait after the load. */
const FINISH_TAU_MS = 60;

/**
 * The progress the Preloader shows: it eases toward the real load progress (by time, so a slow machine does not stretch the
 * bar), but never faster than the clock allows (`minMs` for the whole bar, so a cached load does not flash by), and it never
 * goes back. 1 is reached exactly.
 */
export function shownProgress(shown: number, target: number, elapsedMs: number, minMs: number, deltaMs: number): number {
  const goal = Math.min(target, Math.min(1, elapsedMs / minMs));
  const next = Math.max(shown, shown + (goal - shown) * (1 - Math.exp(-deltaMs / (target >= 1 ? FINISH_TAU_MS : EASE_TAU_MS))));
  return goal === 1 && next > 0.995 ? 1 : next;
}
