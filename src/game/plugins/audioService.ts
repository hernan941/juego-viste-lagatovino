// Testable heart of AudioPlugin (ADR 0009): pitch variation, polyphony limit, mute persistence and the
// "not before the first gesture" rule, on top of AudioCore. No Phaser here: the plugin passes a SoundBackend.
import { AudioCore, pitchVariation } from './audioCore';
import { loadSave, saveToStorage, type StorageLike } from './saveCore';

/** Overall level of the effects. Files are normalized to -9 dBFS peak, so this keeps them soft (ASMR). */
export const BASE_VOLUME = 0.6;

export interface PlayConfig {
  /** Playback rate (1 = original pitch). */
  rate: number;
  /** 0..1 */
  volume: number;
}

export interface SoundBackend {
  /** True until the browser lets audio start (first user gesture). Nothing is played while locked. */
  readonly locked: boolean;
  /** Starts the sound; `onDone` must run when it completes or is stopped. Returns false if it did not start. */
  play(key: string, config: PlayConfig, onDone: () => void): boolean;
  setMute(muted: boolean): void;
}

export interface PlayOptions {
  /** Multiplies the base volume (clamped to 0..1 overall). */
  volume?: number;
  /** Base playback rate before the variation. */
  rate?: number;
  /** false plays at exactly `rate`, without the +-5 % random variation. Default true. */
  vary?: boolean;
}

export interface AudioServiceDeps {
  backend: SoundBackend;
  storage: StorageLike;
  rng?: () => number;
  maxPerKey?: number;
}

/** Picks one element with an injectable rng() in [0, 1]. */
export function pickRandom<T>(items: readonly T[], rng: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

export class AudioService {
  private readonly core: AudioCore;
  private readonly backend: SoundBackend;
  private readonly storage: StorageLike;
  private readonly rng: () => number;

  constructor({ backend, storage, rng = Math.random, maxPerKey }: AudioServiceDeps) {
    this.backend = backend;
    this.storage = storage;
    this.rng = rng;
    this.core = new AudioCore({ muted: loadSave(storage).muted, maxPerKey });
    backend.setMute(this.core.muted);
  }

  get muted(): boolean {
    return this.core.muted;
  }

  /** Returns true when the sound started. */
  play(key: string, { volume = 1, rate = 1, vary = true }: PlayOptions = {}): boolean {
    if (this.backend.locked || !this.core.begin(key)) return false;
    let ended = false;
    const done = () => {
      if (ended) return;
      ended = true;
      this.core.end(key);
    };
    const config: PlayConfig = {
      rate: vary ? rate * pitchVariation(this.rng) : rate,
      volume: Math.min(1, Math.max(0, BASE_VOLUME * volume)),
    };
    const started = this.backend.play(key, config, done);
    if (!started) done();
    return started;
  }

  playRandom(keys: readonly string[], options?: PlayOptions): boolean {
    return this.play(pickRandom(keys, this.rng), options);
  }

  setMuted(muted: boolean): void {
    this.core.setMuted(muted);
    this.backend.setMute(muted);
    // Keep the rest of the save (cat, name, outfit) as it is; a refused write is not fatal.
    saveToStorage(this.storage, { ...loadSave(this.storage), muted });
  }

  toggleMute(): boolean {
    this.setMuted(!this.core.muted);
    return this.core.muted;
  }
}
