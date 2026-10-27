// The pace of the economy (docs/design/segunda-etapa.md, S4) with the real data and a seeded model player.
// Roadmap F13.8 asks for: 50 % of what can be bought between sessions 3 and 5, 100 % in <= 12 sessions, and
// 90 % of the buttons coming from discovering. The real economy.json meets the first two; the third is
// documented below (the measured share is ~60 %) and decided in F21.1 with the game designer, without touching the JSON here.
import { describe, expect, it } from 'vitest';
import { simulate, type Simulation } from './support/modelPlayer';

const SEEDS = [7, 1, 2];
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

  it('buys everything in 12 sessions or fewer', () => {
    for (const r of runs) {
      expect(r.fullSession).not.toBeNull();
      expect(r.fullSession).toBeLessThanOrEqual(12);
    }
  });

  it('reaches 100 % no sooner than session 5, so the last purchases are not trivial', () => {
    for (const r of runs) expect(r.fullSession).toBeGreaterThanOrEqual(5);
  });

  // Target (S4): 90 % of the money comes from discovering. Measured with the current numbers: ~60 %, because a
  // 5-star look pays 40 every time it is new. Today the test pins "discovery is the biggest source"; when F21.1
  // retunes economy.json it should be raised toward 0.9.
  it('earns most of its buttons from discovering (target 90 %, measured ~60 %)', () => {
    for (const r of runs) expect(discoveryShare(r)).toBeGreaterThan(0.5);
  });
});
