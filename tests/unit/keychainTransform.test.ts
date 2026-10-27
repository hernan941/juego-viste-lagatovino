// F19.3: the plan of the transformation of the cat into a keychain (S8, ADR 0021) as a pure function of time. The scene reads
// `transformFrame(t)` and moves what it says: skipping is jumping to the end, and nothing here depends on the frame rate.
import { describe, expect, it } from 'vitest';
import { backIn, bounceOut, clamp01, sineInOut } from '../../src/game/domain/ease';
import {
  KEYCHAIN_PHASES, STREAK_FRAMES, phaseAt, streakStops, transformFrame, transformPlan,
} from '../../src/game/domain/keychainTransform';

const FULL = { reduced: false, charm: false };
const REDUCED = { reduced: true, charm: false };

describe('ease', () => {
  it('start at 0, end at 1 and stay clamped', () => {
    for (const f of [backIn, bounceOut, sineInOut]) {
      expect(f(0)).toBeCloseTo(0, 5);
      expect(f(1)).toBeCloseTo(1, 5);
      expect(f(-3)).toBeCloseTo(0, 5);
      expect(f(7)).toBeCloseTo(1, 5);
    }
    expect(clamp01(2)).toBe(1);
    expect(clamp01(-2)).toBe(0);
  });

  it('back-in pulls back before it goes and bounce-out never passes 1', () => {
    expect(backIn(0.2)).toBeLessThan(0);
    for (let i = 0; i <= 20; i++) expect(bounceOut(i / 20)).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('transformPlan', () => {
  it('takes about 2.2 s and the phases come in order without gaps or overlaps', () => {
    const { spans, total } = transformPlan(false);
    expect(total).toBeGreaterThanOrEqual(2100);
    expect(total).toBeLessThanOrEqual(2300);
    expect(spans.map((s) => s.phase)).toEqual(['oven', 'turn', 'varnish', 'hardware', 'swing']);
    expect(spans[0]!.from).toBe(0);
    spans.forEach((s, i) => {
      expect(s.to).toBeGreaterThan(s.from);
      if (i > 0) expect(s.from).toBe(spans[i - 1]!.to);
    });
    expect(spans[spans.length - 1]!.to).toBe(total);
  });

  it('with reduced motion has no oven nor varnish sweep and is shorter than the full one', () => {
    const { spans, total } = transformPlan(true);
    expect(spans.map((s) => s.phase)).toEqual(['turn', 'hardware', 'swing']);
    expect(total).toBeLessThan(transformPlan(false).total);
    expect(total).toBeLessThanOrEqual(1100);
  });

  it('every phase is one of the named phases of the hook', () => {
    for (const reduced of [false, true]) for (const s of transformPlan(reduced).spans) expect(KEYCHAIN_PHASES).toContain(s.phase);
  });
});

describe('phaseAt', () => {
  it('names the phase of each moment and "package" once the transformation is over', () => {
    expect(phaseAt(0, false)).toBe('oven');
    expect(phaseAt(400, false)).toBe('turn');
    expect(phaseAt(800, false)).toBe('varnish');
    expect(phaseAt(1200, false)).toBe('hardware');
    expect(phaseAt(1800, false)).toBe('swing');
    expect(phaseAt(transformPlan(false).total, false)).toBe('package');
    expect(phaseAt(99999, false)).toBe('package');
    expect(phaseAt(100, true)).toBe('turn');
  });
});

describe('transformFrame (full motion)', () => {
  it('starts as the cat alone: nothing of the keychain shows', () => {
    const f = transformFrame(0, FULL);
    expect(f.cat).toMatchObject({ alpha: 1, scale: 1, flip: 1 });
    expect(f.keychain.alpha).toBe(0);
    expect(f.flash).toBeLessThan(0.2);
    expect(f.streak).toBeNull();
    expect(f.ring.alpha).toBe(0);
    expect(f.swing).toBe(false);
  });

  it('flashes up fast and then fades out during the oven', () => {
    const peak = Math.max(...[0, 35, 70, 105].map((t) => transformFrame(t, FULL).flash));
    expect(peak).toBeGreaterThan(0.9);
    expect(transformFrame(320, FULL).flash).toBeCloseTo(0, 5);
    expect(transformFrame(200, FULL).flash).toBeLessThan(peak);
  });

  it('shrinks to 0.6 (after a small anticipation) by the end of the oven', () => {
    const scales = [0, 40, 80, 120, 160, 200, 220].map((t) => transformFrame(t, FULL).cat.scale);
    expect(Math.max(...scales)).toBeGreaterThan(1);
    expect(transformFrame(220, FULL).cat.scale).toBeCloseTo(0.6, 5);
    expect(transformFrame(320, FULL).cat.scale).toBeCloseTo(0.6, 5);
  });

  it('turns half way around: the cat narrows to nothing, then the porcelain widens, and the swap is at the thin point', () => {
    const t0 = 320;
    const early = transformFrame(t0 + 60, FULL);
    expect(early.cat.alpha).toBe(1);
    expect(early.keychain.alpha).toBe(0);
    expect(early.cat.flip).toBeGreaterThan(0);
    expect(early.cat.flip).toBeLessThan(1);
    const mid = transformFrame(t0 + 150, FULL);
    expect(mid.cat.flip).toBeCloseTo(0, 1);
    const late = transformFrame(t0 + 240, FULL);
    expect(late.cat.alpha).toBe(0);
    expect(late.keychain).toMatchObject({ alpha: 1 });
    expect(late.keychain.flip).toBeGreaterThan(0);
    expect(late.keychain.flip).toBeLessThan(1);
    expect(transformFrame(620, FULL).keychain.flip).toBeCloseTo(1, 5);
  });

  it('sweeps the varnish streak across the frames in order, only while it is varnishing', () => {
    expect(transformFrame(610, FULL).streak).toBeNull();
    expect(transformFrame(1050, FULL).streak).toBeNull();
    const seen: number[] = [];
    for (let t = 620; t < 1040; t += 10) {
      const s = transformFrame(t, FULL).streak;
      expect(s).not.toBeNull();
      seen.push(s as number);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    expect(seen[0]).toBe(0);
    expect(seen[seen.length - 1]).toBe(STREAK_FRAMES - 1);
    expect(new Set(seen).size).toBe(STREAK_FRAMES);
  });

  it('screws the eyelet in (a full turn that ends at 0), drops the ring with a bounce and unrolls the chain, in that order', () => {
    expect(transformFrame(1030, FULL).eyelet.alpha).toBe(0);
    const a = transformFrame(1100, FULL).eyelet;
    expect(a.alpha).toBe(1);
    expect(a.angle).toBeGreaterThan(0);
    expect(a.angle).toBeLessThanOrEqual(360);
    expect(transformFrame(1300, FULL).eyelet.angle).toBe(0);
    expect(transformFrame(1130, FULL).ring.alpha).toBe(0);
    const falling = transformFrame(1250, FULL).ring;
    expect(falling.alpha).toBe(1);
    expect(falling.drop).toBeGreaterThan(0);
    expect(falling.drop).toBeLessThan(1);
    expect(transformFrame(1600, FULL).ring.drop).toBe(0);
    expect(transformFrame(1380, FULL).chain).toBe(0);
    expect(transformFrame(1500, FULL).chain).toBeGreaterThan(0);
    expect(transformFrame(1600, FULL).chain).toBe(1);
  });

  it('the ring never goes below its place while it bounces', () => {
    for (let t = 1040; t <= 1600; t += 8) expect(transformFrame(t, FULL).ring.drop).toBeGreaterThanOrEqual(0);
  });

  it('the charm shows only with 5 stars', () => {
    expect(transformFrame(1600, { reduced: false, charm: false }).charm).toBe(0);
    expect(transformFrame(1600, { reduced: false, charm: true }).charm).toBe(1);
    expect(transformFrame(1500, { reduced: false, charm: true }).charm).toBeLessThan(1);
  });

  it('starts the swing when the hardware is on and the end state is the finished keychain', () => {
    expect(transformFrame(1590, FULL).swing).toBe(false);
    expect(transformFrame(1600, FULL).swing).toBe(true);
    const end = transformFrame(99999, { reduced: false, charm: true });
    expect(end).toMatchObject({
      phase: 'package', flash: 0, streak: null, swing: true, chain: 1, charm: 1,
      cat: { alpha: 0 }, keychain: { alpha: 1, flip: 1 }, eyelet: { alpha: 1, angle: 0 }, ring: { alpha: 1, drop: 0 },
    });
  });

  it('does not depend on how the time got there: the same t gives the same frame', () => {
    expect(transformFrame(777, FULL)).toEqual(transformFrame(777, FULL));
  });
});

describe('transformFrame (reduced motion)', () => {
  it('has no flash, no turn, no sweep and no screwing: only fades', () => {
    for (let t = 0; t <= 1100; t += 25) {
      const f = transformFrame(t, REDUCED);
      expect(f.flash).toBe(0);
      expect(f.cat.flip).toBe(1);
      expect(f.keychain.flip).toBe(1);
      expect(f.streak).toBeNull();
      expect(f.eyelet.angle).toBe(0);
      expect(f.ring.drop).toBe(0);
      expect(f.cat.scale).toBe(1);
    }
  });

  it('cross-fades the cat into the keychain and the pieces fade in, ending in the same finished state', () => {
    const mid = transformFrame(200, REDUCED);
    expect(mid.cat.alpha).toBeGreaterThan(0);
    expect(mid.cat.alpha).toBeLessThan(1);
    expect(mid.keychain.alpha).toBeCloseTo(1 - mid.cat.alpha, 5);
    expect(transformFrame(0, REDUCED).keychain.alpha).toBe(0);
    const hw = transformFrame(plan('hardware').from + 60, REDUCED);
    expect(hw.ring.alpha).toBeGreaterThan(0);
    expect(hw.ring.alpha).toBeLessThan(1);
    const end = transformFrame(99999, { reduced: true, charm: true });
    expect(end).toMatchObject({ phase: 'package', swing: true, chain: 1, charm: 1, cat: { alpha: 0 }, keychain: { alpha: 1 }, eyelet: { alpha: 1 }, ring: { alpha: 1 } });
  });
});

function plan(phase: string) {
  return transformPlan(true).spans.find((s) => s.phase === phase)!;
}

describe('streakStops', () => {
  it('goes from fully outside on the left to fully outside on the right, evenly', () => {
    const stops = streakStops(300, 7, 220);
    expect(stops).toHaveLength(7);
    expect(stops[0]!).toBeLessThanOrEqual(-110);
    expect(stops[6]!).toBeGreaterThanOrEqual(300 + 110);
    const step = stops[1]! - stops[0]!;
    stops.forEach((x, i) => { if (i > 0) expect(x - stops[i - 1]!).toBeCloseTo(step, 5); });
  });
});
