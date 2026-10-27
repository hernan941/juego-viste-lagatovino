import { describe, expect, it } from 'vitest';
import {
  MAX_TOTAL_MS, SKIP_FACTOR, buttonCount, catReaction, ceremonyPlan, eventCoins, skip,
  type CeremonyPlan, type CeremonyStep,
} from '../../src/game/domain/ceremony';
import type { BreakdownKind, ProgressEvent, RatingResult, Stars } from '../../src/game/domain/types';

const KINDS: BreakdownKind[] = ['style', 'love', 'dislike', 'favoriteItem', 'complete', 'combo', 'favoriteDye'];
const result = (stars: Stars, lines = 4): RatingResult => ({
  points: 10, stars, breakdown: KINDS.slice(0, lines).map((kind) => ({ kind, points: 1 })),
});
const of = <K extends CeremonyStep['kind']>(plan: CeremonyPlan, kind: K) =>
  plan.steps.filter((s): s is Extract<CeremonyStep, { kind: K }> => s.kind === kind);

const many: ProgressEvent[] = [
  { type: 'coins', amount: 40 },
  { type: 'milestone', stars: 5, amount: 50 },
  { type: 'tasteFound', taste: 'favorite', amount: 15 },
  { type: 'tasteFound', taste: 'love:gala', amount: 15 },
  { type: 'comboFirst', comboId: 'navidad', amount: 40 },
  { type: 'setCompleted', setId: 'navidad' },
  { type: 'unlock', ids: ['frame-x'] },
];

describe('catReaction', () => {
  it('follows the stars', () => {
    expect(catReaction(1)).toMatchObject({ expression: 'parpadeo', comfort: true, confetti: false });
    expect(catReaction(2).comfort).toBe(true);
    expect(catReaction(3)).toMatchObject({ expression: 'feliz', comfort: false });
    expect(catReaction(4)).toMatchObject({ expression: 'amor', purr: 'short' });
    expect(catReaction(5)).toMatchObject({ expression: 'amor', purr: 'long', confetti: true });
  });
});

describe('ceremonyPlan, bare cat (A2)', () => {
  it('knows the look is bare when the card only has the placeholder', () => {
    const bare: RatingResult = { points: 0, stars: 1, breakdown: [{ kind: 'bare', points: 0 }] };
    expect(ceremonyPlan(bare, []).bare).toBe(true);
    expect(ceremonyPlan(result(1), []).bare).toBe(false);
    expect(ceremonyPlan({ ...bare, breakdown: [{ kind: 'plain', points: 0 }] }, []).bare).toBe(false);
  });
});

describe('eventCoins and buttonCount', () => {
  it('adds the amounts of the events and ignores those without one', () => {
    expect(eventCoins(many)).toBe(40 + 50 + 15 + 15 + 40);
    expect(eventCoins([])).toBe(0);
  });

  it('shows no buttons without coins, one per 5 coins up to 12, and 3 at most when reduced', () => {
    expect(buttonCount(0, 'full')).toBe(0);
    expect(buttonCount(3, 'full')).toBe(1);
    expect(buttonCount(23, 'full')).toBe(5);
    expect(buttonCount(1000, 'full')).toBe(12);
    expect(buttonCount(1000, 'reduced')).toBe(3);
    expect(buttonCount(3, 'reduced')).toBe(1);
    expect(buttonCount(0, 'reduced')).toBe(0);
  });
});

