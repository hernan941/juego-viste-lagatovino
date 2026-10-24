// Pure helpers for touch play (ADR 0014). No Phaser, no DOM: the scenes and objects only apply what these return.
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import type { Point } from '../domain/types';

/** Smallest comfortable touch target, in CSS px. */
export const MIN_TOUCH_CSS = 44;
/** How far above the finger the dragged garment is drawn, in CSS px, and the range it is kept in (game units). */
const LIFT_CSS = 64;
const LIFT_MIN = 60;
const LIFT_MAX = 160;
/** Finger jitter allowed before a press becomes a drag (CSS px), and the mouse threshold (game px). */
const FINGER_JITTER_CSS = 10;
const MOUSE_DRAG_THRESHOLD = 8;

/** Game units per CSS px when the 1280 x 720 canvas is fitted in landscape in a `w` x `h` window (orientation does not matter). */
export function landscapeScale(w: number, h: number): number {
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  return Math.max(0.05, Math.min(long / GAME_WIDTH, short / GAME_HEIGHT));
}

/** Size (game units) of a touch target whose drawing measures `visual`: at least 44 CSS px, never beyond `cap`. */
export function minHitExtent(visual: number, scale: number, cap = Infinity): number {
  return Math.max(visual, Math.min(MIN_TOUCH_CSS / scale, cap));
}

/** Offset of the dragged garment from the pointer: up and clear of the finger with touch, none with the mouse. */
export function liftOffset(touch: boolean, scale: number): Point {
  if (!touch) return { x: 0, y: 0 };
  return { x: 0, y: -Math.min(LIFT_MAX, Math.max(LIFT_MIN, LIFT_CSS / scale)) };
}

/** The lifted point, kept inside the canvas. */
export function applyLift(point: Point, lift: Point, bounds: { width: number; height: number }): Point {
  return {
    x: Math.min(bounds.width, Math.max(0, point.x + lift.x)),
    y: Math.min(bounds.height, Math.max(0, point.y + lift.y)),
  };
}

/** Distance (game px) a press must travel to become a drag. */
export function dragThreshold(touch: boolean, scale: number): number {
  return touch ? Math.max(MOUSE_DRAG_THRESHOLD, FINGER_JITTER_CSS / scale) : MOUSE_DRAG_THRESHOLD;
}

/** Only the pointer that grabbed the garment drives the drag: a second finger is ignored. */
export function isDragPointer(owner: number | null, pointerId: number): boolean {
  return owner !== null && owner === pointerId;
}

/** The "turn your phone" notice: a coarse pointer (a finger) held in portrait. A narrow desktop window never shows it. */
export function shouldShowRotateHint(env: { coarse: boolean; portrait: boolean }): boolean {
  return env.coarse && env.portrait;
}

/** The optional fullscreen button: a touch device whose browser has the Fullscreen API (not Safari on iPhone). */
export function shouldShowFullscreen(env: { touch: boolean; available: boolean }): boolean {
  return env.touch && env.available;
}
