// The pace of the economy (docs/design/segunda-etapa.md, S4) with the real data and a seeded model player.
// Acceptance (F21.1, decided by the game designer in docs/reviews/hito-A.md): 50 % of what can be bought between
// sessions 3 and 5, 100 % between sessions 8 and 11, and at least 70 % of the real money coming from discovering.
// The design's "90 %" is the potential: 2320 of the 2350 that can be spent can be earned only once.
import { describe, expect, it } from 'vitest';
import { simulate, type Simulation } from './support/modelPlayer';

const SEEDS = [7, 1, 2, 3, 4];
const runs: Simulation[] = SEEDS.map((seed) => simulate({ seed, maxSessions: 20 }));
const run = runs[0];

/** Share of the buttons earned (before reaching 100 %) that came from discovering, 0 to 1. */
const discoveryShare = (r: Simulation): number => {
  const until = r.sessions.slice(0, r.fullSession ?? r.sessions.length);
  const discovery = until.reduce((n, s) => n + s.earnedDiscovery, 0);
  const payout = until.reduce((n, s) => n + s.earnedPayout, 0);
  return discovery / (discovery + payout);
};

describe('balance with the model player', () => {
  it('is deterministic for a seed', () => {
    const again = simulate({ seed: SEEDS[0], maxSessions: 20 });
    expect(again.sessions).toEqual(run.sessions);
  });

  it('plays 6 rated looks per session', () => {
    for (const s of run.sessions) expect(s.looks).toBe(6);
  });

  it('spends only what it has: the wallet never goes below zero', () => {
    for (const r of runs) for (const s of r.sessions) expect(s.wallet).toBeGreaterThanOrEqual(0);
  });

  it('buys about half of what can be bought between sessions 3 and 5', () => {
    for (const r of runs) {
      expect(r.halfSession).toBeGreaterThanOrEqual(3);
      expect(r.halfSession).toBeLessThanOrEqual(5);
    }
  });

  it('buys everything between sessions 8 and 11', () => {
    for (const r of runs) {
      expect(r.fullSession).not.toBeNull();
      expect(r.fullSession).toBeGreaterThanOrEqual(8);
      expect(r.fullSession).toBeLessThanOrEqual(11);
    }
  });

  it('earns at least 70 % of its buttons from discovering', () => {
    for (const r of runs) expect(discoveryShare(r)).toBeGreaterThanOrEqual(0.7);
  });
});
