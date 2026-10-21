// Pure TS, no Phaser (ADR 0010). Per pixel hit test of the worn items, on a small alpha map of their texture.
import type { Point } from './types';

export interface AlphaMap {
  width: number;
  height: number;
  /** Alpha 0..255, row by row. */
  data: ArrayLike<number>;
}

/** Pixels below this alpha count as empty (the antialiasing fringe). */
export const HIT_TOLERANCE = 32;

const alphaAt = (m: AlphaMap, x: number, y: number) =>
  x < 0 || y < 0 || x >= m.width || y >= m.height ? 0 : m.data[y * m.width + x];

/** True if the pixel (or any pixel within `reach` of it, a square) is visible. A reach helps thin shapes (pearls, chains). */
export function hitsAlpha(m: AlphaMap, x: number, y: number, tolerance = HIT_TOLERANCE, reach = 0): boolean {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      if (alphaAt(m, cx + dx, cy + dy) >= tolerance) return true;
    }
  }
  return false;
}

/**
 * A pixel of `own` that is solid and that no map of `covers` (items drawn above) reaches, the closest one
 * to the middle of the visible pixels. Null when the item cannot be seen.
 */
export function grabPoint(own: AlphaMap, covers: readonly AlphaMap[], { reach = 2 } = {}): Point | null {
  const solid: Point[] = [];
  for (let y = 0; y < own.height; y++) {
    for (let x = 0; x < own.width; x++) {
      if (alphaAt(own, x, y) >= 128 && !covers.some((c) => hitsAlpha(c, x, y, HIT_TOLERANCE, reach))) solid.push({ x, y });
    }
  }
  if (solid.length === 0) return null;
  const mid = solid.reduce((a, p) => ({ x: a.x + p.x / solid.length, y: a.y + p.y / solid.length }), { x: 0, y: 0 });
  return solid.reduce((best, p) => (Math.hypot(p.x - mid.x, p.y - mid.y) < Math.hypot(best.x - mid.x, best.y - mid.y) ? p : best));
}
