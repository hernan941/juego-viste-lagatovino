// Combo detection and secret unlocking (docs/game-design.md, "Regalitos de la tienda").
import type { Expression } from './expressions';
import type { Slot } from './slots';
import type { Category, ClothingDef, ComboDef, ComboRequirement, Outfit } from './types';

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

/** The reactions the DressUp scene knows how to play (data/combos.json `reaction`). */
export const COMBO_REACTIONS = ['stars-orbit', 'snowfall', 'petals', 'royal-pose', 'heartbeat', 'rainbow-arc'] as const;
export type ComboReaction = (typeof COMBO_REACTIONS)[number];

export interface ComboReactionPlan {
  /** Face shown first, before `expression` (surprise before the stars, for example). */
  lead?: Expression;
  expression: Expression;
  /** How long `expression` is held before going back to normal. */
  ms: number;
}

const PLANS: Record<ComboReaction, ComboReactionPlan> = {
  'stars-orbit': { lead: 'sorpresa', expression: 'amor', ms: 1600 },
  snowfall: { expression: 'amor', ms: 1600 },
  petals: { expression: 'amor', ms: 1600 },
  'royal-pose': { expression: 'feliz', ms: 1600 },
  heartbeat: { expression: 'amor', ms: 1500 },
  'rainbow-arc': { expression: 'amor', ms: 1600 },
};

/** The face the cat makes for a combo reaction (docs/game-design.md, "Combos de F8"); unknown kinds fall back to love. */
export function comboReactionPlan(kind: string): ComboReactionPlan {
  return (PLANS as Record<string, ComboReactionPlan | undefined>)[kind] ?? { expression: 'amor', ms: 1600 };
}

/** Item ids of the prizes of the unlocked combos. */
export function secretRewards(unlocked: readonly string[], combos: readonly ComboDef[]): Set<string> {
  return new Set(combos.filter((c) => unlocked.includes(c.id)).map((c) => c.rewardItemId));
}

const slotOf = (req: ComboRequirement, byId: ReadonlyMap<string, ClothingDef>) =>
  'itemId' in req ? byId.get(req.itemId)?.slot : req.slot;

/**
 * An outfit made only of visible (non secret) items that completes the combo, or null if there is none.
 * Requirements of one slot must be met by the same item. Used by the schema, the tests and the e2e.
 */
export function comboOutfit(combo: ComboDef, catalog: readonly ClothingDef[]): Outfit | null {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const visible = catalog.filter((c) => c.secret !== true);
  const outfit: Partial<Record<Slot, string>> = {};
  for (const req of combo.requires) {
    const slot = slotOf(req, byId);
    if (!slot) return null;
    if (outfit[slot]) continue;
    const reqs = combo.requires.filter((r) => slotOf(r, byId) === slot);
    const pick = visible.find((c) => c.slot === slot && reqs.every((r) => meets(r, { [slot]: c.id }, byId)));
    if (!pick) return null;
    outfit[slot] = pick.id;
  }
  return outfit;
}

/** Combos that lack exactly one requirement while at least two are met, and whose gift is still locked. */
export function almostCombos(
  outfit: Outfit,
  combos: readonly ComboDef[],
  catalog: readonly ClothingDef[],
  unlocked: readonly string[],
): ComboDef[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return combos.filter((c) => {
    if (unlocked.includes(c.id)) return false;
    const met = c.requires.filter((r) => meets(r, outfit, byId)).length;
    return c.requires.length - met === 1 && met >= 2;
  });
}

export interface AlmostHint {
  comboId: string;
  /** The tab (category) of the piece that is missing, where the cat looks. */
  category: Category;
}

/** The tab to look at for the first combo that lacks exactly one piece (see `almostCombos`), or null. */
export function almostHint(
  outfit: Outfit,
  combos: readonly ComboDef[],
  catalog: readonly ClothingDef[],
  unlocked: readonly string[],
): AlmostHint | null {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  for (const combo of almostCombos(outfit, combos, catalog, unlocked)) {
    const missing = combo.requires.find((r) => !meets(r, outfit, byId));
    const slot = missing && slotOf(missing, byId);
    const category = slot && catalog.find((c) => c.slot === slot)?.category;
    if (category) return { comboId: combo.id, category };
  }
  return null;
}
