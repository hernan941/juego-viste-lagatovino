import { describe, expect, it } from 'vitest';
import {
  MOTION_PREFS, isMotionPref, motionProfile, nextMotionPref, profileOf, resolveReducedMotion,
} from '../../src/game/systems/motion';

describe('resolveReducedMotion (ADR 0013: the player beats the browser)', () => {
  it.each([
    ['auto', false, false],
    ['auto', true, true],
    ['reduce', false, true],
    ['reduce', true, true],
    ['full', false, false],
    ['full', true, false],
  ] as const)('pref %s with the browser asking to reduce=%s gives %s', (pref, system, expected) => {
    expect(resolveReducedMotion(pref, system)).toBe(expected);
  });
});

describe('nextMotionPref (the button saves the opposite of what is on now)', () => {
  it('reduces when motion is on and goes back to full when it is reduced', () => {
    expect(nextMotionPref(false)).toBe('reduce');
    expect(nextMotionPref(true)).toBe('full');
  });
});

describe('isMotionPref', () => {
  it('accepts only the three preferences', () => {
    expect([...MOTION_PREFS]).toEqual(['auto', 'reduce', 'full']);
    for (const p of MOTION_PREFS) expect(isMotionPref(p)).toBe(true);
    for (const v of ['', 'AUTO', 'none', null, undefined, 1, true, {}]) expect(isMotionPref(v)).toBe(false);
  });
});

describe('motionProfile', () => {
  const full = motionProfile(false);
  const calm = motionProfile(true);

  it('full motion changes nothing', () => {
    expect(full).toMatchObject({ reduced: false, shake: 1, squash: 1, particleFactor: 1, spin: 1, tailSwing: 1, breathe: true, loops: true, zoom: true });
    expect(full.flash.color).toBe(0xffffff);
    expect(full.transitionKind('heart')).toBe('heart');
    expect(full.transitionKind('paw')).toBe('paw');
    expect(full.transitionKind('iris')).toBe('iris');
    expect(full.transitionKind('fade')).toBe('fade');
    expect(full.ease('Back.easeOut')).toBe('Back.easeOut');
    expect(full.count(10)).toBe(10);
  });

  it('reduced motion turns every iris into a fade of the same duration kind', () => {
    for (const k of ['fade', 'iris', 'heart', 'paw'] as const) expect(calm.transitionKind(k)).toBe('fade');
  });

  it('reduced motion has no shake, a pop of at most 3 %, no spin, no breathing loops and no zoom', () => {
    expect(calm.reduced).toBe(true);
    expect(calm.shake).toBe(0);
    // The strongest squash of the cat is 14 % wide: scaled by `squash` it must stay inside 3 %.
    expect(0.14 * calm.squash).toBeLessThanOrEqual(0.03);
    expect(calm.spin).toBe(0);
    expect(calm.breathe).toBe(false);
    expect(calm.loops).toBe(false);
    expect(calm.zoom).toBe(false);
  });

  it('reduced flashes are a soft cream fade of at most 0.3 alpha, never white', () => {
    expect(calm.flash.alpha).toBeLessThanOrEqual(0.3);
    expect(calm.flash.alpha).toBeGreaterThan(0);
    expect(calm.flash.color).not.toBe(0xffffff);
  });

  it('reduced particles are about a quarter, but a burst never disappears', () => {
    expect(calm.particleFactor).toBe(0.25);
    expect(calm.count(32)).toBe(8);
    expect(calm.count(7)).toBe(2);
    expect(calm.count(1)).toBe(1);
    expect(calm.count(0)).toBe(0);
    expect(calm.every(30)).toBe(120);
  });

  it('reduced tail is nearly still and slow', () => {
    expect(calm.tailSwing).toBeLessThanOrEqual(0.3);
    expect(calm.tailSwing).toBeGreaterThan(0);
    expect(calm.slow).toBeGreaterThan(1);
    expect(full.slow).toBe(1);
  });

  it('reduced easing never overshoots: Back, Bounce and Elastic become Sine', () => {
    expect(calm.ease('Back.easeOut')).toBe('Sine.easeOut');
    expect(calm.ease('Back.easeIn')).toBe('Sine.easeIn');
    expect(calm.ease('Bounce.easeOut')).toBe('Sine.easeOut');
    expect(calm.ease('Elastic.easeOut')).toBe('Sine.easeOut');
    expect(calm.ease('Quad.easeOut')).toBe('Quad.easeOut');
    expect(calm.ease('Sine.easeInOut')).toBe('Sine.easeInOut');
  });
});

describe('profileOf (what the scenes read)', () => {
  it('reads the boolean in the registry', () => {
    const scene = (v: unknown) => ({ registry: { get: (k: string) => (k === 'reducedMotion' ? v : undefined) } });
    expect(profileOf(scene(true)).reduced).toBe(true);
    expect(profileOf(scene(false)).reduced).toBe(false);
    expect(profileOf(scene(undefined)).reduced).toBe(false);
    expect(profileOf(scene('yes')).reduced).toBe(false);
  });

  it('works without a registry (a bare test scene)', () => {
    expect(profileOf({}).reduced).toBe(false);
  });
});
