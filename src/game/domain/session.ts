// Pure TS, no Phaser (ADR 0010). What travels between scenes: the chosen cat, its name and its outfit.
import type { Outfit, SaveData } from './types';
import { validateCatName } from './catName';

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
