// Pure outfit logic (ADR 0003). Outfits are immutable: every change returns a new one.
import { compareSlots, type Slot } from './slots';
import type { ClothingDef, Outfit } from './types';

export interface EquipResult {
  outfit: Outfit;
  /** Id of the item that was in the slot before, or null. */
  replaced: string | null;
}

export function equip(outfit: Outfit, item: ClothingDef): EquipResult {
  const previous = outfit[item.slot];
  return {
    outfit: { ...outfit, [item.slot]: item.id },
    replaced: previous !== undefined && previous !== item.id ? previous : null,
  };
}

export function unequip(outfit: Outfit, slot: Slot): Outfit {
  const next = { ...outfit };
  delete next[slot];
  return next;
}

export function isEquipped(outfit: Outfit, itemId: string): boolean {
  return Object.values(outfit).includes(itemId);
}

/** Worn items ordered back to front, ready to render as layers. */
export function getLayers(outfit: Outfit, catalog: readonly ClothingDef[]): ClothingDef[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return Object.values(outfit)
    .map((id) => byId.get(id))
    .filter((c): c is ClothingDef => c !== undefined)
    .sort((a, b) => compareSlots(a.slot, b.slot));
}
