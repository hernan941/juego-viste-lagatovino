// Pure geometry of the heart and paw iris (ADR 0007, art-direction section 8). No Phaser.
// Shapes live in unit coordinates (y grows downward) centered on the origin. The overlay paints them once
// into a texture with a hole, scales it with `irisHoleScale` and covers what is outside with `coverRects`.
import type { Point, Rect } from '../domain/types';

export type Direction = 'close' | 'open';

/** Even-odd point in polygon test. */
export function pointInPolygon(x: number, y: number, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Vertical center of the classic parametric heart, so the outline is seen in one turn from the origin. */
const HEART_CENTER_Y = -1.5;

/** Outline of a heart with its point down, normalized so that its farthest point is at distance 1. */
export function heartOutline(count = 96): Point[] {
  const raw = Array.from({ length: count }, (_, i) => {
    const t = (i / count) * 2 * Math.PI;
    const ym = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: 16 * Math.sin(t) ** 3, y: -(ym - HEART_CENTER_Y) };
  });
  const far = Math.max(...raw.map((p) => Math.hypot(p.x, p.y)));
  return raw.map((p) => ({ x: p.x / far, y: p.y / far }));
}

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Radians. */
  rot: number;
}

const inEllipse = (x: number, y: number, e: Ellipse) => {
  const dx = x - e.cx;
  const dy = y - e.cy;
  const c = Math.cos(e.rot);
  const s = Math.sin(e.rot);
  const u = (dx * c + dy * s) / e.rx;
  const v = (-dx * s + dy * c) / e.ry;
  return u * u + v * v <= 1;
};

/** A paw print: the big pad and four toes (the outer ones tilted), 5 ellipses. */
const PAW_PARTS: readonly Ellipse[] = [
  { cx: 0, cy: 0.2, rx: 0.5, ry: 0.4, rot: 0 },
  { cx: -0.27, cy: -0.55, rx: 0.2, ry: 0.26, rot: -0.2 },
  { cx: 0.27, cy: -0.55, rx: 0.2, ry: 0.26, rot: 0.2 },
  { cx: -0.67, cy: -0.12, rx: 0.19, ry: 0.25, rot: -0.7 },
  { cx: 0.67, cy: -0.12, rx: 0.19, ry: 0.25, rot: 0.7 },
];

/** Distance from the origin to the nearest sampled point that `contains` rejects (`extent` if none does). */
export function innerRadius(contains: (x: number, y: number) => boolean, extent = 1.5, step = 0.01): number {
  let best = extent;
  for (let x = -extent; x <= extent; x += step) {
    for (let y = -extent; y <= extent; y += step) {
      if (!contains(x, y)) best = Math.min(best, Math.hypot(x, y));
    }
  }
  return best;
}

/** Distance from the origin to the farthest sampled point that `contains` accepts. */
function outerRadius(contains: (x: number, y: number) => boolean, extent = 1.5, step = 0.01): number {
  let best = 0;
  for (let x = -extent; x <= extent; x += step) {
    for (let y = -extent; y <= extent; y += step) {
      if (contains(x, y)) best = Math.max(best, Math.hypot(x, y));
    }
  }
  return best;
}

export interface IrisShape {
  contains(x: number, y: number): boolean;
  /** Radius of the biggest circle that fits inside the shape: the hole must grow past the screen from here. */
  inner: number;
  /** Radius of the smallest circle that holds the shape. */
  outer: number;
}

const HEART = heartOutline(96);
const heartContains = (x: number, y: number) => pointInPolygon(x, y, HEART);
const pawContains = (x: number, y: number) => PAW_PARTS.some((e) => inEllipse(x, y, e));

export const IRIS_SHAPES = {
  heart: { contains: heartContains, outline: HEART, inner: innerRadius(heartContains), outer: 1 },
  paw: { contains: pawContains, parts: PAW_PARTS, inner: innerRadius(pawContains), outer: outerRadius(pawContains) },
} as const;

/** Pixels per unit of the shape, for a progress 0..1: from fully closed (0) to a hole that spans the screen. */
export function irisHoleScale(progress: number, direction: Direction, inner: number, maxRadius: number): number {
  const t = Math.min(1, Math.max(0, progress));
  const fullyOpen = (maxRadius / inner) * 1.03;
  return fullyOpen * (direction === 'close' ? 1 - t : t);
}

/** Rects that cover the screen outside a square image of side 2 * half centered on (cx, cy). */
export function coverRects(cx: number, cy: number, half: number, width: number, height: number): Rect[] {
  if (half <= 0) return [{ x: 0, y: 0, width, height }];
  const left = Math.max(0, cx - half);
  const right = Math.min(width, cx + half);
  const top = Math.max(0, cy - half);
  const bottom = Math.min(height, cy + half);
  const rects: Rect[] = [];
  if (top > 0) rects.push({ x: 0, y: 0, width, height: top });
  if (bottom < height) rects.push({ x: 0, y: bottom, width, height: height - bottom });
  if (left > 0) rects.push({ x: 0, y: top, width: left, height: bottom - top });
  if (right < width) rects.push({ x: right, y: top, width: width - right, height: bottom - top });
  return rects;
}
