import { beforeEach, describe, expect, it, vi } from 'vitest';

// Phaser needs a browser to import; the plugin only uses BasePlugin and the sound event names.
vi.mock('phaser', () => ({
  default: {
    Plugins: {
      BasePlugin: class {
        game: unknown;
        constructor(pluginManager: { game: unknown }) {
          this.game = pluginManager.game;
        }
      },
    },
    Sound: { Events: { COMPLETE: 'complete', STOP: 'stop' } },
  },
}));

import { AudioPlugin, getAudio } from '../../src/game/plugins/AudioPlugin';
import { SAVE_KEY } from '../../src/game/plugins/saveCore';

type Handler = () => void;
class FakeSound {
  handlers = new Map<string, Handler>();
  destroyed = false;
  constructor(public key: string, public config: { rate: number; volume: number }, private readonly startOk: boolean) {}
  once(ev: string, fn: Handler) { this.handlers.set(ev, fn); }
  off(ev: string) { this.handlers.delete(ev); }
  play() { return this.startOk; }
  destroy() { this.destroyed = true; }
  emit(ev: string) { this.handlers.get(ev)?.(); }
}

function setup(opts: { cached?: boolean; startOk?: boolean; locked?: boolean; saved?: string } = {}) {
  const store = new Map<string, string>();
  if (opts.saved) store.set(SAVE_KEY, opts.saved);
  vi.stubGlobal('window', {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  const sounds: FakeSound[] = [];
  const sound = {
    locked: opts.locked ?? false,
    mute: false,
    add: (key: string, config: { rate: number; volume: number }) => {
      const s = new FakeSound(key, config, opts.startOk ?? true);
      sounds.push(s);
      return s;
    },
  };
  const game = { sound, cache: { audio: { exists: () => opts.cached ?? true } } };
  const plugin = new AudioPlugin({ game } as never);
  plugin.init();
  return { plugin, sound, sounds, store };
}

beforeEach(() => vi.unstubAllGlobals());

describe('AudioPlugin', () => {
  it('plays a cached sound through the SoundManager and frees it when it completes', () => {
    const { plugin, sounds } = setup();
    expect(plugin.play('sfx-click')).toBe(true);
    expect(sounds[0].key).toBe('sfx-click');
    expect(sounds[0].config.rate).toBeGreaterThanOrEqual(0.95);
    expect(sounds[0].config.rate).toBeLessThanOrEqual(1.05);
    sounds[0].emit('complete');
    expect(sounds[0].destroyed).toBe(true);
  });

  it('frees the slot when the sound is stopped', () => {
    const { plugin, sounds } = setup();
    for (let i = 0; i < 3; i++) expect(plugin.play('k')).toBe(true);
    expect(plugin.play('k')).toBe(false);
    sounds[0].emit('stop');
    expect(plugin.play('k')).toBe(true);
  });

  it('does nothing for a key that is not in the audio cache', () => {
    const { plugin, sounds } = setup({ cached: false });
    expect(plugin.play('nope')).toBe(false);
    expect(sounds).toHaveLength(0);
  });

  it('gives up cleanly when the sound fails to start', () => {
    const { plugin, sounds } = setup({ startOk: false });
    expect(plugin.play('k')).toBe(false);
    expect(sounds[0].destroyed).toBe(true);
    expect(sounds[0].handlers.size).toBe(0);
  });

  it('does not play while the SoundManager is locked', () => {
    const { plugin, sound, sounds } = setup({ locked: true });
    expect(plugin.play('k')).toBe(false);
    sound.locked = false;
    expect(plugin.play('k')).toBe(true);
    expect(sounds).toHaveLength(1);
  });

  it('playRandom plays one of the keys', () => {
    const { plugin, sounds } = setup();
    expect(plugin.playRandom(['a', 'b'])).toBe(true);
    expect(['a', 'b']).toContain(sounds[0].key);
  });

  it('mutes the SoundManager and persists it; a new plugin starts muted', () => {
    const first = setup();
    first.plugin.setMuted(true);
    expect(first.plugin.muted).toBe(true);
    expect(first.sound.mute).toBe(true);
    const saved = first.store.get(SAVE_KEY);
    expect(saved).toBeTruthy();

    const second = setup({ saved });
    expect(second.plugin.muted).toBe(true);
    expect(second.sound.mute).toBe(true);
    expect(second.plugin.toggleMute()).toBe(false);
    expect(second.sound.mute).toBe(false);
  });

  it('getAudio finds the plugin through the scene plugin manager', () => {
    const { plugin } = setup();
    const scene = { plugins: { get: (k: string) => (k === 'AudioPlugin' ? plugin : null) } };
    expect(getAudio(scene as never)).toBe(plugin);
  });
});
