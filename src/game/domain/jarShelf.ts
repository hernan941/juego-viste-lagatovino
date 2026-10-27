// The shelf of dye bottles (F16, T1): where each bottle, its name and its price tag sit, so that nothing overlaps. Pure
// geometry (no Phaser): DyeJar and DyeTabController draw with these numbers and a test checks that nothing crosses.
import type { Point, Rect } from './types';

/** The bottle in its cell: the art is 128 x 176, drawn at the height of a wardrobe cell (104). */
export const JAR_W = 76;
export const JAR_H = 104;
/** The name under the bottle: small, so that "Frambuesa" fits in a column. */
export const JAR_NAME_FONT = 19;
export const JAR_LABEL_Y = JAR_H / 2 + 20;
/** The price tag hangs from the neck of the bottle, to the left (cell px from its center). Tag art: 120 x 184, drawn at `scale`. */
export const JAR_TAG_SPOT = { x: -26, y: -38, scale: 0.4 } as const;
const TAG_W = 120 * JAR_TAG_SPOT.scale;
const TAG_H = 184 * JAR_TAG_SPOT.scale;

/** The shelf inside the panel: x of the panel container is 26 px inside the 404 px card. */
export const SHELF = { columns: 4, step: 90, rowStep: 140, firstRow: 50, panelOffset: 26, cardWidth: 356, cellWidth: 80, cellGap: 10 } as const;

/** Handwriting runs about half an em per letter: a safe estimate to lay out without measuring (the real text is measured in the browser). */
export function estimateTextWidth(text: string, fontSize: number): number {
  return Math.ceil(text.length * fontSize * 0.52);
}

/** Centers of the bottles in the panel container, row by row. */
export function shelfCenters(count: number): Point[] {
  const left = (SHELF.cardWidth - (SHELF.columns * SHELF.cellWidth + (SHELF.columns - 1) * SHELF.cellGap)) / 2 + 40;
  return Array.from({ length: count }, (_, i) => ({ x: left + (i % SHELF.columns) * SHELF.step, y: SHELF.firstRow + Math.floor(i / SHELF.columns) * SHELF.rowStep }));
}

/** The rectangles a bottle takes (in the panel container): the glass, its name, and the tag that hangs on it. */
export function jarRects(center: Point, name: string): { bottle: Rect; label: Rect; tag: Rect } {
  const labelW = estimateTextWidth(name, JAR_NAME_FONT);
  const labelH = Math.ceil(JAR_NAME_FONT * 1.3);
  return {
    bottle: { x: center.x - JAR_W / 2, y: center.y - JAR_H / 2, width: JAR_W, height: JAR_H },
    label: { x: center.x - labelW / 2, y: center.y + JAR_LABEL_Y - labelH / 2, width: labelW, height: labelH },
    tag: { x: center.x + JAR_TAG_SPOT.x - TAG_W / 2, y: center.y + JAR_TAG_SPOT.y, width: TAG_W, height: TAG_H },
  };
}
