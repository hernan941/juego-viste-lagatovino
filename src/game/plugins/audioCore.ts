// Pure core of AudioPlugin (ADR 0009): mute, pitch variation, a per-key polyphony limit and a minimum interval per key.
import { SfxKeys } from '../constants';

/** Playback rate varies up to +-5 % so repeated sounds never feel mechanical. */
export const PITCH_VARIATION = 0.05;
export const DEFAULT_MAX_PER_KEY = 3;

/** Maps an injectable rng() in [0, 1] to a playback rate in [0.95, 1.05]. */
export function pitchVariation(rng: () => number): number {
  return 1 + (rng() * 2 - 1) * PITCH_VARIATION;
}

/** Sounds that are too short for the polyphony limit to stop a rattle: at least this many ms between two of them. */
export const MIN_INTERVAL_MS: Readonly<Record<string, number>> = { [SfxKeys.Hover]: 70 };

export interface RisingConfig {
  /** Rate added by each sound that follows the previous one closely. */
  step: number;
  maxSteps: number;
  /** A pause longer than this brings the pitch back to normal. */
  resetMs: number;
}

/** Consecutive hovers climb like a xylophone (+2.5 % each, up to 8 steps) and fall back after 300 ms without hovering. */
export const RISING: Readonly<Record<string, RisingConfig>> = { [SfxKeys.Hover]: { step: 0.025, maxSteps: 8, resetMs: 300 } };

export interface AudioCoreOptions {
  muted?: boolean;
  maxPerKey?: number;
  minIntervalMs?: Readonly<Record<string, number>>;
  now?: () => number;
}

/** The rate multiplier of keys whose pitch climbs while they repeat closely. Pure: the clock comes in the call. */
export class RisingPitch {
  private readonly state = new Map<string, { step: number; at: number }>();

  constructor(private readonly config: Readonly<Record<string, RisingConfig>> = RISING) {}

  next(key: string, nowMs: number): number {
    const cfg = this.config[key];
    if (!cfg) return 1;
    const prev = this.state.get(key);
    const step = prev && nowMs - prev.at < cfg.resetMs ? Math.min(cfg.maxSteps, prev.step + 1) : 0;
    this.state.set(key, { step, at: nowMs });
    return 1 + step * cfg.step;
  }
}

export class AudioCore {
  muted: boolean;
  private readonly maxPerKey: number;
  private readonly minIntervalMs: Readonly<Record<string, number>>;
  private readonly now: () => number;
  private readonly playing = new Map<string, number>();
  private readonly lastStart = new Map<string, number>();

  constructor({ muted = false, maxPerKey = DEFAULT_MAX_PER_KEY, minIntervalMs = {}, now = () => performance.now() }: AudioCoreOptions = {}) {
    this.muted = muted;
    this.maxPerKey = maxPerKey;
    this.minIntervalMs = minIntervalMs;
    this.now = now;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  active(key: string): number {
    return this.playing.get(key) ?? 0;
  }

  canPlay(key: string): boolean {
    if (this.muted || this.active(key) >= this.maxPerKey) return false;
    const last = this.lastStart.get(key);
    return last === undefined || this.now() - last >= (this.minIntervalMs[key] ?? 0);
  }

  /** Registers a sound start. Returns false (and registers nothing) when it must not play. */
  begin(key: string): boolean {
    if (!this.canPlay(key)) return false;
    this.lastStart.set(key, this.now());
    this.playing.set(key, this.active(key) + 1);
    return true;
  }

  end(key: string): void {
    this.playing.set(key, Math.max(0, this.active(key) - 1));
  }
}
