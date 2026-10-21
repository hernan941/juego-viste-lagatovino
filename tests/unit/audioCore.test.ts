import { describe, expect, it } from 'vitest';
import { AudioCore, PITCH_VARIATION, pitchVariation } from '../../src/game/plugins/audioCore';

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
