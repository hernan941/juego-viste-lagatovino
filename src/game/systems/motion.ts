// Reduced motion (ADR 0013). Pure core, no Phaser: the rule "the player beats the browser", the button's next value and the
// numbers every effect reads (`motionProfile`). Scenes and objects never call matchMedia: they read the registry boolean.
import type { TransitionKind } from '../domain/flow';
import type { MotionPref } from '../domain/types';

export type { MotionPref };
export const MOTION_PREFS: readonly MotionPref[] = ['auto', 'reduce', 'full'];
/** Same value as `RegistryKeys.ReducedMotion` (constants.ts); written here too so this module stays free of imports. */
const REGISTRY_KEY = 'reducedMotion';

export function isMotionPref(value: unknown): value is MotionPref {
  return typeof value === 'string' && (MOTION_PREFS as readonly string[]).includes(value);
}

/** 'auto' follows the browser; 'reduce' and 'full' are the player's choice and win over it. */
export function resolveReducedMotion(pref: MotionPref, systemPrefersReduce: boolean): boolean {
  if (pref === 'auto') return systemPrefersReduce;
  return pref === 'reduce';
}

/** What the button saves: the opposite of the effective state now. */
export function nextMotionPref(reducedNow: boolean): 'reduce' | 'full' {
  return reducedNow ? 'full' : 'reduce';
}

export interface MotionProfile {
  reduced: boolean;
  /** Multiplier of every side to side shake (angle or x). 0: no shake, a tint says it instead. */
  shake: number;
  /** Multiplier of how far squash, stretch, hops and pops depart from 1. */
  squash: number;
  /** The flash of the photo and the rainbow: white and strong, or a soft cream fade. */
  flash: { color: number; alpha: number };
  /** Share of the particles that are emitted. */
  particleFactor: number;
  /** 1: particles spin. 0: they do not. */
  spin: number;
  /** Multiplier of the idle tail angle. */
  tailSwing: number;
  /** Multiplier of the durations of the idle loops (the tail, mostly): bigger is slower. */
  slow: number;
  /** The idle breathing of the body. */
  breathe: boolean;
  /** Decorative endless loops (bobbing hints, the logo's bounce, pulsing halos). */
  loops: boolean;
  /** The camera dive into the shop. */
  zoom: boolean;
  /** Turns an iris into a plain fade. */
  transitionKind(kind: TransitionKind): TransitionKind;
  /** Swaps the bouncy eases (Back, Bounce, Elastic) for a Sine without overshoot. */
  ease(name: string): string;
  /** How many of `n` particles are emitted: a burst never drops to nothing. */
  count(n: number): number;
  /** An emitter's interval in ms, stretched so that fewer particles are emitted. */
  every(ms: number): number;
}

const OVERSHOOT = /^(Back|Bounce|Elastic)\.(easeIn|easeOut|easeInOut)$/;
const CREAM = 0xfff7ec;

export function motionProfile(reduced: boolean): MotionProfile {
  const particleFactor = reduced ? 0.25 : 1;
  return {
    reduced,
    shake: reduced ? 0 : 1,
    squash: reduced ? 0.2 : 1,
    flash: reduced ? { color: CREAM, alpha: 0.3 } : { color: 0xffffff, alpha: 0.8 },
    particleFactor,
    spin: reduced ? 0 : 1,
    tailSwing: reduced ? 0.25 : 1,
    slow: reduced ? 2 : 1,
    breathe: !reduced,
    loops: !reduced,
    zoom: !reduced,
    transitionKind: (kind) => (reduced ? 'fade' : kind),
    ease: (name) => {
      const m = OVERSHOOT.exec(name);
      return reduced && m ? `Sine.${m[2]}` : name;
    },
    count: (n) => (n <= 0 ? 0 : Math.max(1, Math.round(n * particleFactor))),
    every: (ms) => ms / particleFactor,
  };
}

/** Anything with a Phaser-like registry: a Scene, or a fake in a test. */
export interface HasRegistry {
  registry?: { get(key: string): unknown };
}

export function isReduced(scene: HasRegistry): boolean {
  return scene.registry?.get(REGISTRY_KEY) === true;
}

/** The profile a scene reads right now (it follows the plugin's boolean, which follows the button and the browser). */
export function profileOf(scene: HasRegistry): MotionProfile {
  return motionProfile(isReduced(scene));
}
