// Testable heart of SavePlugin (ADR 0004): debounced writes of the session over what is already stored.
// No Phaser here: the plugin passes a scheduler (setTimeout) and the storage (localStorage).
import { toSaveData, type Session } from '../domain/session';
import type { SaveData } from '../domain/types';
import { loadSave, saveToStorage, type StorageLike } from './saveCore';

/** `after` runs `fn` once in `ms` and returns the function that cancels it. */
export interface Scheduler {
  after(ms: number, fn: () => void): () => void;
}

export const SAVE_DEBOUNCE_MS = 300;

export const timeoutScheduler: Scheduler = {
  after(ms, fn) {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  },
};

export interface SaveServiceDeps {
  storage: StorageLike;
  scheduler?: Scheduler;
  delayMs?: number;
}

export class SaveService {
  private readonly storage: StorageLike;
  private readonly scheduler: Scheduler;
  private readonly delayMs: number;
  private queued: Session | null = null;
  private cancel: (() => void) | null = null;

  constructor({ storage, scheduler = timeoutScheduler, delayMs = SAVE_DEBOUNCE_MS }: SaveServiceDeps) {
    this.storage = storage;
    this.scheduler = scheduler;
    this.delayMs = delayMs;
  }

  /** The stored save, or the defaults when it is missing, corrupt or from an unknown version. */
  load(): SaveData {
    return loadSave(this.storage);
  }

  /** True while a change waits for the debounce. */
  get pending(): boolean {
    return this.queued !== null;
  }

  /** Remembers the session and writes it once changes stop for `delayMs`. */
  queue(session: Session): void {
    this.queued = session;
    this.cancel?.();
    this.cancel = this.scheduler.after(this.delayMs, () => {
      this.cancel = null;
      this.flush();
    });
  }

  /** Adds a combo to the unlocked secrets and writes at once (an unlock must survive a reload). False if the storage refused. */
  unlockSecret(comboId: string): boolean {
    const current = loadSave(this.storage);
    if (current.secrets.includes(comboId)) return true;
    return saveToStorage(this.storage, { ...current, secrets: [...current.secrets, comboId] });
  }

  /** Writes what is queued now (also before closing the page). False if the storage refused. */
  flush(): boolean {
    this.cancel?.();
    this.cancel = null;
    if (!this.queued) return true;
    const session = this.queued;
    this.queued = null;
    // The mute and the secrets are not part of the session: keep whatever is stored.
    return saveToStorage(this.storage, toSaveData(session, loadSave(this.storage)));
  }
}
