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
import { SAVE_KEY, defaultSave, restoreRules, serialize } from '../../src/game/plugins/saveCore';
import type { Catalog } from '../../src/game/data/schema';
import { emptyProgress, emptyStoredProgress } from '../../src/game/domain/progress';
import type { Progress } from '../../src/game/domain/types';
import economyJson from '../../src/game/data/economy.json';
import dyesJson from '../../src/game/data/dyes.json';

const catalog = {
  cats: [{ id: 'luna', name: 'Luna' }],
  clothes: [{ id: 'sweater-a', slot: 'sweater' }],
  combos: [{ id: 'navidad' }, { id: 'fresas' }],
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
    expect(s).toEqual({ catId: 'luna', catName: 'Mimi', outfit: { sweater: 'sweater-a' }, itemDye: {} });
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
    const { store, registry, plugin } = setup(serialize({ ...defaultSave(), progress: { ...emptyStoredProgress(), secrets: ['navidad'] } }));
    plugin.restoreInto(catalog);
    expect(plugin.secrets).toEqual(['navidad']);
    plugin.unlockSecret('fresas');
    expect(JSON.parse(store.get(SAVE_KEY)!).progress.secrets).toEqual(['navidad', 'fresas']);
    registry.set(RegistryKeys.CatId, 'luna');
    vi.advanceTimersByTime(1000);
    expect(JSON.parse(store.get(SAVE_KEY)!)).toMatchObject({ catId: 'luna', progress: { secrets: ['navidad', 'fresas'] } });
    expect(plugin.secrets).toEqual(['navidad', 'fresas']);
  });

  it('saves the dyes of the session with the debounce', () => {
    const { store, registry, plugin } = setup();
    plugin.restoreInto(catalog);
    registry.set(RegistryKeys.ItemDye, { 'sweater-a': 'rosa' });
    expect(store.has(SAVE_KEY)).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(JSON.parse(store.get(SAVE_KEY)!).itemDye).toEqual({ 'sweater-a': 'rosa' });
  });

  it('getSave finds the plugin of a scene', () => {
    const plugin = {};
    expect(getSave({ plugins: { get: () => plugin } } as never)).toBe(plugin);
  });

  describe('progress (F11.11, ADR 0017)', () => {
    const progressInRegistry = (registry: FakeRegistry) => registry.get(RegistryKeys.Progress) as Progress;

    it('restores the progress into the registry with the start wallet, without writing', () => {
      const { store, registry, plugin } = setup();
      plugin.restoreInto(catalog, { startWallet: 100 });
      expect(progressInRegistry(registry)).toEqual(emptyProgress(100));
      vi.advanceTimersByTime(1000);
      expect(store.has(SAVE_KEY)).toBe(false);
    });

    it('a new player starts with the wallet of economy.json and the starter dyes (restoreRules)', () => {
      const { registry, plugin } = setup();
      const data = { ...catalog, economy: economyJson, dyes: dyesJson } as unknown as Parameters<typeof restoreRules>[0];
      plugin.restoreInto(catalog, restoreRules(data));
      const progress = progressInRegistry(registry);
      expect(economyJson.startWallet).toBeGreaterThan(0);
      expect(progress.wallet).toBe(economyJson.startWallet);
      expect(restoreRules(data).dyes).toBe(data.dyes);
    });

    it('a v1 save comes back as v2: the secrets, what was worn and the start wallet', () => {
      const v1 = JSON.stringify({ version: 1, catId: 'luna', catName: 'Luna', outfit: { sweater: 'sweater-a' }, secrets: ['navidad'], muted: true, motion: 'auto' });
      const withCombos = { ...catalog, combos: [{ id: 'navidad' }], clothes: [{ id: 'sweater-a', slot: 'sweater' }, { id: 'sweater-b', slot: 'sweater' }] } as unknown as Catalog;
      const { registry, plugin } = setup(v1);
      plugin.restoreInto(withCombos, { startWallet: 100 });
      expect(progressInRegistry(registry)).toEqual({ ...emptyProgress(100), owned: ['sweater-a'], secrets: ['navidad'] });
    });

    it('writes at once, with no debounce, when the progress changes in the registry', () => {
      const { store, registry, plugin } = setup();
      plugin.restoreInto(catalog, { startWallet: 100 });
      const next = { ...progressInRegistry(registry), wallet: 60, owned: ['sweater-a'] };
      registry.set(RegistryKeys.Progress, next);
      expect(JSON.parse(store.get(SAVE_KEY)!).progress).toMatchObject({ wallet: 60, owned: ['sweater-a'] });
      expect(plugin.saved.progress.wallet).toBe(60);
    });

    it('a progress write keeps the session that was already saved and survives a later session save', () => {
      const { store, registry, plugin } = setup();
      plugin.restoreInto(catalog, { startWallet: 100 });
      registry.set(RegistryKeys.CatId, 'luna');
      registry.set(RegistryKeys.Progress, { ...progressInRegistry(registry), wallet: 5 });
      registry.set(RegistryKeys.CatName, 'Luna');
      vi.advanceTimersByTime(1000);
      expect(JSON.parse(store.get(SAVE_KEY)!)).toMatchObject({ catId: 'luna', catName: 'Luna', progress: { wallet: 5 } });
    });

    it('unlockSecret updates the progress in the registry (the HUD hears it) and writes at once', () => {
      const { store, registry, plugin } = setup();
      plugin.restoreInto(catalog, { startWallet: 100 });
      const seen: string[][] = [];
      registry.events.on('changedata', (_p: unknown, key: unknown, value: unknown) => {
        if (key === RegistryKeys.Progress) seen.push((value as Progress).secrets);
      });
      plugin.unlockSecret('navidad');
      plugin.unlockSecret('navidad');
      expect(seen).toEqual([['navidad']]);
      expect(progressInRegistry(registry).secrets).toEqual(['navidad']);
      expect(JSON.parse(store.get(SAVE_KEY)!).progress.secrets).toEqual(['navidad']);
    });

    it('resetProgress puts the empty progress in the registry without writing', () => {
      const { store, registry, plugin } = setup();
      plugin.restoreInto(catalog, { startWallet: 100 });
      plugin.unlockSecret('navidad');
      store.clear();
      plugin.resetProgress(100);
      expect(progressInRegistry(registry)).toEqual(emptyProgress(100));
      vi.advanceTimersByTime(1000);
      expect(store.has(SAVE_KEY)).toBe(false);
    });

    it('ignores the progress after being destroyed', () => {
      const { store, registry, plugin } = setup();
      plugin.restoreInto(catalog);
      plugin.destroy();
      registry.set(RegistryKeys.Progress, emptyProgress(1));
      expect(store.has(SAVE_KEY)).toBe(false);
    });
  });
});
