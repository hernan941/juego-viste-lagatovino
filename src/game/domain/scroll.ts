// Pure TS, no Phaser (ADR 0010). Scroll math for the wardrobe grid (F4).

/** Height of a grid of `count` cells in `columns` columns, with `padding` above and below. */
export function contentHeight(count: number, columns: number, cell: number, gap: number, padding = 0): number {
  if (count <= 0) return 0;
  const rows = Math.ceil(count / columns);
  return rows * cell + (rows - 1) * gap + 2 * padding;
}

export function maxScroll(content: number, view: number): number {
  return Math.max(0, content - view);
}

export function clampScroll(offset: number, content: number, view: number): number {
  return Math.min(Math.max(offset, 0), maxScroll(content, view));
}

/** New scroll target after a wheel tick of `deltaY` px. */
export function wheelTarget(target: number, deltaY: number, content: number, view: number, speed = 1): number {
  return clampScroll(target + deltaY * speed, content, view);
}

/** Half life of the scroll easing, in ms. */
const HALF_LIFE_MS = 45;

/** Eases `current` toward `target`; the result does not depend on the frame rate. */
export function smoothStep(current: number, target: number, dtMs: number): number {
  const diff = target - current;
  if (diff === 0) return current;
  const k = 1 - Math.pow(0.5, Math.max(0, dtMs) / HALF_LIFE_MS);
  const next = current + diff * k;
  return Math.abs(target - next) < 0.5 ? target : next;
}

/** Scroll offset that shows the row of item `index` completely, moving as little as possible. */
export function offsetToReveal(
  index: number, columns: number, cell: number, gap: number, padding: number, current: number, view: number,
): number {
  const top = padding + Math.floor(index / columns) * (cell + gap);
  const bottom = top + cell;
  if (top < current + padding) return Math.max(0, top - padding);
  if (bottom > current + view - padding) return bottom + padding - view;
  return current;
}

export type Gesture = 'pending' | 'scroll' | 'item';

/**
 * Decides what a press on a cell means once the pointer has moved: a mostly vertical move scrolls the
 * grid; any other move drags the item (the cat is to the side, so dragging is horizontal or diagonal).
 */
export function classifyGesture(dx: number, dy: number, threshold: number): Gesture {
  if (Math.hypot(dx, dy) < threshold) return 'pending';
  return Math.abs(dy) > Math.abs(dx) * 1.5 ? 'scroll' : 'item';
}

/** Scrollbar thumb inside a track of `track` px, or null when there is nothing to scroll. */
export function scrollbarThumb(
  offset: number, content: number, view: number, track: number, minHeight: number,
): { y: number; height: number } | null {
  const max = maxScroll(content, view);
  if (max <= 0) return null;
  const height = Math.min(track, Math.max(minHeight, (track * view) / content));
  return { y: (clampScroll(offset, content, view) / max) * (track - height), height };
}
