// Pure TS, no Phaser (ADR 0010, 0017). All the arithmetic of the shop; every number comes from EconomyRules.
import { SLOT_ORDER } from './slots';
import type { ClothingDef, DyeDef, EconomyRules, ItemDye, Outfit, Stars } from './types';

export interface CartLine {
  id: string;
  price: number;
}

/** What is worn and not paid yet: items and dye bottles. */
export interface Cart {
  items: CartLine[];
  dyes: CartLine[];
  total: number;
}

export interface CartContext {
  catalog: readonly ClothingDef[];
  dyes: readonly DyeDef[];
  rules: EconomyRules;
}

export type CheckoutResult =
  | { ok: true; wallet: number; owned: string[]; dyesOwned: string[] }
  | { ok: false; missing: number };

/** How many slots changed against recent looks, capped: 0 = repeat, 1 = near, 2 = new. */
export type Novelty = 0 | 1 | 2;

/** Price of an item: by tier; starters and secret items have no tier and are free. */
export function priceOf(item: ClothingDef, rules: EconomyRules): number {
  return item.tier ? rules.prices[item.tier] : 0;
}

/** Price of a bottle; starter bottles are free. */
export function dyePrice(dye: DyeDef, rules: EconomyRules): number {
  return dye.starter ? 0 : rules.prices.dye;
}

/**
 * Worn things the player does not own yet. `owned` and `dyesOwned` are the bought ones (progress);
 * starters and secrets are derived, so they never show up here. A bottle is charged once.
 */
export function cartFromOutfit(
  outfit: Outfit,
  itemDye: ItemDye,
  owned: readonly string[],
  dyesOwned: readonly string[],
  { catalog, dyes, rules }: CartContext,
): Cart {
  const itemsById = new Map(catalog.map((c) => [c.id, c]));
  const dyesById = new Map(dyes.map((d) => [d.id, d]));
  const items: CartLine[] = [];
  const bottles: CartLine[] = [];
  for (const slot of SLOT_ORDER) {
    const id = outfit[slot];
    const item = id === undefined ? undefined : itemsById.get(id);
    if (!item) continue;
    const price = priceOf(item, rules);
    if (price > 0 && !owned.includes(item.id)) items.push({ id: item.id, price });
    const dye = dyesById.get(itemDye[item.id] ?? '');
    if (dye && dyePrice(dye, rules) > 0 && !dyesOwned.includes(dye.id) && !bottles.some((b) => b.id === dye.id)) {
      bottles.push({ id: dye.id, price: dyePrice(dye, rules) });
    }
  }
  const total = [...items, ...bottles].reduce((sum, l) => sum + l.price, 0);
  return { items, dyes: bottles, total };
}

/** Pays the cart. When the wallet is short nothing changes and `missing` says how much is lacking. */
export function checkout(
  cart: Cart,
  wallet: number,
  owned: readonly string[],
  dyesOwned: readonly string[],
): CheckoutResult {
  if (wallet < cart.total) return { ok: false, missing: cart.total - wallet };
  return {
    ok: true,
    wallet: wallet - cart.total,
    owned: [...owned, ...cart.items.map((l) => l.id)],
    dyesOwned: [...dyesOwned, ...cart.dyes.map((l) => l.id)],
  };
}

/** Stable text of a look: `slot:item[~dye]` in slot order, joined by `|`. Only worn items count. */
export function lookSignature(outfit: Outfit, itemDye: ItemDye): string {
  return SLOT_ORDER.flatMap((slot) => {
    const id = outfit[slot];
    if (id === undefined) return [];
    const dye = itemDye[id];
    return [`${slot}:${id}${dye ? `~${dye}` : ''}`];
  }).join('|');
}

const parts = (sig: string): Map<string, string> =>
  new Map(sig === '' ? [] : sig.split('|').map((p) => [p.slice(0, p.indexOf(':')), p.slice(p.indexOf(':') + 1)]));

/** Slots that differ between two signatures (item, dye, added or removed). */
function changes(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  let n = 0;
  for (const slot of new Set([...pa.keys(), ...pb.keys()])) if (pa.get(slot) !== pb.get(slot)) n++;
  return n;
}

/** How new a look is against the last `rules.novelty.window` rated looks of the cat (newest last). */
export function novelty(sig: string, history: readonly string[], rules: EconomyRules): Novelty {
  const recent = history.slice(-rules.novelty.window);
  const fewest = recent.reduce((min, past) => Math.min(min, changes(sig, past)), 2);
  return Math.min(fewest, 2) as Novelty;
}

/** Coins for a rating: full for a new look, a fraction for a near one, a tip for a repeat. */
export function payout(stars: Stars, noveltyLevel: Novelty, rules: EconomyRules): number {
  if (noveltyLevel === 0) return rules.payout.tip;
  const full = rules.payout.byStars[stars];
  return noveltyLevel === 1 ? Math.round(full * rules.payout.nearFactor) : full;
}

/** Milestones crossed for the first time by reaching `stars` when the cat's record was `best`. */
export function milestoneBonus(
  best: Stars | undefined,
  stars: Stars,
  rules: EconomyRules,
): { stars: 3 | 4 | 5; amount: number }[] {
  const table = [
    { stars: 3, amount: rules.milestones.threeStars },
    { stars: 4, amount: rules.milestones.fourStars },
    { stars: 5, amount: rules.milestones.fiveStars },
  ] as const;
  return table.filter((m) => stars >= m.stars && (best === undefined || best < m.stars)).map((m) => ({ ...m }));
}
