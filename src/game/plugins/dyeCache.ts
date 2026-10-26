// Pure core of the DyePlugin (ADR 0018): a capped LRU of dyed textures with one promise per key.
// It knows nothing of Phaser: the plugin passes how to create and destroy a texture and which ones are in use.

/** At most this many dyed textures stay alive (ADR 0018). */
export const DYE_CACHE_LIMIT = 24;

export interface DyeCacheOptions {
  limit: number;
  /** Rasterizes and registers the texture of `key`. */
  create: (key: string) => Promise<void>;
  /** Releases the texture of `key` (`textures.remove`). */
  destroy: (key: string) => void;
  /** True while the texture is on a cat or in a render in progress: it is never evicted. */
  inUse: (key: string) => boolean;
}

export class DyeCache {
  // Map keeps insertion order: the first key is the least recently used.
  private ready = new Set<string>();
  private pending = new Map<string, Promise<string>>();

  constructor(private readonly opts: DyeCacheOptions) {}

  get size(): number {
    return this.ready.size;
  }

  has(key: string): boolean {
    return this.ready.has(key);
  }

  /** Resolves with `key` once its texture exists. Two requests for the same key create it once. */
  ensure(key: string): Promise<string> {
    if (this.ready.has(key)) {
      this.touch(key);
      return Promise.resolve(key);
    }
    const running = this.pending.get(key);
    if (running) return running;
    const job = this.opts.create(key).then(
      () => {
        this.pending.delete(key);
        this.ready.add(key);
        this.evict(key);
        return key;
      },
      (err: unknown) => {
        this.pending.delete(key);
        throw err;
      },
    );
    this.pending.set(key, job);
    return job;
  }

  /** Destroys every texture. */
  clear(): void {
    for (const key of this.ready) this.opts.destroy(key);
    this.ready.clear();
  }

  private touch(key: string): void {
    this.ready.delete(key);
    this.ready.add(key);
  }

  // Drops the oldest idle textures until the cap holds; `keep` (the one just made) is never dropped.
  private evict(keep: string): void {
    for (const key of [...this.ready]) {
      if (this.ready.size <= this.opts.limit) return;
      if (key === keep || this.opts.inUse(key)) continue;
      this.ready.delete(key);
      this.opts.destroy(key);
    }
  }
}
