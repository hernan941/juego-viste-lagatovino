// Pure TS, no Phaser (ADR 0010). What travels between scenes: the chosen cat, its name and its outfit.
import type { ItemDye, Outfit, SaveData } from './types';
import { validateCatName } from './catName';
import { SLOT_ORDER, type Slot } from './slots';

export interface Session {
  catId: string | null;
  catName: string;
  outfit: Outfit;
  /** Dye by worn item (ADR 0018). */
  itemDye: ItemDye;
}

export function emptySession(): Session {
  return { catId: null, catName: '', outfit: {}, itemDye: {} };
}

export function isComplete(s: Session): boolean {
  return s.catId !== null && validateCatName(s.catName).ok;
}

/** Picks a cat and names it. The outfit is kept for any cat (every garment fits every cat, ADR 0003). An invalid name changes nothing. */
export function chooseCat(s: Session, catId: string, rawName: string): Session {
  const check = validateCatName(rawName);
  if (!check.ok) return s;
  return { catId, catName: check.name, outfit: s.outfit, itemDye: s.itemDye };
}

export function withOutfit(s: Session, outfit: Outfit): Session {
  return { ...s, outfit };
}

/** The session over a save (F7 persists it): the preferences and the progress stay as they were. */
export function toSaveData(s: Session, base: SaveData): SaveData {
  return { ...base, catId: s.catId, catName: s.catName, outfit: s.outfit, itemDye: s.itemDye };
}

/**
 * The session a save describes, checked against the catalog: a cat or an item that no longer exists,
 * or an item in the wrong slot, is dropped; an invalid name falls back to the cat's default name.
 */
export function sessionFromSave(
  save: SaveData,
  cats: readonly { id: string; name: string }[],
  clothes: readonly { id: string; slot: Slot; dyeable?: boolean }[],
  dyes?: readonly { id: string }[],
): Session {
  const cat = cats.find((c) => c.id === save.catId);
  if (!cat) return emptySession();
  const check = validateCatName(save.catName);
  const outfit: Partial<Record<Slot, string>> = {};
  for (const slot of SLOT_ORDER) {
    const id = save.outfit[slot];
    if (id !== undefined && clothes.some((c) => c.id === id && c.slot === slot)) outfit[slot] = id;
  }
  // A dye stays on a dyeable item that exists, with a bottle that exists (without a dye list, only the item is checked).
  const itemDye: Record<string, string> = {};
  for (const [itemId, dyeId] of Object.entries(save.itemDye)) {
    if (clothes.some((c) => c.id === itemId && c.dyeable) && (!dyes || dyes.some((d) => d.id === dyeId))) itemDye[itemId] = dyeId;
  }
  return { catId: cat.id, catName: check.ok ? check.name : cat.name, outfit, itemDye };
}
