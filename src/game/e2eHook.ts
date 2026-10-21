import type { Game } from 'phaser';

export interface VisteHook {
  readonly scene: string | null;
}

/** ADR 0012: read-only test hook, only in test mode or with ?e2e=1. Never in a normal build. */
export function isE2EEnabled(): boolean {
  return import.meta.env.MODE === 'test' || new URLSearchParams(window.location.search).get('e2e') === '1';
}

export function installE2EHook(game: Game): void {
  if (!isE2EEnabled()) return;
  const hook: VisteHook = Object.freeze({
    get scene(): string | null {
      const active = game.scene.getScenes(true);
      return active.length > 0 ? active[active.length - 1].scene.key : null;
    },
  });
  Object.defineProperty(window, '__VISTE__', { value: hook, writable: false, configurable: false });
}

declare global {
  interface Window {
    readonly __VISTE__?: VisteHook;
  }
}
