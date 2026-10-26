// Pure TS, no Phaser (ADR 0010). A card or polaroid always leans the same way: the angle comes from its id, not from chance.
const MIN_DEG = 1;
const MAX_DEG = 8;

/** FNV-1a hash of the seed (32 bits, unsigned). */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Angle in degrees, between +-1 and +-`maxDeg` (8 by default; never straight), the same for the same seed. */
export function stableTilt(seed: string, maxDeg = MAX_DEG): number {
  const h = hash(seed);
  const magnitude = MIN_DEG + ((h >>> 1) % 1000) / 1000 * (maxDeg - MIN_DEG);
  return h & 1 ? magnitude : -magnitude;
}
