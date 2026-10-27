// Pure TS, no Phaser (ADR 0010). What is on the photo-mode table: pieces, pose and stickers. F18.5 (saving the composed photo) and
// F19.3 (the keychain) read this, so it is plain data in the coordinates of the sheet (its middle is 0, 0).
import { clampSticker, stickerLimit } from './photo';
import type { PlacedSticker, Point, Rect } from './types';

/** The sheet (background and frame art) in px. */
export const PHOTO_SIZE = { width: 540, height: 675 } as const;
/** How far inside the sheet the stickers must stay, so they never sit on the border of the frame. */
export const PHOTO_INSET = 28;
/** Drawn height of a sticker, and half of it (the margin that keeps it whole inside the area). */
export const STICKER_SIZE = 96;
export const STICKER_HALF = STICKER_SIZE / 2;
/** A sticker settles with a random angle of plus or minus this many degrees. */
export const STICKER_ANGLE_MAX = 10;

export interface PhotoComposition {
  background: string | null;
  frame: string | null;
  pose: string | null;
  /** In z order: the last one is on top. */
  stickers: PlacedSticker[];
}

/** Where a sticker may be: the sheet minus its border, centered on 0, 0. */
export function photoArea(): Rect {
  const width = PHOTO_SIZE.width - PHOTO_INSET * 2;
  const height = PHOTO_SIZE.height - PHOTO_INSET * 2;
  return { x: -width / 2, y: -height / 2, width, height };
}

/** Puts a sticker on top of the others, kept whole inside the photo. At the limit nothing changes (the same list comes back). */
export function placeSticker(stickers: readonly PlacedSticker[], at: Point & { id: string }, angle: number): { stickers: PlacedSticker[]; placed: boolean } {
  if (stickerLimit(stickers.length).full) return { stickers: stickers as PlacedSticker[], placed: false };
  const { x, y } = clampSticker(at, photoArea(), STICKER_HALF);
  return { stickers: [...stickers, { id: at.id, x, y, angle }], placed: true };
}

/** The list without the sticker at `index` (a copy); an index that is not there changes nothing. */
export function removeSticker(stickers: readonly PlacedSticker[], index: number): PlacedSticker[] {
  return stickers.filter((_, i) => i !== index);
}

/** A random settling angle in [-STICKER_ANGLE_MAX, STICKER_ANGLE_MAX) from a number in [0, 1). */
export function stickerAngle(rng: () => number): number {
  return (rng() * 2 - 1) * STICKER_ANGLE_MAX;
}

/** Each piece of a tray with whether it is unlocked, in the order of the catalog. */
export function pieceStates(list: readonly { id: string }[], open: ReadonlySet<string>): { id: string; open: boolean }[] {
  return list.map((p) => ({ id: p.id, open: open.has(p.id) }));
}

/** Only a piece that exists and is unlocked can be chosen. */
export function canPick(id: string, list: readonly { id: string }[], open: ReadonlySet<string>): boolean {
  return open.has(id) && list.some((p) => p.id === id);
}

/**
 * The transparent window of each frame in the 540 x 675 art, as [left, top, right, bottom] (taken from the art in art/photo/frames).
 * The background is cut to it (F1): its square corners would otherwise show past the rounded outline of the frame.
 */
export const FRAME_WINDOWS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  'frame-polaroid': [36, 36, 504, 567],
  'frame-cuaderno': [74, 40, 504, 590],
  'frame-dorado': [44, 44, 496, 631],
  'frame-acuarela': [44, 44, 496, 631],
  'frame-kofi': [40, 40, 500, 524],
};
/** The window of a frame that is unknown, or when there is none (a safe one, inside the thinnest border). */
const DEFAULT_WINDOW = [44, 44, 496, 631] as const;

/** The window of a frame in the coordinates of the sheet (its middle is 0, 0). */
export function frameWindow(frameId: string | null): Rect {
  const [l, t, r, b] = (frameId !== null && FRAME_WINDOWS[frameId]) || DEFAULT_WINDOW;
  return { x: l - PHOTO_SIZE.width / 2, y: t - PHOTO_SIZE.height / 2, width: r - l, height: b - t };
}

/** The crop of the background art in texture px: the window of the frame, from the top left of the art. */
export function backgroundCrop(frameId: string | null): Rect {
  const w = frameWindow(frameId);
  return { x: w.x + PHOTO_SIZE.width / 2, y: w.y + PHOTO_SIZE.height / 2, width: w.width, height: w.height };
}

/** A copy of the table as it is now (nothing shared with the live state). */
export function composition(state: PhotoComposition): PhotoComposition {
  return { background: state.background, frame: state.frame, pose: state.pose, stickers: state.stickers.map((s) => ({ ...s })) };
}
