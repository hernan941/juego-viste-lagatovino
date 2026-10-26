// Pure TS, no Phaser (ADR 0010, 0018). What happens when a dye bottle is let go, and how the dye of an item changes.
import { WATER_DYE } from './dye';
import type { ClothingDef, ItemDye } from './types';

export type DyeDropResult =
  /** The worn item under the bottle takes the dye. */
  | { kind: 'dye'; item: ClothingDef }
  /** A worn item that does not take a dye: the bottle bounces and the cat says so. */
  | { kind: 'notDyeable'; item: ClothingDef }
  /** Over the cat but not over a garment: "¡A mí no!" (cats are not dyed). */
  | { kind: 'noItem' }
  /** Away from the cat: the bottle just goes back. */
  | { kind: 'miss' };

/** `item` is the worn item whose pixels are under the bottle (null if none); `overCat` tells if the bottle is over the cat's drop zone. */
export function resolveDyeDrop(item: ClothingDef | null, overCat: boolean): DyeDropResult {
  if (item) return item.dyeable ? { kind: 'dye', item } : { kind: 'notDyeable', item };
  return overCat ? { kind: 'noItem' } : { kind: 'miss' };
}

/** The dye of each item after putting `dyeId` on `itemId`. Water takes the entry away (the original color). Same object if nothing changes. */
export function applyDye(itemDye: ItemDye, itemId: string, dyeId: string): ItemDye {
  if (dyeId === WATER_DYE) {
    if (!(itemId in itemDye)) return itemDye;
    return Object.fromEntries(Object.entries(itemDye).filter(([id]) => id !== itemId));
  }
  if (itemDye[itemId] === dyeId) return itemDye;
  return { ...itemDye, [itemId]: dyeId };
}
