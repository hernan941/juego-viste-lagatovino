// F9: pure helpers of the test-mode perf hook (leaks after N scene cycles). No Phaser here.

/** What counts as "alive" in the active scenes. */
export interface PerfCounts {
  tweens: number;
  timers: number;
  /** Listeners on the shared EventBus. */
  eventBus: number;
  /** Listeners on the registry (shared state events). */
  registry: number;
  /** Listeners on the scene input (pointer and keyboard). */
  input: number;
  /** Listeners on the scene events emitter. */
  sceneEvents: number;
  /** Objects in the display lists of the active scenes. */
  displayList: number;
}

/** The part of an EventEmitter that is counted. */
export interface ListenerSource {
  eventNames(): (string | symbol)[];
  listenerCount(event: string | symbol): number;
}

export function countListeners(emitter: ListenerSource): number {
  return emitter.eventNames().reduce((sum, name) => sum + emitter.listenerCount(name), 0);
}

/** Counts that move with the idle animations of a scene (they start and end by themselves), so they get a tolerance. */
const IDLE_KEYS: (keyof PerfCounts)[] = ['tweens', 'displayList'];

/**
 * Differences between two snapshots taken at the same point of two cycles. Timers and listeners must be exactly equal;
 * tweens and display list may differ by `tolerance` (idle animations).
 */
export function perfDrift(before: PerfCounts, after: PerfCounts, tolerance: number): string[] {
  const keys: (keyof PerfCounts)[] = ['tweens', 'timers', 'eventBus', 'registry', 'input', 'sceneEvents', 'displayList'];
  return keys
    .filter((k) => Math.abs(after[k] - before[k]) > (IDLE_KEYS.includes(k) ? tolerance : 0))
    .map((k) => `${k}: ${before[k]} -> ${after[k]}`);
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The last `size` fps samples, for the `?fps=1` counter. */
export class FpsMeter {
  private samples: number[] = [];

  constructor(private readonly size: number) {}

  add(fps: number): void {
    this.samples.push(fps);
    if (this.samples.length > this.size) this.samples.shift();
  }

  get last(): number {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1] : 0;
  }

  get median(): number {
    return median(this.samples);
  }

  label(): string {
    return `${Math.round(this.last)} fps (mediana ${Math.round(this.median)})`;
  }
}
