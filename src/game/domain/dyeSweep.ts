// Pure TS. The sweep of a new color over a worn item (F16.4, S4): the dyed copy is revealed from the bottom edge upward.
// Reduced motion has no mask: the new color just fades in over the old one (ADR 0013).
import type { Rect } from './types';

export interface SweepPlan {
  mode: 'sweep' | 'crossfade';
  ms: number;
}

export function sweepPlan(reduced: boolean): SweepPlan {
  return reduced ? { mode: 'crossfade', ms: 260 } : { mode: 'sweep', ms: 520 };
}

/** The part of the new texture (in its own px) that is visible at `t` (0..1): a band that grows from the bottom edge. */
export function sweepCrop(t: number, height: number, width: number): Rect {
  const k = Math.min(1, Math.max(0, t));
  const shown = height * k;
  return { x: 0, y: height - shown, width, height: shown };
}
