// Global Plugin (ADR 0010, ADR 0004): keeps the session (cat, name, outfit) in localStorage.
// The rules live in saveService.ts and saveCore.ts (unit-tested); this class connects them to Phaser's registry.
import Phaser from 'phaser';
import { PluginKeys, RegistryKeys } from '../constants';
import type { Catalog } from '../data/schema';
import { sessionFromSave, type Session } from '../domain/session';
import type { SaveData } from '../domain/types';
import { readSession, writeSession } from '../systems/sessionStore';
import type { StorageLike } from './saveCore';
import { SaveService } from './saveService';

const SESSION_KEYS: readonly string[] = [RegistryKeys.CatId, RegistryKeys.CatName, RegistryKeys.Outfit];

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
    return this.service.load().secrets;
  }

  /** Records a won secret (written at once, so a reload keeps it). */
  unlockSecret(comboId: string): boolean {
    return this.service.unlockSecret(comboId);
  }

  /** Puts the saved cat, name and outfit in the registry (checked against the catalog), without saving again. */
  restoreInto(catalog: Catalog): Session {
    const session = sessionFromSave(this.service.load(), catalog.cats, catalog.clothes);
    this.restoring = true;
    try {
      writeSession(this.game.registry, session);
    } finally {
      this.restoring = false;
    }
    return session;
  }

  flush = (): void => {
    this.service.flush();
  };

  private onData(_parent: unknown, key: string): void {
    if (this.restoring || !SESSION_KEYS.includes(key)) return;
    this.service.queue(readSession(this.game.registry));
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
