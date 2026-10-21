import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Phaser needs a browser to import; the plugin only uses BasePlugin.
vi.mock('phaser', () => ({
  default: {
    Plugins: {
      BasePlugin: class {
        game: unknown;
        constructor(pluginManager: { game: unknown }) {
          this.game = pluginManager.game;
        }
        destroy() {
          this.game = null;
        }
      },
    },
  },
}));

import { RegistryKeys } from '../../src/game/constants';
import { SavePlugin, getSave } from '../../src/game/plugins/SavePlugin';
import { SAVE_KEY, defaultSave, serialize } from '../../src/game/plugins/saveCore';
import type { Catalog } from '../../src/game/data/schema';

const catalog = {
  cats: [{ id: 'luna', name: 'Luna' }],
  clothes: [{ id: 'sweater-a', slot: 'sweater' }],
  combos: [],
} as unknown as Catalog;

type Listener = (...args: unknown[]) => void;

/** A tiny EventEmitter like Phaser's: `on(event, fn, context)`. */
class Emitter {
  private readonly listeners = new Map<string, { fn: unknown; bound: Listener }[]>();
  on(event: string, fn: Listener, ctx?: unknown): this {
    const list = this.listeners.get(event) ?? [];
    list.push({ fn, bound: ctx ? fn.bind(ctx) : fn });
    this.listeners.set(event, list);
    return this;
  }
  off(event: string, fn: Listener): this {
    this.listeners.set(event, (this.listeners.get(event) ?? []).filter((l) => l.fn !== fn));
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    for (const l of this.listeners.get(event) ?? []) l.bound(...args);
  }
}

class FakeRegistry {
  events = new Emitter();
  data = new Map<string, unknown>();
  get(k: string) { return this.data.get(k); }
  set(k: string, v: unknown) {
    const had = this.data.has(k);
    this.data.set(k, v);
    this.events.emit(had ? 'changedata' : 'setdata', this, k, v);
    return this;
  }
}

function setup(saved?: string) {
  vi.useFakeTimers();
  const store = new Map<string, string>();
  if (saved !== undefined) store.set(SAVE_KEY, saved);
  const emitter = new Emitter();
  const win = { localStorage: undefined as unknown, addEventListener: emitter.on.bind(emitter), removeEventListener: emitter.off.bind(emitter), emit: emitter.emit.bind(emitter) };
  win.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  vi.stubGlobal('window', win);
  const registry = new FakeRegistry();
  const plugin = new SavePlugin({ game: { registry } } as never);
  plugin.init();
  plugin.start();
  return { store, win, registry, plugin };
}

describe('SavePlugin', () => {
  beforeEach(() => void 0);
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('restores the saved cat, name and outfit into the registry', () => {
    const { registry, plugin } = setup(serialize({ ...defaultSave(), catId: 'luna', catName: 'Mimi', outfit: { sweater: 'sweater-a' } }));
    const s = plugin.restoreInto(catalog);
    expect(s).toEqual({ catId: 'luna', catName: 'Mimi', outfit: { sweater: 'sweater-a' } });
    expect(registry.get(RegistryKeys.CatId)).toBe('luna');
    expect(registry.get(RegistryKeys.CatName)).toBe('Mimi');
    expect(registry.get(RegistryKeys.Outfit)).toEqual({ sweater: 'sweater-a' });
  });

  it('does not write the storage just because it restored', () => {
    const { store, plugin } = setup('{corrupto');
    plugin.restoreInto(catalog);
    vi.advanceTimersByTime(1000);
    expect(store.get(SAVE_KEY)).toBe('{corrupto');
  });

  it('saves after a change of cat, name or outfit, once the changes stop', () => {
    const { store, registry, plugin } = setup();
    plugin.restoreInto(catalog);
    registry.set(RegistryKeys.CatId, 'luna');
    registry.set(RegistryKeys.CatName, 'Luna');
    registry.set(RegistryKeys.Outfit, { sweater: 'sweater-a' });
    expect(store.has(SAVE_KEY)).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(JSON.parse(store.get(SAVE_KEY)!)).toMatchObject({ catId: 'luna', catName: 'Luna', outfit: { sweater: 'sweater-a' } });
    expect(plugin.saved.catName).toBe('Luna');
  });

  it('ignores registry keys that are not part of the session', () => {
    const { store, registry, plugin } = setup();
    plugin.restoreInto(catalog);
    registry.set(RegistryKeys.Catalog, catalog);
    vi.advanceTimersByTime(1000);
    expect(store.has(SAVE_KEY)).toBe(false);
  });

  it('flushes right away when the page is hidden or closed', () => {
    const { store, win, registry, plugin } = setup();
    plugin.restoreInto(catalog);
    registry.set(RegistryKeys.CatId, 'luna');
    registry.set(RegistryKeys.CatName, 'Luna');
    win.emit('pagehide');
    expect(JSON.parse(store.get(SAVE_KEY)!)).toMatchObject({ catId: 'luna' });
  });

  it('stops listening when destroyed', () => {
    const { store, win, registry, plugin } = setup();
    plugin.restoreInto(catalog);
    plugin.destroy();
    registry.set(RegistryKeys.CatId, 'luna');
    win.emit('pagehide');
    vi.advanceTimersByTime(1000);
    expect(store.has(SAVE_KEY)).toBe(false);
  });

  it('works when the storage is not available', () => {
    const { win, registry } = setup();
    Object.defineProperty(win, 'localStorage', { get() { throw new Error('denied'); } });
    const plugin = new SavePlugin({ game: { registry } } as never);
    expect(() => plugin.init()).not.toThrow();
    expect(plugin.restoreInto(catalog).catId).toBeNull();
  });

  it('unlocks secrets at once, remembers them and keeps them across a later session save', () => {
    const { store, registry, plugin } = setup(serialize({ ...defaultSave(), secrets: ['navidad'] }));
    plugin.restoreInto(catalog);
    expect(plugin.secrets).toEqual(['navidad']);
    plugin.unlockSecret('fresas');
    expect(JSON.parse(store.get(SAVE_KEY)!).secrets).toEqual(['navidad', 'fresas']);
    registry.set(RegistryKeys.CatId, 'luna');
    vi.advanceTimersByTime(1000);
    expect(JSON.parse(store.get(SAVE_KEY)!)).toMatchObject({ catId: 'luna', secrets: ['navidad', 'fresas'] });
    expect(plugin.secrets).toEqual(['navidad', 'fresas']);
  });

  it('getSave finds the plugin of a scene', () => {
    const plugin = {};
    expect(getSave({ plugins: { get: () => plugin } } as never)).toBe(plugin);
  });
});
