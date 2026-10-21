import { describe, expect, it } from 'vitest';
import { yarnState, type YarnOptions } from '../../src/game/domain/yarn';

const opts: YarnOptions = { x0: 340, x1: 940, y: 400, amp: 18, waves: 3, radius: 46, minRadiusRatio: 0.55, segments: 40 };

describe('yarnState (preloader)', () => {
  it('starts with the ball at the left end and no thread', () => {
    const s = yarnState(0, opts);
    expect(s.ball.x).toBeCloseTo(opts.x0);
    expect(s.ball.radius).toBeCloseTo(opts.radius);
    expect(s.ball.rotation).toBe(0);
    expect(s.thread.length).toBeLessThanOrEqual(1);
  });

  it('ends with the ball at the right end, smaller, and the whole thread out', () => {
    const s = yarnState(1, opts);
    expect(s.ball.x).toBeCloseTo(opts.x1);
    expect(s.ball.radius).toBeCloseTo(opts.radius * opts.minRadiusRatio);
    expect(s.thread[0].x).toBeCloseTo(opts.x0);
    expect(s.thread[s.thread.length - 1].x).toBeCloseTo(opts.x1);
  });

  it('the ball rolls forward, shrinks and the thread grows with the progress', () => {
    let prev = yarnState(0, opts);
    for (let p = 0.1; p <= 1.0001; p += 0.1) {
      const s = yarnState(p, opts);
      expect(s.ball.x).toBeGreaterThan(prev.ball.x);
      expect(s.ball.rotation).toBeGreaterThan(prev.ball.rotation);
      expect(s.ball.radius).toBeLessThan(prev.ball.radius);
      expect(s.thread.length).toBeGreaterThanOrEqual(prev.thread.length);
      prev = s;
    }
  });

  it('the thread ends under the ball and waves around the baseline', () => {
    const s = yarnState(0.6, opts);
    const last = s.thread[s.thread.length - 1];
    expect(last.x).toBeCloseTo(s.ball.x);
    expect(last.y).toBeCloseTo(s.ball.y);
    for (const p of s.thread) expect(Math.abs(p.y - opts.y)).toBeLessThanOrEqual(opts.amp + 0.001);
  });

  it('clamps the progress', () => {
    expect(yarnState(-1, opts).ball.x).toBeCloseTo(opts.x0);
    expect(yarnState(5, opts).ball.x).toBeCloseTo(opts.x1);
  });
});
