// Pure TS, no Phaser (ADR 0010). The garment in the player's hand leans with the speed of the drag, like swinging cloth.
export const TILT_MAX = 15;
const DEGREES_PER_PX = 0.8;
/** Share of the gap left after one 60 fps frame: the lerp factor is computed from the time, so it does not depend on the fps. */
const KEEP_PER_FRAME = 0.6;
const FRAME_MS = 1000 / 60;

/** Angle (degrees) the garment leans toward for a horizontal speed `dx` (px per frame). `strength` 0 keeps it straight. */
export function tiltTarget(dx: number, strength = 1): number {
  return Math.min(TILT_MAX, Math.max(-TILT_MAX, dx * DEGREES_PER_PX)) * strength;
}

/** The next angle: a frame-rate independent lerp (`k = 1 - 0.6^(delta / 16.67)`) toward the target of `dx`. */
export function tiltToward(current: number, dx: number, deltaMs: number, strength = 1): number {
  const k = 1 - Math.pow(KEEP_PER_FRAME, Math.max(0, deltaMs) / FRAME_MS);
  return current + (tiltTarget(dx, strength) - current) * k;
}
