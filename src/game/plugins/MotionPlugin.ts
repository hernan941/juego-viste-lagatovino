// Global Plugin (ADR 0013): reduced motion. It reads the saved preference, listens to `prefers-reduced-motion`
// and writes the effective boolean to `RegistryKeys.ReducedMotion`, which is all that scenes and objects read.
// The rules live in motionService.ts (unit-tested); this class connects them to Phaser and to the browser.
import Phaser from 'phaser';
import { PluginKeys, RegistryKeys } from '../constants';
import type { MotionPref } from '../domain/types';
import { MotionService, type MediaQueryLike } from './motionService';
import type { StorageLike } from './saveCore';

const QUERY = '(prefers-reduced-motion: reduce)';

const memoryStorage = (): StorageLike => {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

export class MotionPlugin extends Phaser.Plugins.BasePlugin {
  private service!: MotionService;

  init(): void {
    let storage: StorageLike;
    try {
      storage = window.localStorage;
    } catch {
      storage = memoryStorage();
    }
    const query: MediaQueryLike | null = typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
    this.service = new MotionService({
      storage,
      query,
      onChange: (reduced) => this.game.registry.set(RegistryKeys.ReducedMotion, reduced),
    });
  }

  start(): void {
    this.service.start();
  }

  /** The effective value: what the registry says. */
  get reduced(): boolean {
    return this.service.reduced;
  }

  /** 'auto' follows the browser; 'reduce' and 'full' are the player's choice. */
  get pref(): MotionPref {
    return this.service.pref;
  }

  setPref(pref: MotionPref): void {
    this.service.setPref(pref);
  }

  /** The button: saves the opposite of what is on now. Returns the new preference. */
  toggle(): MotionPref {
    return this.service.toggle();
  }

  destroy(): void {
    this.service.destroy();
    super.destroy();
  }
}

/** The MotionPlugin of the game a scene belongs to. */
export function getMotion(scene: Phaser.Scene): MotionPlugin {
  return scene.plugins.get(PluginKeys.Motion) as MotionPlugin;
}
