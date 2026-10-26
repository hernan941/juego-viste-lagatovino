// Pure TS, no Phaser (ADR 0010). The souvenir photo: its file name and where each piece goes on the picture.
import type { Point, Rect } from './types';

export const PHOTO_PREFIX = 'viste-lagato-';
const NAME_FALLBACK = 'gatito';
const SLUG_MAX = 24;

/** `viste-lagato-<name>.png`, with the name made safe: no accents, no symbols, spaces as dashes. */
export function photoFileName(catName: string): string {
  const slug = catName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
  return `${PHOTO_PREFIX}${slug || NAME_FALLBACK}.png`;
}

export interface PhotoLayout {
  width: number;
  height: number;
  /** The rounded frame (border of the card). */
  frame: Rect & { radius: number };
  /** Where the logo text goes. */
  logo: Rect;
  /** Display box of the cat's 512 canvas. */
  cat: Rect & { size: number };
  /** Origin of the Cat container (the middle of its feet). */
  feet: Point;
  /** The name plaque. */
  name: Rect;
  /** Centers of the sparkles around the cat (each about 40 px wide). */
  sparkles: Point[];
}

/** Y of the paws' bottom edge in the 512 canvas (same constant as Cat). */
const FEET_Y_IN_CANVAS = 490;
const CANVAS = 512;

/** A 4:5 portrait picture: logo on top, the cat in the middle and the name plaque below. */
export function photoLayout(): PhotoLayout {
  const width = 1080;
  const height = 1350;
  const size = 860;
  const catY = 250;
  return {
    width,
    height,
    frame: { x: 40, y: 40, width: width - 80, height: height - 80, radius: 64 },
    logo: { x: 240, y: 90, width: 600, height: 130 },
    cat: { x: (width - size) / 2, y: catY, width: size, height: size, size },
    feet: { x: width / 2, y: Math.round(catY + (FEET_Y_IN_CANVAS * size) / CANVAS) },
    name: { x: 190, y: 1150, width: 700, height: 110 },
    sparkles: [
      { x: 110, y: 150 }, { x: 970, y: 150 },
      { x: 85, y: 420 }, { x: 995, y: 380 },
      { x: 85, y: 700 }, { x: 995, y: 640 },
      { x: 80, y: 950 }, { x: 1000, y: 900 },
      { x: 100, y: 1230 }, { x: 980, y: 1230 },
    ],
  };
}

// ---- Photo mode (second stage, S6) ----

/** The polaroid frame tilts between 1 and 8 degrees, either way (never straight). */
export const FRAME_ANGLE_MIN = 1;
export const FRAME_ANGLE_MAX = 8;
/** How many stickers fit on one photo. */
export const STICKER_LIMIT = 8;

/** FNV-1a hash of the seed, then one round of mulberry32: two stable numbers in [0, 1). */
function seeded(seed: string | number): [number, number] {
  let h = 0x811c9dc5;
  for (const ch of String(seed)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  }
  const next = (): number => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return [next(), next()];
}

/** Tilt of the frame for a photo: the same seed always gives the same angle, so the photo does not shake when redrawn. */
export function framePlacement(seed: string | number): { angle: number } {
  const [magnitude, side] = seeded(seed);
  const angle = FRAME_ANGLE_MIN + magnitude * (FRAME_ANGLE_MAX - FRAME_ANGLE_MIN);
  return { angle: Math.round(angle * 100) / 100 * (side < 0.5 ? -1 : 1) };
}

/** How many stickers can still be placed when `placed` are already on the photo. */
export function stickerLimit(placed: number): { max: number; left: number; full: boolean } {
  const left = Math.max(0, STICKER_LIMIT - placed);
  return { max: STICKER_LIMIT, left, full: left === 0 };
}

/** Keeps a sticker center inside the frame; `margin` (half the sticker) keeps the whole sticker inside. */
export function clampSticker(pos: Point, frame: Rect, margin = 0): Point {
  const axis = (v: number, start: number, size: number): number => {
    const lo = start + margin;
    const hi = start + size - margin;
    return lo > hi ? start + size / 2 : Math.min(hi, Math.max(lo, v));
  };
  return { x: axis(pos.x, frame.x, frame.width), y: axis(pos.y, frame.y, frame.height) };
}
