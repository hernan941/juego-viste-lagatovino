import { describe, expect, it } from 'vitest';
import { countListeners, FpsMeter, median, perfDrift, type PerfCounts } from '../../src/game/systems/perf';

const counts = (over: Partial<PerfCounts> = {}): PerfCounts => ({ tweens: 4, timers: 2, eventBus: 1, registry: 3, input: 6, sceneEvents: 20, displayList: 120, ...over });

describe('countListeners', () => {
  it('sums the listeners of every event of an emitter', () => {
    const fake = { eventNames: () => ['a', 'b'], listenerCount: (e: string | symbol) => (e === 'a' ? 2 : 3) };
    expect(countListeners(fake)).toBe(5);
  });

  it('is 0 for an emitter without events', () => {
    expect(countListeners({ eventNames: () => [], listenerCount: () => 0 })).toBe(0);
  });
});

describe('perfDrift', () => {
  it('reports nothing when the counts are equal', () => {
    expect(perfDrift(counts(), counts(), 5)).toEqual([]);
  });

  it('allows the documented tolerance on tweens and display list (idle animations), but none on listeners', () => {
    expect(perfDrift(counts(), counts({ tweens: 8, displayList: 124 }), 5)).toEqual([]);
    expect(perfDrift(counts(), counts({ tweens: 10 }), 5)).toEqual(['tweens: 4 -> 10']);
  });

  it('flags any growth of timers and listeners', () => {
    expect(perfDrift(counts(), counts({ timers: 3, eventBus: 2, registry: 4, input: 7 }), 5)).toEqual([
      'timers: 2 -> 3',
      'eventBus: 1 -> 2',
      'registry: 3 -> 4',
      'input: 6 -> 7',
    ]);
  });
});

describe('median', () => {
  it('is the middle value of an odd list and the mean of the two middle ones of an even list', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 40, 20, 30])).toBe(25);
  });

  it('is 0 for an empty list and does not reorder its input', () => {
    expect(median([])).toBe(0);
    const list = [3, 1, 2];
    median(list);
    expect(list).toEqual([3, 1, 2]);
  });
});

describe('FpsMeter', () => {
  it('keeps the last samples only and reports the latest and the median', () => {
    const meter = new FpsMeter(3);
    [10, 60, 58, 56].forEach((fps) => meter.add(fps));
    expect(meter.last).toBe(56);
    expect(meter.median).toBe(58);
    expect(meter.label()).toBe('56 fps (mediana 58)');
  });

  it('reads 0 before the first sample', () => {
    const meter = new FpsMeter(3);
    expect(meter.last).toBe(0);
    expect(meter.label()).toBe('0 fps (mediana 0)');
  });
});
