// Combo detection and secret unlocking (docs/game-design.md, "Regalitos de la tienda").
import type { ClothingDef, ComboDef, ComboRequirement, Outfit } from './types';

export interface SecretsState {
  unlocked: readonly string[];
}

export interface UnlockResult {
  state: SecretsState;
  newlyUnlocked: boolean;
  /** X of the "Secretos: X/N" counter. */
  count: number;
  /** N of the counter. */
  total: number;
}

function meets(req: ComboRequirement, outfit: Outfit, byId: ReadonlyMap<string, ClothingDef>): boolean {
  if ('itemId' in req) return Object.values(outfit).includes(req.itemId);
  const worn = outfit[req.slot];
  return worn !== undefined && (byId.get(worn)?.tags.includes(req.tag) ?? false);
}

export function findCompletedCombos(
  outfit: Outfit,
  combos: readonly ComboDef[],
  catalog: readonly ClothingDef[],
): ComboDef[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return combos.filter((c) => c.requires.length > 0 && c.requires.every((r) => meets(r, outfit, byId)));
}

/** Combos completed by going from `prev` to `next`, not those that were already complete. */
export function newlyCompleted(
  prev: Outfit,
  next: Outfit,
  combos: readonly ComboDef[],
  catalog: readonly ClothingDef[],
): ComboDef[] {
  const before = new Set(findCompletedCombos(prev, combos, catalog).map((c) => c.id));
  return findCompletedCombos(next, combos, catalog).filter((c) => !before.has(c.id));
}

export function unlockSecret(state: SecretsState, comboId: string, combos: readonly ComboDef[]): UnlockResult {
  const total = combos.length;
  const known = combos.some((c) => c.id === comboId);
  if (!known || state.unlocked.includes(comboId)) {
    return { state, newlyUnlocked: false, count: state.unlocked.length, total };
  }
  const unlocked = [...state.unlocked, comboId];
  return { state: { unlocked }, newlyUnlocked: true, count: unlocked.length, total };
}
