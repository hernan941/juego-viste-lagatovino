// Sizes shared by DressUp and its controllers, in game px.
/** Longest side of the dragged item, and of the one that flies back to its cell. */
export const GHOST_SIZE = 150;
export const GHOST_HOME_SIZE = 90;
/** The purse, top of the screen between the cat and the secrets counter (the counter keeps the top right; the fullscreen button of the phone sits at its right). */
export const WALLET_POSITION = { x: 896, y: 34 } as const;
/** The tag hung on a grid cell, in cell px from its center: from the top right corner, over the edge of the picture. */
export const CELL_TAG = { x: 36, y: -62, scale: 0.46 } as const;
/** The tag of a worn item, from the slot anchor of the cat: to the side, so it covers the garment as little as it can. */
export const WORN_TAG = { dx: 96, dy: -34, scale: 0.62 } as const;
