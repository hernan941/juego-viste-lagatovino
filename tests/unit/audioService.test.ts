import { describe, expect, it } from 'vitest';
import { AudioService, pickRandom, type PlayConfig, type SoundBackend } from '../../src/game/plugins/audioService';
import { SAVE_KEY, defaultSave, loadSave, saveToStorage, serialize, type StorageLike } from '../../src/game/plugins/saveCore';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

class FakeBackend implements SoundBackend {
  locked = false;
  muteCalls: boolean[] = [];
  started: { key: string; config: PlayConfig }[] = [];
  finish: (() => void)[] = [];
  refuse = false;
  play(key: string, config: PlayConfig, onDone: () => void): boolean {
    if (this.refuse) return false;
    this.started.push({ key, config });
    this.finish.push(onDone);
    return true;
  }
  setMute(m: boolean) { this.muteCalls.push(m); }
}

const make = (opts: { storage?: StorageLike; rng?: () => number; maxPerKey?: number } = {}) => {
  const backend = new FakeBackend();
  const storage = opts.storage ?? new MemoryStorage();
  const service = new AudioService({ backend, storage, rng: opts.rng ?? (() => 0.5), maxPerKey: opts.maxPerKey });
  return { backend, storage, service };
};

describe('pickRandom', () => {
  it('maps rng to an index, including the 0 and ~1 edges', () => {
    const keys = ['a', 'b', 'c'] as const;
    expect(pickRandom(keys, () => 0)).toBe('a');
    expect(pickRandom(keys, () => 0.5)).toBe('b');
    expect(pickRandom(keys, () => 0.999999)).toBe('c');
    expect(pickRandom(keys, () => 1)).toBe('c');
  });
});

describe('AudioService.play', () => {
  it('plays with a +-5 % rate variation and the base volume', () => {
    const { backend, service } = make({ rng: () => 1 });
    expect(service.play('k')).toBe(true);
    expect(backend.started[0].config.rate).toBeCloseTo(1.05);
    expect(backend.started[0].config.volume).toBeGreaterThan(0);
    expect(backend.started[0].config.volume).toBeLessThanOrEqual(1);
  });

  it('can skip the variation and scale the volume', () => {
    const { backend, service } = make({ rng: () => 1 });
    service.play('a', { vary: false });
    service.play('b', { volume: 0.5, rate: 2, vary: false });
    service.play('c');
    expect(backend.started[0].config.rate).toBe(1);
    expect(backend.started[1].config.rate).toBe(2);
    expect(backend.started[1].config.volume).toBeCloseTo(backend.started[0].config.volume / 2);
    expect(backend.started[2].config.rate).toBeCloseTo(1.05);
  });

  it('clamps the volume option to 0..1', () => {
    const { backend, service } = make();
    service.play('a', { volume: 7, vary: false });
    service.play('b', { volume: -3, vary: false });
    expect(backend.started[0].config.volume).toBe(1);
    expect(backend.started[1].config.volume).toBe(0);
  });

  it('limits simultaneous sounds per key and frees a slot when one ends', () => {
    const { backend, service } = make({ maxPerKey: 2 });
    expect(service.play('k')).toBe(true);
    expect(service.play('k')).toBe(true);
    expect(service.play('k')).toBe(false);
    expect(service.play('other')).toBe(true);
    backend.finish[0]();
    expect(service.play('k')).toBe(true);
  });

  it('counts a sound end only once even if the backend reports it twice', () => {
    const { backend, service } = make({ maxPerKey: 2 });
    service.play('k');
    service.play('k');
    backend.finish[0]();
    backend.finish[0]();
    expect(service.play('k')).toBe(true);
    expect(service.play('k')).toBe(false);
  });

  it('does not play while locked (before the first user gesture) and does not queue it', () => {
    const { backend, service } = make();
    backend.locked = true;
    expect(service.play('k')).toBe(false);
    backend.locked = false;
    expect(backend.started).toHaveLength(0);
    expect(service.play('k')).toBe(true);
  });

  it('frees the slot when the backend refuses to start', () => {
    const { backend, service } = make({ maxPerKey: 1 });
    backend.refuse = true;
    expect(service.play('k')).toBe(false);
    backend.refuse = false;
    expect(service.play('k')).toBe(true);
  });

  it('playRandom plays one of the given keys', () => {
    const { backend, service } = make({ rng: () => 0.99 });
    expect(service.playRandom(['a', 'b', 'c'])).toBe(true);
    expect(backend.started[0].key).toBe('c');
  });
});

