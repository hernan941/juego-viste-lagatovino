// The browser side of touch play (ADR 0014): what the window says about fingers and orientation. Takes the window and the
// document as parameters so tests can fake them; the pure decisions live in touch.ts.
import { PageEvents } from '../constants';
import { landscapeScale, shouldInviteFullscreen, shouldShowRotateHint } from './touch';

export interface MediaWindow {
  innerWidth: number;
  innerHeight: number;
  matchMedia?(query: string): { matches: boolean; addEventListener(type: 'change', fn: () => void): void; removeEventListener(type: 'change', fn: () => void): void };
}

/** Class set on <html> while the "turn your phone" notice is up (public/style.css shows it). */
export const ROTATE_CLASS = 'rotate-hint';

const COARSE = '(pointer: coarse)';
const ANY_COARSE = '(any-pointer: coarse)';
const PORTRAIT = '(orientation: portrait)';

const matches = (win: MediaWindow, query: string): boolean => win.matchMedia?.(query).matches ?? false;

/** Whether a finger can play here (a phone, a tablet or a touch laptop) and the game units per CSS px of the fitted canvas. */
export function readTouchEnv(win: MediaWindow): { touch: boolean; scale: number } {
  return { touch: matches(win, ANY_COARSE) || matches(win, COARSE), scale: landscapeScale(win.innerWidth, win.innerHeight) };
}

/** Keeps the ROTATE_CLASS of <html> in step with the pointer and the orientation. Returns the function that stops it. */
export function installRotateHint(
  win: MediaWindow, doc: { documentElement: { classList: { toggle(name: string, on: boolean): unknown } } },
): () => void {
  const update = () => doc.documentElement.classList.toggle(ROTATE_CLASS, shouldShowRotateHint({ coarse: matches(win, COARSE), portrait: matches(win, PORTRAIT) }));
  update();
  const lists = [COARSE, PORTRAIT].map((q) => win.matchMedia?.(q)).filter((l): l is NonNullable<typeof l> => !!l);
  for (const l of lists) l.addEventListener('change', update);
  return () => {
    for (const l of lists) l.removeEventListener('change', update);
  };
}

/**
 * Asks the page to go fullscreen (phones only, see shouldInviteFullscreen). Call it inside the tap: dispatchEvent is
 * synchronous, so the page's listener runs with the user's activation still alive.
 */
export function inviteFullscreen(
  win: MediaWindow, doc: { fullscreenElement: unknown; fullscreenEnabled?: boolean; dispatchEvent(e: Event): unknown },
): void {
  const invite = shouldInviteFullscreen({
    coarse: matches(win, COARSE), portrait: matches(win, PORTRAIT), fullscreen: !!doc.fullscreenElement, available: !!doc.fullscreenEnabled,
  });
  if (invite) doc.dispatchEvent(new CustomEvent(PageEvents.RequestFullscreen));
}