describe('ceremonyPlan', () => {
  it('runs in order: judge, lines, stamps, reaction', () => {
    const plan = ceremonyPlan(result(3), [{ type: 'coins', amount: 18 }]);
    const [judge] = plan.steps;
    expect(judge).toMatchObject({ kind: 'judgeEnter', at: 0, slide: true });
    const lastLine = Math.max(...of(plan, 'line').map((s) => s.at + s.ms));
    expect(Math.min(...of(plan, 'stamp').map((s) => s.at))).toBeGreaterThanOrEqual(lastLine);
    const lastStamp = Math.max(...of(plan, 'stamp').map((s) => s.at + s.ms));
    expect(of(plan, 'reaction')[0].at).toBe(lastStamp);
    expect(Math.min(...of(plan, 'coin').map((s) => s.at))).toBeGreaterThanOrEqual(lastStamp);
    expect(plan.steps.map((s) => s.at)).toEqual([...plan.steps.map((s) => s.at)].sort((a, b) => a - b));
  });

  it('lines come in 260 ms apart, five at most', () => {
    const lines = of(ceremonyPlan(result(5, 7), []), 'line');
    expect(lines).toHaveLength(5);
    lines.slice(1).forEach((s, i) => expect(s.at - lines[i].at).toBe(260));
  });

  it('one stamp per star, 140 ms apart, and the fifth is golden', () => {
    for (const stars of [1, 2, 3, 4, 5] as const) {
      const stamps = of(ceremonyPlan(result(stars), []), 'stamp');
      expect(stamps).toHaveLength(stars);
      stamps.slice(1).forEach((s, i) => expect(s.at - stamps[i].at).toBe(140));
      expect(stamps.filter((s) => s.golden)).toHaveLength(stars === 5 ? 1 : 0);
    }
  });

  it('works without lines or events', () => {
    const plan = ceremonyPlan(result(1, 0), []);
    expect(of(plan, 'line')).toEqual([]);
    expect(of(plan, 'coin')).toEqual([]);
    expect(of(plan, 'stamp')[0].at).toBe(420);
  });

  it('lasts 6 s at most, even in the heaviest case', () => {
    const lots: ProgressEvent[] = [...many, ...many, ...many];
    for (const profile of ['full', 'reduced'] as const) {
      expect(ceremonyPlan(result(5, 7), many, profile).totalMs).toBeLessThanOrEqual(MAX_TOTAL_MS);
      expect(ceremonyPlan(result(5, 7), lots, profile).totalMs).toBeLessThanOrEqual(MAX_TOTAL_MS);
    }
  });

  it('notes are 700 ms apart when there is room and never lost when squeezed', () => {
    const five = many.slice(0, 6);
    const plan = ceremonyPlan(result(5, 5), five);
    const notes = of(plan, 'note');
    expect(notes).toHaveLength(five.filter((e) => e.type !== 'coins').length);
    notes.slice(1).forEach((s, i) => expect(s.at - notes[i].at).toBe(700));
    const crowded = of(ceremonyPlan(result(5, 5), Array.from({ length: 20 }, () => many[5])), 'note');
    expect(crowded).toHaveLength(20);
    expect(crowded[1].at - crowded[0].at).toBeLessThan(700);
  });

  it('button credits always add up to the coins of the events', () => {
    for (const profile of ['full', 'reduced'] as const) {
      const plan = ceremonyPlan(result(4), many, profile);
      expect(of(plan, 'coin').reduce((n, s) => n + s.credit, 0)).toBe(plan.coins);
      expect(plan.coins).toBe(eventCoins(many));
    }
  });

  it('reduced: no slide, no shake, no flight, and 3 buttons', () => {
    const plan = ceremonyPlan(result(5), many, 'reduced');
    expect(of(plan, 'judgeEnter')[0].slide).toBe(false);
    expect(of(plan, 'stamp').every((s) => !s.shake)).toBe(true);
    const coins = of(plan, 'coin');
    expect(coins).toHaveLength(3);
    expect(coins.every((c) => !c.fly)).toBe(true);
    const full = ceremonyPlan(result(5), many, 'full');
    expect(of(full, 'stamp').every((s) => s.shake)).toBe(true);
    expect(of(full, 'coin')).toHaveLength(12);
  });
});

describe('skip', () => {
  const plan = ceremonyPlan(result(5), many);

  it('speeds up what is left by 3 and never drops a step', () => {
    const fast = skip(plan, 1000);
    expect(fast.steps).toHaveLength(plan.steps.length);
    expect(fast.coins).toBe(plan.coins);
    expect(of(fast, 'coin').reduce((n, s) => n + s.credit, 0)).toBe(plan.coins);
    expect(of(fast, 'note')).toHaveLength(of(plan, 'note').length);
    expect(fast.totalMs).toBeCloseTo(1000 + (plan.totalMs - 1000) / SKIP_FACTOR, 5);
  });

  it('keeps what already started where it was', () => {
    const fast = skip(plan, 1000);
    const before = plan.steps.filter((s) => s.at < 1000);
    before.forEach((s, i) => expect(fast.steps[i].at).toBe(s.at));
    // a step running at the moment of the tap finishes faster
    const running = plan.steps.find((s) => s.at < 1000 && s.at + s.ms > 1000)!;
    const now = fast.steps.find((s) => s.kind === running.kind && s.at === running.at)!;
    expect(now.at + now.ms).toBeLessThan(running.at + running.ms);
    expect(now.at + now.ms).toBeGreaterThan(1000);
  });

  it('does not change the original plan', () => {
    const copy = JSON.parse(JSON.stringify(plan)) as CeremonyPlan;
    skip(plan, 500);
    expect(plan).toEqual(copy);
  });

  it('skipping at the very start or after the end is safe', () => {
    expect(skip(plan, 0).totalMs).toBeCloseTo(plan.totalMs / SKIP_FACTOR, 5);
    expect(skip(plan, plan.totalMs + 100).totalMs).toBe(plan.totalMs);
  });
});