describe('AudioService mute', () => {
  it('silences everything and mirrors the state to the backend', () => {
    const { backend, service } = make();
    service.setMuted(true);
    expect(service.muted).toBe(true);
    expect(backend.muteCalls.at(-1)).toBe(true);
    expect(service.play('k')).toBe(false);
    expect(backend.started).toHaveLength(0);
  });

  it('toggleMute flips and returns the new state', () => {
    const { service } = make();
    expect(service.toggleMute()).toBe(true);
    expect(service.toggleMute()).toBe(false);
    expect(service.play('k')).toBe(true);
  });

  it('persists the mute in the save without touching the other fields', () => {
    const storage = new MemoryStorage();
    saveToStorage(storage, { ...defaultSave(), catId: 'gato-1', catName: 'Michi', outfit: { head: 'head-x' } });
    const { service } = make({ storage });
    service.setMuted(true);
    const saved = loadSave(storage);
    expect(saved.muted).toBe(true);
    expect(saved.catId).toBe('gato-1');
    expect(saved.catName).toBe('Michi');
    expect(saved.outfit).toEqual({ head: 'head-x' });
  });

  it('starts muted when the save says so and applies it to the backend', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, serialize({ ...defaultSave(), muted: true }));
    const { backend, service } = make({ storage });
    expect(service.muted).toBe(true);
    expect(backend.muteCalls).toEqual([true]);
    expect(service.play('k')).toBe(false);
  });

  it('survives a storage that refuses writes', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); },
      removeItem: () => undefined,
    };
    const { service } = make({ storage });
    expect(() => service.setMuted(true)).not.toThrow();
    expect(service.muted).toBe(true);
  });
});

describe('AudioService: hover sweep (minimum interval and rising pitch)', () => {
  const sweep = () => {
    const clock = { t: 10_000 };
    const backend = new FakeBackend();
    const service = new AudioService({ backend, storage: new MemoryStorage(), rng: () => 0.5, now: () => clock.t });
    return { clock, backend, service };
  };

  it('twelve hovers in a flash (20 ms apart) do not rattle: at most one per 70 ms', () => {
    const { clock, backend, service } = sweep();
    let played = 0;
    for (let i = 0; i < 12; i++) {
      clock.t += 20;
      if (service.play('sfx-hover')) played++;
    }
    // Played at 20, 100 and 180 ms: the ones in between were swallowed.
    expect(played).toBe(3);
    expect(backend.started).toHaveLength(3);
  });

  it('the pitch climbs when hovers follow each other and falls back after a pause', () => {
    const { clock, backend, service } = sweep();
    for (let i = 0; i < 3; i++) {
      clock.t += 100;
      service.play('sfx-hover');
    }
    const rates = backend.started.map((s) => s.config.rate);
    expect(rates[0]).toBeCloseTo(1);
    expect(rates[1]).toBeGreaterThan(rates[0]);
    expect(rates[2]).toBeGreaterThan(rates[1]);
    for (const done of backend.finish) done();
    clock.t += 1000;
    expect(service.play('sfx-hover')).toBe(true);
    expect(backend.started.at(-1)!.config.rate).toBeCloseTo(1);
  });

  it('the other sounds are not limited or bent', () => {
    const { clock, backend, service } = sweep();
    for (let i = 0; i < 3; i++) {
      clock.t += 5;
      expect(service.play('sfx-click')).toBe(true);
    }
    expect(backend.started.map((s) => s.config.rate)).toEqual([1, 1, 1]);
  });
});
