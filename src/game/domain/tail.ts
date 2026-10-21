// The tail is its own layer (F3): it sways in idle and flicks when an item is dropped.
// Pure data and math, no Phaser (ADR 0010).
import type { AnchorsDef, Point } from './types';

/**
 * Base of the tail in the 512 canvas: midpoint of the two ends of `tail-shape` where it meets the
 * body (350,462 and 354,430 in art/cats/base/silhouette.svg). Used when anchors.json has no `tailBase`.
 */
export const TAIL_BASE_FALLBACK: Point = { x: 352, y: 446 };

/** Idle sway: ±angle degrees, one way in `duration` ms (yoyo, endless). */
export const TAIL_IDLE = { angle: 4, duration: 1200, ease: 'Sine.easeInOut' } as const;

/** Flick when an item is dropped: snaps to ±angle and settles back with `ease` in `duration` ms. */
export const TAIL_FLICK = { angle: 8, duration: 420, ease: 'Back.easeOut' } as const;

/** Pivot of the tail layer: the canvas point and the image origin as a fraction of the canvas. */
export function tailPivot(anchors: Pick<AnchorsDef, 'canvas' | 'details'>): { point: Point; origin: Point } {
  const point = anchors.details.tailBase ?? TAIL_BASE_FALLBACK;
  return { point: { ...point }, origin: { x: point.x / anchors.canvas.width, y: point.y / anchors.canvas.height } };
}

/** The whip when an item is dropped is bigger than the base flick, and the spontaneous wag of the idle is softer. */
export const TAIL_FLICK_DROP = 12;
export const TAIL_FLICK_WAG = 6;

export interface FlickStep {
  angle: number;
  duration: number;
  ease: string;
}

/**
 * The flick as tween steps: snaps to one side (`angle` degrees), then the other, and settles on the angle where the sway
 * starts (-TAIL_IDLE.angle), so handing over to the sway does not make the tail jump. `swing` scales every angle: the
 * motion profile uses it to calm the tail (ADR 0013), and the sway scales with it so the hand-over still matches.
 */
export function flickSteps(angle: number, swing = 1): FlickStep[] {
  return [
    { angle: -angle * swing, duration: 70, ease: 'Quad.easeOut' },
    { angle: angle * swing, duration: 110, ease: 'Sine.easeInOut' },
    { angle: -TAIL_IDLE.angle * swing, duration: TAIL_FLICK.duration, ease: TAIL_FLICK.ease },
  ];
}

/** The base flick (8 degrees). */
export const TAIL_FLICK_STEPS = flickSteps(TAIL_FLICK.angle);
