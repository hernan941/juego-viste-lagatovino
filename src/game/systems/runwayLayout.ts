// Pure numbers of the runway room (F20.6): where things go so that nothing drawn in the room covers the way out. No Phaser.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The exits, in a row under the cat: center x, center y and size of each pill. */
export const EXIT_Y = 664;
export const EXIT_HEIGHT = 76;
export const EXIT_CENTERS = { photo: 185, keep: 480, change: 775 } as const;
export const EXIT_WIDTHS = { photo: 250, keep: 300, change: 250 } as const;

export const RUNWAY_EXITS: Rect[] = (Object.keys(EXIT_CENTERS) as (keyof typeof EXIT_CENTERS)[]).map((key) => ({
  x: EXIT_CENTERS[key] - EXIT_WIDTHS[key] / 2,
  y: EXIT_Y - EXIT_HEIGHT / 2,
  width: EXIT_WIDTHS[key],
  height: EXIT_HEIGHT,
}));

/** Where the judge's card sits: its top edge (y - 196) stays under the round buttons of the corner (they end at y 86). */
export const JUDGE_CARD_AT = { x: 930, y: 284 } as const;
/** The judge's card (420 x 392, centered on `JUDGE_CARD_AT`). */
export const RUNWAY_JUDGE_CARD: Rect = { x: JUDGE_CARD_AT.x - 210, y: JUDGE_CARD_AT.y - 196, width: 420, height: 392 };

/** The strip of paper the cat stands on: centered on the cat, its lower edge a little under the feet. */
export function runwayStage(catX: number, feetY: number): Rect {
  const width = 600;
  const height = 40;
  return { x: catX - width / 2, y: feetY - height + 8, width, height };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** "Secretos X/N" (a paper tag of 210 x 44, top left) and the room it takes while it pops (x1.3) and tilts. */
export const SECRETS_TAG_AT = { x: 140, y: 50 } as const;
export const RUNWAY_SECRETS_TAG: Rect = { x: SECRETS_TAG_AT.x - 137, y: SECRETS_TAG_AT.y - 36, width: 274, height: 72 };

/** The notes of the ceremony: a row of polaroids above the cat, between the Secretos tag and the judge's card. */
export const NOTES_TOP_MARGIN = 8;
export const NOTES_BAND = { x: 292, width: 424, y: 108 } as const;
/** A polaroid at scale 1 (260 x 300 at 0.62), the gap between two at most, and the room its tilt and fall need around it. */
const NOTE_SIZE = { width: 161, height: 186 };
const NOTE_GAP = 150;
const NOTE_TILT_ROOM = 14;

/** How big the notes are and how far apart their centers go so that `count` of them fit the band. */
export function noteRowFit(count: number): { scale: number; maxWidth: number; step: number } {
  const scale = count > 4 ? 0.75 : 0.9;
  const maxWidth = NOTES_BAND.width - 2 * NOTE_TILT_ROOM - NOTE_SIZE.width * scale;
  return { scale, maxWidth, step: count > 1 ? Math.min(NOTE_GAP, maxWidth / (count - 1)) : NOTE_GAP };
}

/** The room a row of `count` notes takes, tilt included (what must stay clear of the tag, the card and the edge). */
export function noteRowRect(count: number): Rect {
  const { scale, step } = noteRowFit(count);
  const width = (count - 1) * step + NOTE_SIZE.width * scale + 2 * NOTE_TILT_ROOM;
  const height = NOTE_SIZE.height * scale + 2 * NOTE_TILT_ROOM;
  return { x: NOTES_BAND.x + NOTES_BAND.width / 2 - width / 2, y: NOTES_BAND.y - height / 2, width, height };
}
