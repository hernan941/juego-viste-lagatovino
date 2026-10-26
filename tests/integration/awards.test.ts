import { describe, expect, it } from 'vitest';
import economy from '../../src/game/data/economy.json';
import { DressUpEvents, RegistryKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import type { EconomyRules, Progress } from '../../src/game/domain/types';
import { payDiscovery, type AwardHost } from '../../src/game/objects/dressup/awards';

const rules = economy as unknown as EconomyRules;

function host(progress: Progress | undefined = emptyProgress(100)) {
  let current = progress;
  const log: string[] = [];
  const flights: unknown[] = [];
  const h: AwardHost = {
    events: { emit: (e, ...a) => { if (e === DressUpEvents.WalletFlight) { flights.push(a[0]); log.push('flight'); } } },
    registry: {
      get: (k) => (k === RegistryKeys.Progress ? current : undefined),
      set: (k, v) => { if (k === RegistryKeys.Progress) { current = v as Progress; log.push('write'); } },
    },
  };
  return { h, log, flights, progress: () => current! };
}

describe('payDiscovery (F14.3)', () => {
  it('the first combo pays comboBonus: wallet up, the combo in secrets, one write', () => {
    const t = host();
    expect(payDiscovery(t.h, 'combo', 'galactico', rules, undefined, null)).toBe(rules.comboBonus);
    expect(t.progress().wallet).toBe(100 + rules.comboBonus);
    expect(t.progress().secrets).toEqual(['galactico']);
    expect(t.log).toEqual(['write']);
  });

  it('the same combo again pays nothing and writes nothing', () => {
    const t = host();
    payDiscovery(t.h, 'combo', 'galactico', rules, undefined, null);
    expect(payDiscovery(t.h, 'combo', 'galactico', rules, undefined, null)).toBe(0);
    expect(t.progress().wallet).toBe(100 + rules.comboBonus);
    expect(t.log).toEqual(['write']);
  });

  it('a taste pays discoveryBonus once per cat', () => {
    const t = host();
    expect(payDiscovery(t.h, 'taste', 'love:estrellas', rules, 'luna', null)).toBe(rules.discoveryBonus);
    expect(payDiscovery(t.h, 'taste', 'love:estrellas', rules, 'luna', null)).toBe(0);
    expect(payDiscovery(t.h, 'taste', 'love:estrellas', rules, 'grisu', null)).toBe(rules.discoveryBonus);
    expect(t.progress().wallet).toBe(100 + 2 * rules.discoveryBonus);
  });

  it('with a start point the buttons are asked first and fly in from there', () => {
    const t = host();
    payDiscovery(t.h, 'combo', 'galactico', rules, undefined, { x: 5, y: 6 });
    expect(t.log).toEqual(['flight', 'write']);
    expect(t.flights).toEqual([{ direction: 'in', at: { x: 5, y: 6 }, coins: rules.comboBonus }]);
  });

  it('without a start point nothing flies (the scene is closing)', () => {
    const t = host();
    payDiscovery(t.h, 'combo', 'galactico', rules, undefined, null);
    expect(t.flights).toEqual([]);
  });

  it('a repeated discovery never asks for buttons', () => {
    const t = host();
    payDiscovery(t.h, 'combo', 'galactico', rules, undefined, null);
    payDiscovery(t.h, 'combo', 'galactico', rules, undefined, { x: 1, y: 1 });
    expect(t.flights).toEqual([]);
  });

  it('without a progress in the registry it does nothing', () => {
    const t = host();
    const empty = { events: t.h.events, registry: { get: () => undefined, set: () => { throw new Error('must not write'); } } } satisfies AwardHost;
    expect(payDiscovery(empty, 'combo', 'galactico', rules, undefined, null)).toBe(0);
  });
});
