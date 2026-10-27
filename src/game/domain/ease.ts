// Pure TS, no Phaser (ADR 0010). The few easing curves that a plan "as a function of time" needs (the ones of Phaser, for a progress
// 0..1 that is clamped): the transformation of the keychain reads them without a tween, so skipping it is just asking for the end.

export const clamp01 = (p: number): number => (p < 0 ? 0 : p > 1 ? 1 : p);

export const sineOut = (p: number): number => Math.sin((clamp01(p) * Math.PI) / 2);

export const sineInOut = (p: number): number => (1 - Math.cos(Math.PI * clamp01(p))) / 2;

/** Pulls back a little before it goes (Phaser `Back.easeIn`). */
export function backIn(p: number): number {
  const x = clamp01(p);
  const c1 = 1.70158;
  return (c1 + 1) * x * x * x - c1 * x * x;
}

/** Falls and bounces to rest, never above 1 (Phaser `Bounce.easeOut`). */
export function bounceOut(p: number): number {
  const x = clamp01(p);
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x - 1.5 / d) * (x - 1.5 / d) + 0.75;
  if (x < 2.5 / d) return n * (x - 2.25 / d) * (x - 2.25 / d) + 0.9375;
  return n * (x - 2.625 / d) * (x - 2.625 / d) + 0.984375;
}
