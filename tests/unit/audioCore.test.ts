import { describe, expect, it } from 'vitest';
import { AudioCore, PITCH_VARIATION, RisingPitch, pitchVariation } from '../../src/game/plugins/audioCore';

describe('pitchVariation', () => {
  it('stays within +-5 % of the original rate', () => {
    expect(PITCH_VARIATION).toBe(0.05);
    expect(pitchVariation(() => 0)).toBeCloseTo(0.95);
    expect(pitchVariation(() => 1)).toBeCloseTo(1.05);
    expect(pitchVariation(() => 0.5)).toBeCloseTo(1);
  });

  it('is always in range for random input', () => {
    for (let i = 0; i < 200; i++) {
      const r = pitchVariation(Math.random);
      expect(r).toBeGreaterThanOrEqual(0.95);
      expect(r).toBeLessThanOrEqual(1.05);
    }
  });
});

describe('AudioCore mute', () => {
  it('starts unmuted, or with the saved value', () => {
    expect(new AudioCore().muted).toBe(false);
    expect(new AudioCore({ muted: true }).muted).toBe(true);
  });

  it('toggles and sets mute', () => {
    const a = new AudioCore();
    expect(a.toggleMute()).toBe(true);
    expect(a.muted).toBe(true);
    a.setMuted(false);
    expect(a.muted).toBe(false);
  });

  it('cannot play anything while muted', () => {
    const a = new AudioCore({ muted: true });
    expect(a.canPlay('pop')).toBe(false);
    expect(a.begin('pop')).toBe(false);
  });
});

describe('AudioCore simultaneous limit per key', () => {
  it('allows up to maxPerKey sounds of the same key', () => {
    const a = new AudioCore({ maxPerKey: 2 });
    expect(a.begin('pop')).toBe(true);
    expect(a.begin('pop')).toBe(true);
    expect(a.canPlay('pop')).toBe(false);
    expect(a.begin('pop')).toBe(false);
    expect(a.active('pop')).toBe(2);
  });

  it('limits each key independently', () => {
    const a = new AudioCore({ maxPerKey: 1 });
    a.begin('pop');
    expect(a.canPlay('meow')).toBe(true);
  });

  it('frees a slot when a sound ends', () => {
    const a = new AudioCore({ maxPerKey: 1 });
    a.begin('pop');
    a.end('pop');
    expect(a.canPlay('pop')).toBe(true);
    expect(a.active('pop')).toBe(0);
  });

  it('end never goes below zero', () => {
    const a = new AudioCore();
    a.end('pop');
    expect(a.active('pop')).toBe(0);
  });

  it('defaults to 3 simultaneous sounds per key', () => {
    const a = new AudioCore();
    for (let i = 0; i < 3; i++) a.begin('pop');
    expect(a.canPlay('pop')).toBe(false);
  });
});

describe('AudioCore minimum interval per key (the hover must not rattle when sweeping the grid)', () => {
  const make = (now: { t: number }) => new AudioCore({ minIntervalMs: { 'sfx-hover': 70 }, now: () => now.t });

  it('blocks a second sound of the key until the interval has passed', () => {
    const now = { t: 1000 };
    const a = make(now);
    expect(a.begin('sfx-hover')).toBe(true);
    now.t = 1069;
    expect(a.canPlay('sfx-hover')).toBe(false);
    expect(a.begin('sfx-hover')).toBe(false);
    now.t = 1070;
    expect(a.begin('sfx-hover')).toBe(true);
  });

  it('only limits the keys that have an interval', () => {
    const now = { t: 0 };
    const a = make(now);
    expect(a.begin('sfx-click')).toBe(true);
    expect(a.begin('sfx-click')).toBe(true);
  });

  it('a refused sound does not push the next one away', () => {
    const now = { t: 0 };
    const a = make(now);
    a.begin('sfx-hover');
    now.t = 50;
    a.begin('sfx-hover');
    now.t = 70;
    expect(a.begin('sfx-hover')).toBe(true);
  });
});

describe('RisingPitch (consecutive hovers climb like a xylophone and fall back after a pause)', () => {
  const opts = { step: 0.025, maxSteps: 4, resetMs: 300 };

  it('starts at 1 and climbs 2.5 % per sound that follows within 300 ms', () => {
    const p = new RisingPitch({ 'sfx-hover': opts });
    expect(p.next('sfx-hover', 0)).toBe(1);
    expect(p.next('sfx-hover', 100)).toBeCloseTo(1.025);
    expect(p.next('sfx-hover', 200)).toBeCloseTo(1.05);
  });

  it('stops climbing at the top step', () => {
    const p = new RisingPitch({ 'sfx-hover': opts });
    let r = 0;
    for (let i = 0; i < 12; i++) r = p.next('sfx-hover', i * 50);
    expect(r).toBeCloseTo(1.1);
  });

  it('goes back to 1 after 300 ms without hovering', () => {
    const p = new RisingPitch({ 'sfx-hover': opts });
    p.next('sfx-hover', 0);
    p.next('sfx-hover', 100);
    expect(p.next('sfx-hover', 400)).toBe(1);
  });

  it('leaves the other keys alone', () => {
    const p = new RisingPitch({ 'sfx-hover': opts });
    p.next('sfx-hover', 0);
    expect(p.next('sfx-click', 10)).toBe(1);
    expect(p.next('sfx-click', 20)).toBe(1);
  });
});
