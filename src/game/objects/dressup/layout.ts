import type { InkToken } from '../../constants';
import type { Category } from '../../domain/types';

// Sizes shared by DressUp and its controllers, in game px.
import type { Slot } from '../../domain/slots';

/** Height of the cat in the fitting room. */
export const CAT_SIZE = 540;
/** Longest side of the dragged item, and of the one that flies back to its cell. */
export const GHOST_SIZE = 150;
export const GHOST_HOME_SIZE = 90;
/** The purse, top of the screen between the cat and the secrets counter (the counter keeps the top right). */
export const WALLET_POSITION = { x: 896, y: 34 } as const;
/** The tag hung on a grid cell, in cell px from its center: from the top right corner, over the edge of the picture. */
export const CELL_TAG = { x: 36, y: -62, scale: 0.46 } as const;
/** The tag of a worn item, from the slot anchor of the cat: to the side, so it covers the garment as little as it can. */
export const WORN_TAG = { dx: 96, dy: -34, scale: 0.62 } as const;
/** The tag of a head or face item hangs farther out, past the cheek: the eyes are the feedback of the tastes and nothing covers them. */
export const WORN_TAG_FACE = { dx: 160, dy: -30 } as const;
/** Game px from the slot anchor to the thread of the tag of a worn item. */
export function wornTagOffset(slot: Slot): { dx: number; dy: number } {
  return slot === 'head' || slot === 'face' ? { dx: WORN_TAG_FACE.dx, dy: WORN_TAG_FACE.dy } : { dx: WORN_TAG.dx, dy: WORN_TAG.dy };
}
/** The notebook button: top of the screen, left of the room (the purse and the secrets counter keep the right). */
export const ALBUM_BUTTON_AT = { x: 500, y: 34 } as const;

// ---- The fitting room as a page of the notebook (F20.5, ADR 0016) ----------------------------------------------------
/** Where the index tabs hang (the top of the row); they are 54 high, so the wardrobe card starts right under them. */
export const TABS_Y = 58;
/** Left card: the scrollable wardrobe. The tabs stick to its top edge, the name of the tab and the grid go inside, the hint at the bottom. */
export const PANEL = { x: 36, y: 112, width: 404, height: 572 } as const;
export const GRID = { x: 62, y: 164, width: 356, height: 464 } as const;
/** Right card: the layers the cat wears. */
export const LAYERS_PANEL = { x: 968, y: 66, width: 250, height: 444 } as const;
/** The two pills under the layers card (the kit grows their hit area to 80). */
export const DONE_BUTTON = { x: 1093, y: 568, width: 250, height: 88, fontSize: 42 } as const;
export const CHANGE_BUTTON = { x: 1093, y: 652, width: 220, height: 62, fontSize: 24 } as const;

/** Index tab color of each wardrobe category (art-direction section 6: cielo, rosa, sol, lila, durazno, hoja) and of the dye tab. */
const CATEGORY_TAB_COLORS: Record<Category, InkToken> = {
  sweater: 'cielo', head: 'rosa', neck: 'sol', face: 'lila', paws: 'durazno', accessory: 'hoja', bottom: 'lapiz',
};
export const DYE_TAB_COLOR: InkToken = 'naranjo';
export const categoryTabColor = (category: Category): InkToken => CATEGORY_TAB_COLORS[category];
