// Pure TS, no Phaser (ADR 0010). Delays (ms) for things that pop in one after another.
export function staggerDelays(count: number, stepMs = 80): number[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => i * stepMs);
}
