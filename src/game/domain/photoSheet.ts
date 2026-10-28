// Pure TS, no Phaser (ADR 0010). What the saved picture of the photo mode draws (F18.5) as a list of operations in the coordinates of
// the sheet (its middle is 0, 0, the art is 540 x 675). The scene only runs the list into a RenderTexture, so the order, the places and
// what is skipped are tested here. The packaging of the keychain (F19.3) draws the same sheet, without the cat, inside its window.
import { PHOTO_SIZE, STICKER_SIZE, backgroundCrop, frameWindow, type PhotoComposition } from './photoComposition';
import type { PhotoPiece, Rect } from './types';

/** Where things go on the sheet, in px of the sheet from its middle. The table (PhotoMode) and the saved picture share these. */
export const SHEET_LAYOUT = {
  /** The cat stands with its feet at (x, feetY) and its 512 canvas drawn `size` px wide. */
  cat: { x: 0, feetY: 200, size: 430 },
  /** The name by hand in the bottom margin of the frame. */
  name: { x: 0, y: 254, fontSize: 44, maxWidth: PHOTO_SIZE.width - 120 },
  /** The "zzz" of the sleepy pose, next to the head. */
  zzz: { texture: 'photo-sticker-zzz', x: 100, y: -160, size: 84 },
  /** The 5 stars under the name. */
  stars: { y: 306, size: 24, gap: 8, filled: 'ui-stamp-sol', empty: 'ui-stamp', emptyAlpha: 0.3 },
  /** "Xoxo, mau!" in the corner of the margin. */
  signature: { x: 168, y: 306, fontSize: 28, angle: -5, maxWidth: 150 },
} as const;

/** A frame whose bottom margin is thinner than this has no room for the caption: it goes on a paper label (F20.R A2). */
export const LABEL_MIN_MARGIN = 80;

export interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

/** Where the name, the stars and the signature go for a frame, and the paper label under them (null when the margin is enough). */
export interface CaptionPlan {
  label: LabelRect | null;
  name: { x: number; y: number; fontSize: number; maxWidth: number };
  stars: { x: number; y: number; size: number };
  signature: { x: number; y: number; fontSize: number; angle: number; maxWidth: number };
}

const LABEL_PLAN: CaptionPlan = {
  label: { x: 0, y: 262, width: 380, height: 96, angle: -2 },
  name: { x: 0, y: 238, fontSize: 40, maxWidth: 340 },
  stars: { x: -80, y: 284, size: 22 },
  signature: { x: 105, y: 284, fontSize: 24, angle: -3, maxWidth: 130 },
};

export function captionPlan(frameId: string | null): CaptionPlan {
  const w = frameWindow(frameId);
  if (PHOTO_SIZE.height / 2 - (w.y + w.height) >= LABEL_MIN_MARGIN) {
    const { name, stars, signature } = SHEET_LAYOUT;
    return { label: null, name, stars: { x: 0, y: stars.y, size: stars.size }, signature };
  }
  return LABEL_PLAN;
}

export const SLEEPY_POSE = 'pose-dormilon';
export const STAR_COUNT = 5;

export type SheetOp =
  | { kind: 'image'; texture: string; x: number; y: number; width?: number; height?: number; scale?: number; angle?: number; alpha?: number;
      /** Only this part of the art (texture px from its top left) is drawn. */
      crop?: Rect }
  | { kind: 'text'; text: string; x: number; y: number; fontSize: number; maxWidth: number; angle?: number }
  | { kind: 'cat'; x: number; y: number; size: number }
  /** The paper label of the caption (tarjeta with a border and a washi), `angle` degrees. */
  | { kind: 'label'; x: number; y: number; width: number; height: number; angle: number }
  /** The keychain of the packaging, hanging from (x, y) at `scale` (the scene knows its texture and hardware). */
  | { kind: 'keychain'; x: number; y: number; scale: number };

export interface StarSlot {
  x: number;
  filled: boolean;
}

