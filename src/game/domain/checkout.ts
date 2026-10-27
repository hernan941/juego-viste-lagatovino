// Pure TS, no Phaser (ADR 0010, 0017). The seller's till at Ready (S3, F13.6): what is worn and not paid, paying all of it or
// nothing, taking off what is not the player's, and the combos that still have an unpaid piece.
import { findCompletedCombos } from './combos';
import { cartFromOutfit, checkout, unpaidPrice, type Cart, type CartContext } from './economy';
import { SLOT_ORDER } from './slots';
import type { ClothingDef, ComboDef, EconomyRules, ItemDye, Outfit, Progress } from './types';

export interface CheckoutPlan {
  cart: Cart;
  /** Worn items not paid yet, in slot order. */
  unpaidItems: string[];
  /** Worn items that carry a bottle not paid yet (the item itself may be owned). */
  unpaidDyed: string[];
  /** The wallet reaches for the whole cart. */
  affordable: boolean;
  /** Buttons lacking when it does not (0 otherwise). */
  missing: number;
}

/** What the till would charge for the look as it is now. */
export function checkoutPlan(
  outfit: Outfit,
  itemDye: ItemDye,
  progress: Pick<Progress, 'owned' | 'dyesOwned' | 'wallet'>,
  ctx: CartContext,
): CheckoutPlan {
  const cart = cartFromOutfit(outfit, itemDye, progress.owned, progress.dyesOwned, ctx);
  const unpaidBottles = new Set(cart.dyes.map((d) => d.id));
  const worn = SLOT_ORDER.flatMap((slot) => outfit[slot] ?? []);
  const unpaidDyed = worn.filter((id) => unpaidBottles.has(itemDye[id] ?? ''));
  return {
    cart,
    unpaidItems: cart.items.map((l) => l.id),
    unpaidDyed,
    affordable: progress.wallet >= cart.total,
    missing: Math.max(0, cart.total - progress.wallet),
  };
}

/** A line of the till: a garment or a bottle of dye. */
export interface CartLineRef {
  kind: 'item' | 'dye';
  id: string;
}

/**
 * The look without one line of the till (A6): a garment comes off with the dye it carried; a bottle is cleared from every garment
 * that wore it and the garments stay. The inputs are never changed.
 */
export function withoutLine(outfit: Outfit, itemDye: ItemDye, ref: CartLineRef): { outfit: Outfit; itemDye: ItemDye } {
  if (ref.kind === 'item') {
    return {
      outfit: Object.fromEntries(Object.entries(outfit).filter(([, id]) => id !== ref.id)) as Outfit,
      itemDye: Object.fromEntries(Object.entries(itemDye).filter(([id]) => id !== ref.id)),
    };
  }
  return { outfit: { ...outfit }, itemDye: Object.fromEntries(Object.entries(itemDye).filter(([, dye]) => dye !== ref.id)) };
}

/** The progress after paying the whole cart, or null when the wallet is short (nothing is ever paid in part). */
export function payPlan(progress: Progress, plan: CheckoutPlan): Progress | null {
  const paid = checkout(plan.cart, progress.wallet, progress.owned, progress.dyesOwned);
  if (!paid.ok) return null;
  return { ...progress, wallet: paid.wallet, owned: paid.owned, dyesOwned: paid.dyesOwned };
}

/** The look with only what is the player's: unpaid items and unpaid bottles come off. */
export function keepOnlyOwned(outfit: Outfit, itemDye: ItemDye, plan: CheckoutPlan): { outfit: Outfit; itemDye: ItemDye } {
  const off = new Set(plan.unpaidItems);
  const clear = new Set([...plan.unpaidItems, ...plan.unpaidDyed]);
  return {
    outfit: Object.fromEntries(Object.entries(outfit).filter(([, id]) => !off.has(id))) as Outfit,
    itemDye: Object.fromEntries(Object.entries(itemDye).filter(([id]) => !clear.has(id))),
  };
}

/** True when a worn piece that the combo asks for is not the player's yet: the combo sounds, but the box has to wait. */
export function hasUnpaidPieces(
  combo: ComboDef,
  outfit: Outfit,
  owned: readonly string[],
  { catalog, rules }: { catalog: readonly ClothingDef[]; rules: EconomyRules },
): boolean {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return combo.requires.some((req) => {
    const id = 'itemId' in req ? Object.values(outfit).find((w) => w === req.itemId) : outfit[req.slot];
    const worn = id === undefined ? undefined : byId.get(id);
    return worn !== undefined && unpaidPrice(worn, owned, rules) > 0;
  });
}

export type ComboFate = 'repeat' | 'hook' | 'new';

type PieceContext = { catalog: readonly ClothingDef[]; rules: EconomyRules };

/**
 * What a combo that was just completed does: `repeat` (its prize is already won or on its way: a short reaction), `hook` (new, but a
 * piece is not paid: it sounds and the seller sells the gift, with no box) or `new` (the box comes).
 */
export function comboFate(
  combo: ComboDef,
  { won, outfit, owned, ctx }: { won: boolean; outfit: Outfit; owned: readonly string[]; ctx: PieceContext },
): ComboFate {
  if (won) return 'repeat';
  return hasUnpaidPieces(combo, outfit, owned, ctx) ? 'hook' : 'new';
}

/** The combos complete in the outfit whose box was waiting for payment: not won or queued, and every piece is the player's now. */
export function combosDue(
  outfit: Outfit,
  combos: readonly ComboDef[],
  doneIds: readonly string[],
  owned: readonly string[],
  ctx: PieceContext,
): ComboDef[] {
  return findCompletedCombos(outfit, combos, ctx.catalog).filter((c) => !doneIds.includes(c.id) && !hasUnpaidPieces(c, outfit, owned, ctx));
}
