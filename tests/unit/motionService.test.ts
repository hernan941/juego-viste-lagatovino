import { describe, expect, it } from 'vitest';
import { MotionService, type MediaQueryLike } from '../../src/game/plugins/motionService';
import { SAVE_KEY, defaultSave, loadSave, saveToStorage, serialize, type StorageLike } from '../../src/game/plugins/saveCore';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

class FakeQuery implements MediaQueryLike {
  listeners = new Set<() => void>();
  constructor(public matches: boolean) {}
  addEventListener(_t: 'change', fn: () => void) { this.listeners.add(fn); }
  removeEventListener(_t: 'change', fn: () => void) { this.listeners.delete(fn); }
  set(matches: boolean) {
    this.matches = matches;
    for (const fn of [...this.listeners]) fn();
  }
}

const make = (opts: { system?: boolean; saved?: Partial<ReturnType<typeof defaultSave>> } = {}) => {
  const storage = new MemoryStorage();
  if (opts.saved) saveToStorage(storage, { ...defaultSave(), ...opts.saved });
  const query = new FakeQuery(opts.system ?? false);
  const seen: boolean[] = [];
  const service = new MotionService({ storage, query, onChange: (reduced) => seen.push(reduced) });
  service.start();
  return { storage, query, seen, service };
};

describe('MotionService', () => {
  it('starts on auto and follows the browser', () => {
    expect(make({ system: false }).service).toMatchObject({ pref: 'auto', reduced: false });
    expect(make({ system: true }).service).toMatchObject({ pref: 'auto', reduced: true });
  });

  it('announces the starting value once', () => {
    expect(make({ system: true }).seen).toEqual([true]);
  });

  it('reads the saved preference, which wins over the browser', () => {
    expect(make({ system: true, saved: { motion: 'full' } }).service).toMatchObject({ pref: 'full', reduced: false });
    expect(make({ system: false, saved: { motion: 'reduce' } }).service).toMatchObject({ pref: 'reduce', reduced: true });
  });

  it('on auto, a live change of the browser changes the state; on a chosen pref it does not', () => {
    const a = make({ system: false });
    a.query.set(true);
    expect(a.service.reduced).toBe(true);
    expect(a.seen).toEqual([false, true]);
    a.query.set(false);
    expect(a.service.reduced).toBe(false);

    const b = make({ system: false, saved: { motion: 'full' } });
    b.query.set(true);
    expect(b.service.reduced).toBe(false);
    expect(b.seen).toEqual([false]);
  });

  it('toggle saves the opposite of the effective state and keeps the rest of the save', () => {
    const { service, storage } = make({ system: true, saved: { catId: 'luna', catName: 'Luna', muted: true } });
    expect(service.toggle()).toBe('full');
    expect(service.reduced).toBe(false);
    expect(loadSave(storage)).toMatchObject({ motion: 'full', catId: 'luna', catName: 'Luna', muted: true });
    expect(service.toggle()).toBe('reduce');
    expect(service.reduced).toBe(true);
    expect(loadSave(storage).motion).toBe('reduce');
  });

  it('setPref only announces when the effective value changes', () => {
    const { service, seen } = make({ system: false });
    service.setPref('full');
    expect(seen).toEqual([false]);
    service.setPref('reduce');
    expect(seen).toEqual([false, true]);
    service.setPref('auto');
    expect(seen).toEqual([false, true, false]);
  });

  it('survives a storage that refuses to write', () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined };
    const service = new MotionService({ storage, query: new FakeQuery(false), onChange: () => undefined });
    service.start();
    expect(() => service.setPref('reduce')).not.toThrow();
    expect(service.reduced).toBe(true);
  });

  it('works without matchMedia', () => {
    const service = new MotionService({ storage: new MemoryStorage(), query: null, onChange: () => undefined });
    service.start();
    expect(service.reduced).toBe(false);
    service.setPref('reduce');
    expect(service.reduced).toBe(true);
  });

  it('stops listening to the browser after destroy', () => {
    const { service, query } = make();
    expect(query.listeners.size).toBe(1);
    service.destroy();
    expect(query.listeners.size).toBe(0);
  });

  it('does not touch a corrupt save beyond its own field', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{broken');
    const service = new MotionService({ storage, query: new FakeQuery(false), onChange: () => undefined });
    service.start();
    service.setPref('reduce');
    expect(JSON.parse(storage.getItem(SAVE_KEY)!)).toMatchObject({ motion: 'reduce' });
    expect(serialize(loadSave(storage))).toContain('"motion":"reduce"');
  });
});