/** The 5 slots of the row of stars, centered on x = 0; the first `stars` are filled. */
export function starRow(stars: number, centerX = 0): StarSlot[] {
  const { size, gap } = SHEET_LAYOUT.stars;
  const step = size + gap;
  return Array.from({ length: STAR_COUNT }, (_, i) => ({ x: centerX + (i - (STAR_COUNT - 1) / 2) * step, filled: i < stars }));
}

export interface SheetInput {
  photo: { backgrounds: readonly Pick<PhotoPiece, 'id' | 'texture'>[]; frames: readonly Pick<PhotoPiece, 'id' | 'texture'>[]; stickers: readonly Pick<PhotoPiece, 'id' | 'texture'>[] };
  composition: PhotoComposition;
  catName: string;
  /** The rating of the look (null when it was not rated: no stars are drawn). */
  stars: number | null;
  signature: string;
}

type PieceList = readonly Pick<PhotoPiece, 'id' | 'texture'>[];
const pieceOf = (list: PieceList, id: string | null) => list.find((p) => p.id === id);

/** The background (cut to the window of the frame, F1) and the frame of the sheet (the art goes 1:1 around the middle). */
export function paperOps({ photo, composition }: Pick<SheetInput, 'photo' | 'composition'>): SheetOp[] {
  const ops: SheetOp[] = [];
  const bg = pieceOf(photo.backgrounds, composition.background);
  if (bg) ops.push({ kind: 'image', texture: bg.texture, x: 0, y: 0, crop: backgroundCrop(composition.frame) });
  const frame = pieceOf(photo.frames, composition.frame);
  if (frame) ops.push({ kind: 'image', texture: frame.texture, x: 0, y: 0 });
  return ops;
}

/** The stickers of the composition, in z order, as the table has them (one that is not in the catalog is skipped). */
export function stickerOps({ photo, composition }: Pick<SheetInput, 'photo' | 'composition'>): SheetOp[] {
  const ops: SheetOp[] = [];
  for (const s of composition.stickers) {
    const art = pieceOf(photo.stickers, s.id);
    if (art) ops.push({ kind: 'image', texture: art.texture, x: s.x, y: s.y, height: STICKER_SIZE, angle: s.angle });
  }
  return ops;
}

/** The operations, back to front: background, frame, name, the cat, the stickers, the "zzz", the stars and the signature. With a label
 * the caption (label, name, stars, signature) goes last, in front of the stickers. */
export function sheetOps(input: SheetInput): SheetOp[] {
  const { composition, catName, stars, signature } = input;
  const ops: SheetOp[] = paperOps(input);
  const plan = captionPlan(composition.frame);
  const { cat } = SHEET_LAYOUT;
  const nameOp: SheetOp = { kind: 'text', text: catName, x: plan.name.x, y: plan.name.y, fontSize: plan.name.fontSize, maxWidth: plan.name.maxWidth };
  if (!plan.label) ops.push(nameOp);
  ops.push({ kind: 'cat', x: cat.x, y: cat.feetY, size: cat.size });
  ops.push(...stickerOps(input));
  if (composition.pose === SLEEPY_POSE) {
    const { zzz } = SHEET_LAYOUT;
    ops.push({ kind: 'image', texture: zzz.texture, x: zzz.x, y: zzz.y, height: zzz.size });
  }
  if (plan.label) {
    ops.push({ kind: 'label', ...plan.label });
    ops.push(nameOp);
  }
  if (stars !== null) {
    const row = SHEET_LAYOUT.stars;
    for (const slot of starRow(stars, plan.stars.x)) {
      ops.push({ kind: 'image', texture: slot.filled ? row.filled : row.empty, x: slot.x, y: plan.stars.y, height: plan.stars.size, ...(slot.filled ? {} : { alpha: row.emptyAlpha }) });
    }
  }
  const sig = plan.signature;
  ops.push({ kind: 'text', text: signature, x: sig.x, y: sig.y, fontSize: sig.fontSize, maxWidth: sig.maxWidth, angle: sig.angle });
  return ops;
}
