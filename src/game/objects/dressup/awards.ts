// Paying a discovery (S2, F14.3): the first time a taste (per cat) or a combo (per player) shows, it pays. The rule is
// `applyDiscovery` (domain/progress.ts); this is the thin layer that writes the result to the registry (which saves it) and asks
// the purse for the buttons. It takes only what it uses of the scene, so it has no Phaser in it.
import { DressUpEvents, RegistryKeys } from '../../constants';
import { applyDiscovery } from '../../domain/progress';
import type { EconomyRules, Point, Progress, TasteKey } from '../../domain/types';
import type { WalletFlightRequest } from './WalletController';

/** The part of a Phaser scene that paying needs: its events and its registry. */
export interface AwardHost {
  events: { emit(event: string, ...args: unknown[]): unknown };
  registry: { get(key: string): unknown; set(key: string, value: unknown): unknown };
}

/**
 * Pays a discovery and returns the coins paid (0 when it was already known, so nothing is written). With `from`, the buttons fly
 * in from that point to the purse; they are asked BEFORE the progress changes so the purse holds its number until they land.
 * `key` is the TasteKey (with `catId`) or the combo id.
 */
export function payDiscovery(
  host: AwardHost,
  kind: 'taste' | 'combo',
  key: TasteKey | string,
  rules: EconomyRules,
  catId: string | undefined,
  from: Point | null,
): number {
  const current = host.registry.get(RegistryKeys.Progress) as Progress | undefined;
  if (!current) return 0;
  const { progress, events } = applyDiscovery(current, kind, key, rules, catId);
  const amount = events.reduce((sum, e) => sum + ('amount' in e ? e.amount : 0), 0);
  if (events.length === 0) return 0;
  if (from) {
    const flight: WalletFlightRequest = { direction: 'in', at: from, coins: amount };
    host.events.emit(DressUpEvents.WalletFlight, flight);
  }
  host.registry.set(RegistryKeys.Progress, progress);
  return amount;
}
