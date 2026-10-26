import { describe, expect, it } from 'vitest';
import { DyeCache } from '../../src/game/plugins/dyeCache';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

const make = (limit: number, inUse: (k: string) => boolean = () => false) => {
  const created: string[] = [];
  const destroyed: string[] = [];
  const cache = new DyeCache({
    limit,
    create: async (k) => void created.push(k),
    destroy: (k) => void destroyed.push(k),
    inUse,
  });
  return { cache, created, destroyed };
};

describe('DyeCache', () => {
  it('creates a texture once and returns its key', async () => {
    const { cache, created } = make(3);
    expect(await cache.ensure('a')).toBe('a');
    expect(await cache.ensure('a')).toBe('a');
    expect(created).toEqual(['a']);
    expect(cache.has('a')).toBe(true);
  });

  it('two concurrent requests for the same key rasterize once', async () => {
    const d = deferred();
    const calls: string[] = [];
    const cache = new DyeCache({ limit: 3, create: (k) => (calls.push(k), d.promise), destroy: () => {}, inUse: () => false });
    const p1 = cache.ensure('a');
    const p2 = cache.ensure('a');
    expect(cache.has('a')).toBe(false);
    d.resolve();
    await Promise.all([p1, p2]);
    expect(calls).toEqual(['a']);
  });

  it('ensure is asynchronous: the texture is not there until the promise resolves', async () => {
    const { cache } = make(3);
    const p = cache.ensure('a');
    expect(p).toBeInstanceOf(Promise);
    expect(cache.has('a')).toBe(false);
    await p;
    expect(cache.has('a')).toBe(true);
  });

  it('never goes past the limit and destroys the least recently used', async () => {
    const { cache, destroyed } = make(2);
    await cache.ensure('a');
    await cache.ensure('b');
    await cache.ensure('a'); // a is fresh again
    await cache.ensure('c');
    expect(cache.size).toBe(2);
    expect(destroyed).toEqual(['b']);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
  });

  it('never evicts a texture in use', async () => {
    const { cache, destroyed } = make(2, (k) => k === 'a');
    await cache.ensure('a');
    await cache.ensure('b');
    await cache.ensure('c');
    expect(destroyed).toEqual(['b']);
    expect(cache.has('a')).toBe(true);
  });

  it('goes over the limit only while everything is in use, and recovers later', async () => {
    let busy = true;
    const { cache, destroyed } = make(1, () => busy);
    await cache.ensure('a');
    await cache.ensure('b');
    expect(cache.size).toBe(2);
    busy = false;
    await cache.ensure('c');
    expect(cache.size).toBe(1);
    expect(destroyed).toEqual(['a', 'b']);
  });

  it('a failed creation is not cached and can be retried', async () => {
    let fail = true;
    const cache = new DyeCache({ limit: 2, create: async () => { if (fail) throw new Error('boom'); }, destroy: () => {}, inUse: () => false });
    await expect(cache.ensure('a')).rejects.toThrow('boom');
    expect(cache.has('a')).toBe(false);
    fail = false;
    await expect(cache.ensure('a')).resolves.toBe('a');
  });

  it('clear destroys everything', async () => {
    const { cache, destroyed } = make(3);
    await cache.ensure('a');
    await cache.ensure('b');
    cache.clear();
    expect(destroyed).toEqual(['a', 'b']);
    expect(cache.size).toBe(0);
  });
});
