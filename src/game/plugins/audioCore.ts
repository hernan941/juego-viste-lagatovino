// Pure core of AudioPlugin (ADR 0009): mute, pitch variation and a per-key polyphony limit.

/** Playback rate varies up to +-5 % so repeated sounds never feel mechanical. */
export const PITCH_VARIATION = 0.05;
export const DEFAULT_MAX_PER_KEY = 3;

/** Maps an injectable rng() in [0, 1] to a playback rate in [0.95, 1.05]. */
export function pitchVariation(rng: () => number): number {
  return 1 + (rng() * 2 - 1) * PITCH_VARIATION;
}

export interface AudioCoreOptions {
  muted?: boolean;
  maxPerKey?: number;
}

export class AudioCore {
  muted: boolean;
  private readonly maxPerKey: number;
  private readonly playing = new Map<string, number>();

  constructor({ muted = false, maxPerKey = DEFAULT_MAX_PER_KEY }: AudioCoreOptions = {}) {
    this.muted = muted;
    this.maxPerKey = maxPerKey;
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
    return !this.muted && this.active(key) < this.maxPerKey;
  }

  /** Registers a sound start. Returns false (and registers nothing) when it must not play. */
  begin(key: string): boolean {
    if (!this.canPlay(key)) return false;
    this.playing.set(key, this.active(key) + 1);
    return true;
  }

  end(key: string): void {
    this.playing.set(key, Math.max(0, this.active(key) - 1));
  }
}
