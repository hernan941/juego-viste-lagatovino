// Pure TS, no Phaser (ADR 0010). What travels between scenes: the chosen cat, its name and its outfit.
import type { Outfit, SaveData } from './types';
import { validateCatName } from './catName';
import { SLOT_ORDER, type Slot } from './slots';

export interface Session {
  catId: string | null;
  catName: string;
  outfit: Outfit;
}

export function emptySession(): Session {
  return { catId: null, catName: '', outfit: {} };
}

export function isComplete(s: Session): boolean {
  return s.catId !== null && validateCatName(s.catName).ok;
}

/** Picks a cat and names it. Another cat starts naked; the same cat keeps its clothes. An invalid name changes nothing. */
export function chooseCat(s: Session, catId: string, rawName: string): Session {
  const check = validateCatName(rawName);
  if (!check.ok) return s;
  return { catId, catName: check.name, outfit: s.catId === catId ? s.outfit : {} };
}

export function withOutfit(s: Session, outfit: Outfit): Session {
  return { ...s, outfit };
}

/** The session over a save (F7 persists it): the mute and the secrets stay as they were. */
export function toSaveData(s: Session, base: SaveData): SaveData {
  return { ...base, catId: s.catId, catName: s.catName, outfit: s.outfit };
}

/**
 * The session a save describes, checked against the catalog: a cat or an item that no longer exists,
 * or an item in the wrong slot, is dropped; an invalid name falls back to the cat's default name.
 */
export function sessionFromSave(
  save: SaveData,
  cats: readonly { id: string; name: string }[],
  clothes: readonly { id: string; slot: Slot }[],
): Session {
  const cat = cats.find((c) => c.id === save.catId);
  if (!cat) return emptySession();
  const check = validateCatName(save.catName);
  const outfit: Partial<Record<Slot, string>> = {};
  for (const slot of SLOT_ORDER) {
    const id = save.outfit[slot];
    if (id !== undefined && clothes.some((c) => c.id === id && c.slot === slot)) outfit[slot] = id;
  }
  return { catId: cat.id, catName: check.ok ? check.name : cat.name, outfit };
}
