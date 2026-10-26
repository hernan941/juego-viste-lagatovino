// Pure TS, no Phaser (ADR 0010). Used to build the drag ghost of an item from its own texture.
import type { AlphaMap } from './pixelHit';
import type { Point, Rect } from './types';

/** Pixels with less alpha than this are treated as empty (anti-aliasing fringes). */
const ALPHA_THRESHOLD = 16;

/** Bounding box of the visible pixels of an RGBA buffer, or null when it is empty. */
export function alphaBounds(rgba: ArrayLike<number>, width: number, height: number): Rect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] < ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * How to show a canvas-sized texture as a drag ghost: the `origin` that puts the middle of the item under
 * the pointer and the `scale` that makes its longest side `size` px.
 */
export function ghostFit(
  bounds: Rect | null, textureWidth: number, textureHeight: number, size: number,
): { origin: Point; scale: number } {
  const b = bounds ?? { x: 0, y: 0, width: textureWidth, height: textureHeight };
  return {
    origin: { x: (b.x + b.width / 2) / textureWidth, y: (b.y + b.height / 2) / textureHeight },
    scale: size / Math.max(b.width, b.height),
  };
}

/**
 * Top of the visible pixels inside the columns `fromX`..`toX` (fractions 0..1 of the width), as a fraction of the height.
 * Null when that band is empty. It finds where something can be hung: the top of the head under a tall hat, not an ear.
 */
export function topOfColumns(map: AlphaMap, fromX: number, toX: number): number | null {
  const x0 = Math.max(0, Math.floor(fromX * map.width));
  const x1 = Math.min(map.width, Math.ceil(toX * map.width));
  for (let y = 0; y < map.height; y++) {
    for (let x = x0; x < x1; x++) if (map.data[y * map.width + x] >= ALPHA_THRESHOLD) return y / map.height;
  }
  return null;
}
