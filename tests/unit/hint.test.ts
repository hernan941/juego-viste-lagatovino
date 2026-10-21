import { describe, expect, it } from 'vitest';
import { FIRST_HINT_MS, HintPlanner, REPEAT_HINT_MS } from '../../src/game/domain/hint';

/** Feeds the planner `frames` frames of `ms` each and returns the times (ms from the start) at which it said "show the hint". */
function run(p: HintPlanner, totalMs: number, frame = 100): number[] {
  const at: number[] = [];
  for (let t = frame; t <= totalMs; t += frame) if (p.update(frame)) at.push(t);
  return at;
}

describe('HintPlanner (first-use hint: no tutorial, a ghost garment travels to the cat)', () => {
  it('appears at 4 s and repeats every 5 s', () => {
    expect([FIRST_HINT_MS, REPEAT_HINT_MS]).toEqual([4000, 5000]);
    expect(run(new HintPlanner(), 20_000)).toEqual([4000, 9000, 14_000, 19_000]);
  });

  it('is quiet before the first 4 s', () => {
    expect(run(new HintPlanner(), 3900)).toEqual([]);
  });

  it('is turned off by the first drop, for good', () => {
    const p = new HintPlanner();
    run(p, 5000);
    p.dropped();
    expect(p.done).toBe(true);
    expect(run(p, 30_000)).toEqual([]);
  });

  it('a drop before the first hint means it never shows', () => {
    const p = new HintPlanner();
    run(p, 2000);
    p.dropped();
    expect(run(p, 30_000)).toEqual([]);
  });

  it('does not depend on the frame size: a long frame fires it once', () => {
    const p = new HintPlanner();
    expect(p.update(4500)).toBe(true);
    expect(p.update(100)).toBe(false);
    expect(p.update(4800)).toBe(false);
    expect(p.update(200)).toBe(true);
  });

  it('can be paused while a drag or a gift is going on, without counting the time', () => {
    const p = new HintPlanner();
    expect(p.update(3000, true)).toBe(false);
    expect(p.update(3000, true)).toBe(false);
    expect(p.update(1000)).toBe(false);
    expect(p.update(2999)).toBe(false);
    expect(p.update(1)).toBe(true);
  });
});
