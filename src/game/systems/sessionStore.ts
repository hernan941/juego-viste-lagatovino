// The session over Phaser's registry (keys from RegistryKeys): the one place that knows where it lives.
import { RegistryKeys } from '../constants';
import { emptySession, type Session } from '../domain/session';
import { SLOT_ORDER } from '../domain/slots';
import type { ItemDye, Outfit } from '../domain/types';

/** The slice of Phaser's DataManager we need, so tests do not need Phaser. */
export interface RegistryLike {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
}

function asOutfit(value: unknown): Outfit {
  if (typeof value !== 'object' || value === null) return {};
  const out: Partial<Record<(typeof SLOT_ORDER)[number], string>> = {};
  for (const slot of SLOT_ORDER) {
    const id = (value as Record<string, unknown>)[slot];
    if (typeof id === 'string') out[slot] = id;
  }
  return out;
}

function asItemDye(value: unknown): ItemDye {
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

export function readSession(reg: RegistryLike): Session {
  const base = emptySession();
  const catId = reg.get(RegistryKeys.CatId);
  const name = reg.get(RegistryKeys.CatName);
  return {
    catId: typeof catId === 'string' ? catId : base.catId,
    catName: typeof name === 'string' ? name : base.catName,
    outfit: asOutfit(reg.get(RegistryKeys.Outfit)),
    itemDye: asItemDye(reg.get(RegistryKeys.ItemDye)),
  };
}

export function writeSession(reg: RegistryLike, s: Session): void {
  reg.set(RegistryKeys.CatId, s.catId);
  reg.set(RegistryKeys.CatName, s.catName);
  reg.set(RegistryKeys.Outfit, s.outfit);
  reg.set(RegistryKeys.ItemDye, s.itemDye);
}
