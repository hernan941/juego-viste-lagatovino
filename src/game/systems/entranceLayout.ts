// Pure numbers of the shop entrance (F20.R): where the facade and the corner stamps go so that they do not cover each other. No Phaser.
import { GAME_WIDTH } from '../constants';
import type { Rect } from './runwayLayout';

/** The facade: top left and scale (the art is 520 x 520). */
export const ENTRANCE_SHOP = { x: 640, y: 94, scale: 1.1 };

/** Sound and motion stamps, top right. */
export const ENTRANCE_BUTTONS = { mute: { x: GAME_WIDTH - 56, y: 56 }, motion: { x: GAME_WIDTH - 128, y: 56 } } as const;

/** A stamp (60 px disc) with its flat shadow and a hair of room for the hover pop. */
export function stampRect(at: { x: number; y: number }): Rect {
  return { x: at.x - 32, y: at.y - 32, width: 64, height: 68 };
}

/** The sign plaque and the cornice of the facade (they mirror the drawing in `shopFront.ts`), in canvas coordinates. */
export function shopPartRects(shop: { x: number; y: number; scale: number }): { plaque: Rect; cornice: Rect } {
  const part = (x: number, y: number, width: number, height: number): Rect => ({ x: shop.x + x * shop.scale, y: shop.y + y * shop.scale, width: width * shop.scale, height: height * shop.scale });
  return { plaque: part(86, 6, 348, 78), cornice: part(0, 44, 520, 52) };
}
