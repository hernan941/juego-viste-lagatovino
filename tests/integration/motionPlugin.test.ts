import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Plugins: {
      BasePlugin: class {
        game: unknown;
        constructor(pluginManager: { game: unknown }) { this.game = pluginManager.game; }
        destroy() { this.game = null; }
      },
    },
  },
}));

import { PluginKeys, RegistryKeys } from '../../src/game/constants';
import { MotionPlugin, getMotion } from '../../src/game/plugins/MotionPlugin';
import { SAVE_KEY } from '../../src/game/plugins/saveCore';

function setup(systemReduce: boolean, stored?: string) {
  const store = new Map<string, string>(stored ? [[SAVE_KEY, stored]] : []);
  const listeners = new Set<() => void>();
  const query = { matches: systemReduce, addEventListener: (_: string, fn: () => void) => listeners.add(fn), removeEventListener: (_: string, fn: () => void) => listeners.delete(fn) };
  vi.stubGlobal('window', {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
    matchMedia: () => query,
  });
  const reg = new Map<string, unknown>();
  const game = { registry: { set: (k: string, v: unknown) => void reg.set(k, v), get: (k: string) => reg.get(k) } };
  const plugin = new MotionPlugin({ game } as never);
  plugin.init();
  plugin.start();
  return { plugin, reg, store, query, listeners, game };
}

describe('MotionPlugin', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('writes the effective value to the registry at start and follows the browser on auto', () => {
    const { plugin, reg, query, listeners } = setup(true);
    expect(reg.get(RegistryKeys.ReducedMotion)).toBe(true);
    expect(plugin.pref).toBe('auto');
    query.matches = false;
    for (const fn of listeners) fn();
    expect(reg.get(RegistryKeys.ReducedMotion)).toBe(false);
  });

  it('the button (toggle) saves the opposite, wins over the browser and is written to the save', () => {
    const { plugin, reg, store } = setup(true);
    expect(plugin.toggle()).toBe('full');
    expect(plugin.reduced).toBe(false);
    expect(reg.get(RegistryKeys.ReducedMotion)).toBe(false);
    expect(JSON.parse(store.get(SAVE_KEY)!).motion).toBe('full');
    plugin.setPref('reduce');
    expect(reg.get(RegistryKeys.ReducedMotion)).toBe(true);
  });

  it('reads a saved preference and finds the plugin from a scene', () => {
    const { plugin } = setup(false, JSON.stringify({ version: 1, motion: 'reduce' }));
    expect(plugin.pref).toBe('reduce');
    expect(getMotion({ plugins: { get: (k: string) => (k === PluginKeys.Motion ? plugin : null) } } as never)).toBe(plugin);
  });

  it('stops listening on destroy', () => {
    const { plugin, listeners } = setup(false);
    expect(listeners.size).toBe(1);
    plugin.destroy();
    expect(listeners.size).toBe(0);
  });
});
