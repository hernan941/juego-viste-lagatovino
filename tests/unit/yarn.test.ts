import { describe, expect, it } from 'vitest';
import { shownProgress, yarnState, type YarnOptions } from '../../src/game/domain/yarn';

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

describe('shownProgress (preloader minimum time)', () => {
  const frame = 1000 / 60;

  it('is held back by the clock: a cached load still takes the minimum time to show', () => {
    expect(shownProgress(0, 1, 0, 900, frame)).toBe(0);
    expect(shownProgress(0.3, 1, 450, 900, frame)).toBeGreaterThan(0.3);
    expect(shownProgress(0.3, 1, 450, 900, frame)).toBeLessThan(0.5);
    let shown = 0;
    for (let i = 0; i < 200; i++) shown = shownProgress(shown, 1, 450, 900, frame);
    expect(shown).toBeCloseTo(0.5, 2); // at half the time, half the bar even when everything is loaded
  });

  it('never goes back, even when the target drops', () => {
    expect(shownProgress(0.6, 0.2, 100, 900, frame)).toBe(0.6);
  });

  it('is exactly 1 when the load is done and the minimum time has passed', () => {
    let shown = 0;
    for (let i = 0; i < 200; i++) shown = shownProgress(shown, 1, 2000, 900, frame);
    expect(shown).toBe(1);
  });

  it('does not reach 1 before the minimum time, however fast the load', () => {
    let shown = 0;
    for (let i = 0; i < 200; i++) shown = shownProgress(shown, 1, 600, 900, frame);
    expect(shown).toBeLessThan(1);
  });

  it('eases by time, not by frame: the same second gives the same bar at 10 fps and at 60 fps', () => {
    let slow = 0;
    let fast = 0;
    for (let i = 0; i < 10; i++) slow = shownProgress(slow, 1, 5000, 900, 100);
    for (let i = 0; i < 60; i++) fast = shownProgress(fast, 1, 5000, 900, 1000 / 60);
    expect(slow).toBeCloseTo(fast, 2);
  });

  it('closes the gap faster once everything is loaded (the ball must not make the player wait after the load)', () => {
    const loading = shownProgress(0.2, 0.9, 5000, 900, 100);
    const loaded = shownProgress(0.2, 1, 5000, 900, 100);
    expect(loaded - 0.2).toBeGreaterThan((loading - 0.2) * (0.8 / 0.7)); // more than the same easing toward the larger gap
    expect(shownProgress(0.2, 1, 5000, 900, 250)).toBeGreaterThan(0.95);
  });
});
