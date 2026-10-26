// Global Plugin (ADR 0010, ADR 0004, ADR 0017): keeps the session (cat, name, outfit, dyes) and the progress in localStorage.
// The session is written with a debounce; the progress (RegistryKeys.Progress, immutable) is written at once.
// The rules live in saveService.ts and saveCore.ts (unit-tested); this class connects them to Phaser's registry.
import Phaser from 'phaser';
import { PluginKeys, RegistryKeys } from '../constants';
import type { Catalog } from '../data/schema';
import { emptyProgress, progressFromSave } from '../domain/progress';
import { sessionFromSave, type Session } from '../domain/session';
import type { Progress, SaveData } from '../domain/types';
import { readSession, writeSession } from '../systems/sessionStore';
import type { StorageLike } from './saveCore';
import { SaveService } from './saveService';

const SESSION_KEYS: readonly string[] = [RegistryKeys.CatId, RegistryKeys.CatName, RegistryKeys.Outfit, RegistryKeys.ItemDye];

/** Used when the browser denies localStorage (private mode, blocked data): the game still plays, it just does not remember. */
const memoryStorage = (): StorageLike => {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

export class SavePlugin extends Phaser.Plugins.BasePlugin {
  private service!: SaveService;
  private restoring = false;

  init(): void {
    let storage: StorageLike;
    try {
      storage = window.localStorage;
    } catch {
      storage = memoryStorage();
    }
    this.service = new SaveService({ storage });
  }

  start(): void {
    this.game.registry.events.on('setdata', this.onData, this);
    this.game.registry.events.on('changedata', this.onData, this);
    window.addEventListener('pagehide', this.flush);
    window.addEventListener('beforeunload', this.flush);
  }

  /** The stored data as of now (also what a reload would restore). */
  get saved(): SaveData {
    return this.service.load();
  }

  /** Combo ids whose secret prize is already won. */
  get secrets(): string[] {
    return this.service.load().progress.secrets;
  }

  /** Records a won secret (written at once, so a reload keeps it). The registry progress changes too, so a HUD hears it. */
  unlockSecret(comboId: string): boolean {
    const current = this.game.registry.get(RegistryKeys.Progress) as Progress | undefined;
    if (!current) return this.service.unlockSecret(comboId);
    if (current.secrets.includes(comboId)) return true;
    this.game.registry.set(RegistryKeys.Progress, { ...current, secrets: [...current.secrets, comboId] });
    return true;
  }

  /**
   * Puts the saved cat, name, outfit, dyes and progress in the registry (checked against the catalog), without saving again.
   * `startWallet` is economy.json -> startWallet and `dyes` the dye catalog; both come from the caller because the plugin knows no rules.
   */
  restoreInto(catalog: Catalog, options: { startWallet?: number; dyes?: readonly { id: string; starter?: boolean }[] } = {}): Session {
    const save = this.service.load();
    const session = sessionFromSave(save, catalog.cats, catalog.clothes, options.dyes);
    const progress = progressFromSave(save, { ...catalog, dyes: options.dyes }, { startWallet: options.startWallet ?? 0 });
    this.silently(() => {
      writeSession(this.game.registry, session);
      this.game.registry.set(RegistryKeys.Progress, progress);
    });
    return session;
  }

  /** Puts an empty progress in the registry without saving (a first visit; used by the test hook). */
  resetProgress(startWallet: number): void {
    this.silently(() => this.game.registry.set(RegistryKeys.Progress, emptyProgress(startWallet)));
  }

  private silently(fn: () => void): void {
    this.restoring = true;
    try {
      fn();
    } finally {
      this.restoring = false;
    }
  }

  flush = (): void => {
    this.service.flush();
  };

  private onData(_parent: unknown, key: string, value: unknown): void {
    if (this.restoring) return;
    if (key === RegistryKeys.Progress) this.service.commitProgress(value as Progress);
    else if (SESSION_KEYS.includes(key)) this.service.queue(readSession(this.game.registry));
  }

  destroy(): void {
    this.game.registry.events.off('setdata', this.onData, this);
    this.game.registry.events.off('changedata', this.onData, this);
    window.removeEventListener('pagehide', this.flush);
    window.removeEventListener('beforeunload', this.flush);
    super.destroy();
  }
}

/** The SavePlugin of the game a scene belongs to. */
export function getSave(scene: Phaser.Scene): SavePlugin {
  return scene.plugins.get(PluginKeys.Save) as SavePlugin;
}
