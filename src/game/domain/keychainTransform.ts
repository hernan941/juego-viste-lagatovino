// Pure TS, no Phaser (ADR 0010, 0021). The transformation of the cat into a porcelain keychain (S8) as a plan: what each moment of
// the ~2.2 s looks like is a function of time alone. The scene moves its objects to what `transformFrame(t)` says, so the order of the
// steps, the numbers and the "skip with a tap" (asking for the end) are tested here and the scene stays thin.
import type { Ring } from './keychain';
import { backIn, bounceOut, clamp01, sineInOut, sineOut } from './ease';

export type KeychainPhase = 'oven' | 'turn' | 'varnish' | 'hardware' | 'swing' | 'package';

/** The phases in the order they happen (the e2e hook reads them as they go by). */
export const KEYCHAIN_PHASES: readonly KeychainPhase[] = ['oven', 'turn', 'varnish', 'hardware', 'swing', 'package'];

export interface PhaseSpan {
  phase: KeychainPhase;
  /** ms from the start. */
  from: number;
  to: number;
}

/** Steps of S8 in ms: kiln flash and shrink, half turn, varnish streak, hardware, swing. */
const FULL: readonly [KeychainPhase, number][] = [['oven', 320], ['turn', 300], ['varnish', 420], ['hardware', 560], ['swing', 600]];
/** Reduced motion (ADR 0013): a cross fade, the pieces fade in and a short swing. No flash, no turn, no streak. */
const REDUCED: readonly [KeychainPhase, number][] = [['turn', 400], ['hardware', 300], ['swing', 300]];

export function transformPlan(reduced: boolean): { spans: PhaseSpan[]; total: number } {
  let at = 0;
  const spans = (reduced ? REDUCED : FULL).map(([phase, ms]): PhaseSpan => {
    const span = { phase, from: at, to: at + ms };
    at += ms;
    return span;
  });
  return { spans, total: at };
}

/** The phase at time `t` (ms); "package" once the transformation is over. */
export function phaseAt(t: number, reduced: boolean): KeychainPhase {
  const { spans } = transformPlan(reduced);
  return spans.find((s) => t >= s.from && t < s.to)?.phase ?? 'package';
}

/** Frames of the varnish streak that sweep across the piece (baked once, ADR 0021). */
export const STREAK_FRAMES = 7;

/** X of the center of the streak in each frame, from fully outside on the left to fully outside on the right of a texture `width` wide. */
export function streakStops(width: number, n = STREAK_FRAMES, artWidth = 220): number[] {
  const from = -artWidth / 2;
  const to = width + artWidth / 2;
  return Array.from({ length: n }, (_, i) => from + ((to - from) * i) / Math.max(1, n - 1));
}

export interface TransformFrame {
  phase: KeychainPhase;
  /** 0..1 of the strength of the kiln flash (the scene multiplies it by the flash of the motion profile). */
  flash: number;
  /** The cat: alpha, uniform scale (1 -> 0.6), the horizontal factor of the half turn (1 -> 0 -> 1) and the squash of the shrink. */
  cat: { alpha: number; scale: number; flip: number; squash: number };
  /** The porcelain keychain (without hardware): alpha and the horizontal factor of the half turn. */
  keychain: { alpha: number; flip: number };
  /** Index of the baked frame of the streak, or null when there is none. */
  streak: number | null;
  /** The eyelet: alpha and the degrees left to turn (360 -> 0). */
  eyelet: { alpha: number; angle: number };
  /** The ring: alpha and how much of its fall is left (1 = high above, 0 = in place). */
  ring: { alpha: number; drop: number };
  /** How much of the chain is unrolled and how much the charm has shown (0..1; the charm is 0 without 5 stars). */
  chain: number;
  charm: number;
  /** 0..1..0 of the pop of scale (1 -> 1.08 -> 1) right after the half turn, for every keychain (K6). */
  pop: number;
  /** True from the moment the keychain hangs and starts to swing. */
  swing: boolean;
}

export interface TransformOptions {
  reduced: boolean;
  /** 5 stars: the charm comes with the ring. */
  charm: boolean;
}

