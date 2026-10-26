// Pure numbers of the Lagatovino UI kit (art-direction §6.3 and §8). No Phaser: the objects only apply what these return.

/** Smallest touch target of the kit, in game units (ADR 0014), whatever the drawing measures. */
export const KIT_MIN_HIT = 80;
/** How many px the selected index tab sticks out above the others. */
export const TAB_RISE = 10;

/** Press: scale 0.95 and 2 px down in 100 ms (it comes back with Back.easeOut). */
export function pressTarget(): { scale: number; dy: number; duration: number } {
  return { scale: 0.95, dy: 2, duration: 100 };
}

/** Hover (a mouse ornament): scale 1.04 and 1 degree, but no rotation with reduced motion. */
export function hoverTarget(reduced: boolean): { scale: number; angle: number } {
  return { scale: 1.04, angle: reduced ? 0 : 1 };
}

/** Hit area size: the drawing, but never below KIT_MIN_HIT. */
export function kitHitSize(width: number, height: number): { width: number; height: number } {
  return { width: Math.max(width, KIT_MIN_HIT), height: Math.max(height, KIT_MIN_HIT) };
}

/** x of each index tab and how far it rises (only the active one, `active` = -1 for none). */
export function tabLayout(count: number, active: number, size: number, gap: number): { x: number; rise: number }[] {
  return Array.from({ length: count }, (_, i) => ({ x: i * (size + gap), rise: i === active ? TAB_RISE : 0 }));
}
