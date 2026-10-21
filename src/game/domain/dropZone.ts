// Pure drag & drop helpers (ADR 0008): drop zone, magnet and drop resolution.
import type { Point, Rect } from './types';

export type { Rect };

export type DropAction = 'equip' | 'return' | 'unequip';

/** The drop zone is the cat's whole body plus a forgiving margin. */
export function isInsideDropZone(point: Point, zone: Rect, margin: number): boolean {
  return (
    point.x >= zone.x - margin &&
    point.x <= zone.x + zone.width + margin &&
    point.y >= zone.y - margin &&
    point.y <= zone.y + zone.height + margin
  );
}

/** Snaps to the anchor when the point is within `radius` of it. */
export function magnetSnap(point: Point, anchor: Point, radius: number): { point: Point; snapped: boolean } {
  const near = Math.hypot(point.x - anchor.x, point.y - anchor.y) <= radius;
  return near ? { point: anchor, snapped: true } : { point, snapped: false };
}

export function resolveDrop(point: Point, zone: Rect, margin: number, fromEquipped: boolean): DropAction {
  if (isInsideDropZone(point, zone, margin)) return 'equip';
  return fromEquipped ? 'unequip' : 'return';
}