/** The pop right after the half turn: how long it lasts and how much it grows (K6). */
export const POP = { ms: 180, grow: 0.08 };

/** How many stars jump out when it turns into porcelain: 3 with the silver ring, 5 with the gold one, 7 with the charm (K6). */
export function sparkleCount(ring: Ring): number {
  return ring.charm ? 7 : ring.metal === 'gold' ? 5 : 3;
}

function popAt(since: number): number {
  const p = since / POP.ms;
  return p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0;
}

const SHRINK = { to: 0.6, ms: 220, squash: 0.12 };
const FLASH_RISE_MS = 70;
const EYELET = { from: 40, ms: 180, fade: 40 };
const RING = { from: 140, ms: 300 };
const CHAIN = { from: 360, ms: 200 };
const CHARM = { from: 460, ms: 100 };

export function transformFrame(t: number, { reduced, charm }: TransformOptions): TransformFrame {
  const { spans, total } = transformPlan(reduced);
  const at = (phase: KeychainPhase): PhaseSpan | undefined => spans.find((s) => s.phase === phase);
  const phase = phaseAt(t, reduced);
  const hw = at('hardware')!;
  const swinging = t >= at('swing')!.from;

  if (reduced) {
    const turn = at('turn')!;
    const p = clamp01((t - turn.from) / (turn.to - turn.from));
    const fade = clamp01((t - hw.from) / (hw.to - hw.from));
    return {
      phase, flash: 0,
      cat: { alpha: 1 - p, scale: 1, flip: 1, squash: 0 },
      keychain: { alpha: p, flip: 1 },
      streak: null,
      eyelet: { alpha: fade, angle: 0 },
      ring: { alpha: fade, drop: 0 },
      chain: fade,
      charm: charm ? fade : 0,
      pop: 0,
      swing: swinging,
    };
  }

  const oven = at('oven')!;
  const turn = at('turn')!;
  const varnish = at('varnish')!;
  const shrink = clamp01(t / SHRINK.ms);
  // Flash: up fast, then a soft fade to nothing at the end of the oven.
  const flash = t < FLASH_RISE_MS ? sineOut(t / FLASH_RISE_MS) : 1 - sineInOut((t - FLASH_RISE_MS) / (oven.to - FLASH_RISE_MS));
  // Half turn: the width goes 1 -> 0 -> 1; the swap from the cat to the porcelain is at the thin point.
  const turnP = clamp01((t - turn.from) / (turn.to - turn.from));
  const flip = t < turn.from ? 1 : Math.abs(Math.cos(Math.PI * turnP));
  const second = turnP > 0.5;
  const sweeping = t >= varnish.from && t < varnish.to;
  const sweep = sineInOut((t - varnish.from) / (varnish.to - varnish.from));
  const eyeletP = clamp01((t - hw.from - EYELET.from) / EYELET.ms);
  const started = t >= hw.from + EYELET.from;
  return {
    phase,
    flash: clamp01(flash) * (t >= oven.to ? 0 : 1),
    cat: { alpha: second ? 0 : 1, scale: 1 - (1 - SHRINK.to) * backIn(shrink), flip: second ? 1 : flip, squash: Math.sin(Math.PI * shrink) * SHRINK.squash },
    keychain: { alpha: second ? 1 : 0, flip: second ? flip : 1 },
    streak: sweeping ? Math.min(STREAK_FRAMES - 1, Math.floor(sweep * STREAK_FRAMES)) : null,
    eyelet: { alpha: started ? 1 : 0, angle: 360 * (1 - sineOut(eyeletP)) },
    ring: { alpha: t >= hw.from + RING.from ? 1 : 0, drop: 1 - bounceOut((t - hw.from - RING.from) / RING.ms) },
    chain: sineOut((t - hw.from - CHAIN.from) / CHAIN.ms),
    charm: charm ? sineOut((t - hw.from - CHARM.from) / CHARM.ms) : 0,
    pop: popAt(t - turn.to),
    swing: swinging || t >= total,
  };
}
