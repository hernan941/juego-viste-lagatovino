// Testable heart of MotionPlugin (ADR 0013): the saved preference, the browser's `prefers-reduced-motion` and the effective
// boolean. No Phaser here: the plugin passes the media query and writes the result to the registry.
import type { MotionPref } from '../domain/types';
import { nextMotionPref, resolveReducedMotion } from '../systems/motion';
import { loadSave, saveToStorage, type StorageLike } from './saveCore';

/** The slice of MediaQueryList that we need. */
export interface MediaQueryLike {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

export interface MotionServiceDeps {
  storage: StorageLike;
  /** `matchMedia('(prefers-reduced-motion: reduce)')`, or null where there is no matchMedia. */
  query: MediaQueryLike | null;
  /** Called with the effective value at start and every time it changes. */
  onChange(reduced: boolean, pref: MotionPref): void;
}

export class MotionService {
  private current: MotionPref = 'auto';
  private effective = false;
  private started = false;
  private readonly onSystem = () => this.update();

  constructor(private readonly deps: MotionServiceDeps) {}

  get pref(): MotionPref {
    return this.current;
  }

  get reduced(): boolean {
    return this.effective;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.current = loadSave(this.deps.storage).motion;
    this.deps.query?.addEventListener('change', this.onSystem);
    this.effective = resolveReducedMotion(this.current, this.deps.query?.matches ?? false);
    this.deps.onChange(this.effective, this.current);
  }

  /** Saves the player's choice (keeping the rest of the save) and applies it. A refused write is not fatal. */
  setPref(pref: MotionPref): void {
    this.current = pref;
    saveToStorage(this.deps.storage, { ...loadSave(this.deps.storage), motion: pref });
    this.update();
  }

  /** What the button does: saves the opposite of the effective state. */
  toggle(): MotionPref {
    const next = nextMotionPref(this.effective);
    this.setPref(next);
    return next;
  }

  destroy(): void {
    this.deps.query?.removeEventListener('change', this.onSystem);
    this.started = false;
  }

  private update(): void {
    const reduced = resolveReducedMotion(this.current, this.deps.query?.matches ?? false);
    if (reduced === this.effective) return;
    this.effective = reduced;
    this.deps.onChange(reduced, this.current);
  }
}
