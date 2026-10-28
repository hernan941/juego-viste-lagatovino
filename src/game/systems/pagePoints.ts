import type { Point } from '../domain/types';

/** The corner and width of the canvas on the page (CSS pixels), as `getBoundingClientRect` reports them. */
export interface CanvasBox {
  left: number;
  top: number;
  width: number;
}

/** Game coordinates -> page coordinates (the header, the letterbox and the scale of the canvas included). */
export function pageMapper(box: CanvasBox, gameWidth: number): (p: Point) => Point {
  const f = box.width / gameWidth;
  return (p) => ({ x: box.left + p.x * f, y: box.top + p.y * f });
}

const isPoint = (v: object): v is Point => {
  const keys = Object.keys(v);
  const r = v as Record<string, unknown>;
  return keys.length === 2 && typeof r.x === 'number' && typeof r.y === 'number';
};

/**
 * Converts every point ({x, y} and nothing else) found at any depth of a plain value; rects (x, y, width, height) and the rest
 * stay as they are. It is how the state of the controllers, which reports in game coordinates, reaches the test in page ones.
 */
export function mapPointsDeep<T>(value: T, map: (p: Point) => Point): T {
  if (Array.isArray(value)) return value.map((v) => mapPointsDeep(v, map)) as unknown as T;
  if (value === null || typeof value !== 'object') return value;
  if (isPoint(value)) return map(value) as unknown as T;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapPointsDeep(v, map)])) as T;
}

/** A copy of `state` without the keys that the caller already converts by hand. */
export function splitMapped<T extends object>(state: T, handled: readonly string[]): Partial<T> {
  return Object.fromEntries(Object.entries(state).filter(([k]) => !handled.includes(k))) as Partial<T>;
}
