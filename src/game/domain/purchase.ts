// Pure TS, no Phaser (ADR 0010, 0017). Buying one garment by touching its price tag (S3, F13.5).
import { checkout, unpaidPrice } from './economy';
import type { ClothingDef, EconomyRules, Progress } from './types';

export type PurchaseResult =
  | { ok: true; progress: Progress; price: number }
  /** `short`: the wallet does not reach (`missing` buttons lacking). `nothing-to-pay`: already owned, a starter or a prize. */
  | { ok: false; reason: 'short'; missing: number }
  | { ok: false; reason: 'nothing-to-pay' };

/** Pays one garment. The input is never changed; when it cannot be paid the progress stays as it was. */
export function buyItem(progress: Progress, item: ClothingDef, rules: EconomyRules): PurchaseResult {
  const price = unpaidPrice(item, progress.owned, rules);
  if (price <= 0) return { ok: false, reason: 'nothing-to-pay' };
  const paid = checkout({ items: [{ id: item.id, price }], dyes: [], total: price }, progress.wallet, progress.owned, progress.dyesOwned);
  if (!paid.ok) return { ok: false, reason: 'short', missing: paid.missing };
  return { ok: true, price, progress: { ...progress, wallet: paid.wallet, owned: paid.owned, dyesOwned: paid.dyesOwned } };
}
