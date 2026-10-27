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
