import { describe, expect, it } from 'vitest';
import { SAVE_KEY, defaultSave, deserialize, serialize, type StorageLike } from '../../src/game/plugins/saveCore';
import { SaveService, type Scheduler } from '../../src/game/plugins/saveService';
import type { Session } from '../../src/game/domain/session';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  fail = false;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fail) throw new Error('quota'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

/** A manual clock: `run()` fires the pending callback as if the delay had passed. */
class FakeScheduler implements Scheduler {
  pending: (() => void) | null = null;
  delays: number[] = [];
  cancelled = 0;
  after(ms: number, fn: () => void) {
    this.delays.push(ms);
    this.pending = fn;
    return () => { this.pending = null; this.cancelled++; };
  }
  run() { const f = this.pending; this.pending = null; f?.(); }
}

const luna: Session = { catId: 'luna', catName: 'Luna', outfit: { sweater: 'sweater-a' } };

describe('SaveService', () => {
  it('load returns the defaults on an empty storage and the saved data otherwise', () => {
    const storage = new MemoryStorage();
    const svc = new SaveService({ storage, scheduler: new FakeScheduler() });
    expect(svc.load()).toEqual(defaultSave());
    storage.setItem(SAVE_KEY, serialize({ ...defaultSave(), catId: 'luna', catName: 'Luna', muted: true }));
    expect(svc.load()).toMatchObject({ catId: 'luna', catName: 'Luna', muted: true });
  });

  it('does not touch the storage until the debounce fires, and writes once for several changes', () => {
    const storage = new MemoryStorage();
    const clock = new FakeScheduler();
    const svc = new SaveService({ storage, scheduler: clock, delayMs: 250 });
    svc.queue(luna);
    svc.queue({ ...luna, catName: 'Lunita' });
    expect(storage.data.size).toBe(0);
    expect(clock.delays).toEqual([250, 250]);
    expect(clock.cancelled).toBe(1);
    clock.run();
    expect(deserialize(storage.getItem(SAVE_KEY))).toMatchObject({ catId: 'luna', catName: 'Lunita', outfit: { sweater: 'sweater-a' } });
    expect(svc.pending).toBe(false);
  });

  it('keeps the mute and the secrets that are already stored', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, serialize({ ...defaultSave(), muted: true, secrets: ['navidad'] }));
    const svc = new SaveService({ storage, scheduler: new FakeScheduler() });
    svc.queue(luna);
    expect(svc.flush()).toBe(true);
    expect(deserialize(storage.getItem(SAVE_KEY))).toMatchObject({ catId: 'luna', muted: true, secrets: ['navidad'] });
  });

  it('flush writes immediately, cancels the timer and does nothing when there is nothing queued', () => {
    const storage = new MemoryStorage();
    const clock = new FakeScheduler();
    const svc = new SaveService({ storage, scheduler: clock });
    expect(svc.flush()).toBe(true);
    expect(storage.data.size).toBe(0);
    svc.queue(luna);
    expect(svc.flush()).toBe(true);
    expect(clock.pending).toBeNull();
    expect(storage.data.size).toBe(1);
  });

  it('survives a storage that refuses to write', () => {
    const storage = new MemoryStorage();
    storage.fail = true;
    const svc = new SaveService({ storage, scheduler: new FakeScheduler() });
    svc.queue(luna);
    expect(svc.flush()).toBe(false);
  });

  it('survives corrupt data in the storage', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{no es json');
    const svc = new SaveService({ storage, scheduler: new FakeScheduler() });
    expect(svc.load()).toEqual(defaultSave());
    svc.queue(luna);
    svc.flush();
    expect(deserialize(storage.getItem(SAVE_KEY))).toMatchObject({ catId: 'luna' });
  });
});
