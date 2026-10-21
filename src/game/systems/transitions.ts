// Scene transitions (ADR 0007): fade and iris. No scene calls `scene.start` directly.
// The math is pure; the overlay is a plain Graphics (no masks or filters needed: the iris is a
// very thick circle stroke) so it can be tested with a fake scene. Phaser is only a type here.
import type Phaser from 'phaser';

export type TransitionKind = 'fade' | 'iris';
export type Direction = 'close' | 'open';

/** Art-direction section 8: scene changes last 400 to 600 ms. */
export const TRANSITION_MS = 500;
const COVER_COLOR = 0xff8fb8; // rosa-400
const OVERLAY_DEPTH = 10000;
const KINDS: readonly string[] = ['fade', 'iris'];

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Cover alpha for a progress 0..1: 0 to 1 when closing, 1 to 0 when opening. */
export function fadeAlpha(progress: number, direction: Direction): number {
  const t = clamp01(progress);
  return direction === 'close' ? t : 1 - t;
}

/** Radius from (cx, cy) to the farthest corner: the iris is fully open at this radius. */
export function irisMaxRadius(width: number, height: number, cx: number, cy: number): number {
  return Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
}

export function irisRadius(progress: number, direction: Direction, maxRadius: number): number {
  const t = clamp01(progress);
  return maxRadius * (direction === 'close' ? 1 - t : t);
}

/** A circle stroke centered at `radius` and as wide as needed covers everything from `radius` to `outer`. */
export function irisRing(radius: number, outer: number): { radius: number; width: number } {
  const width = outer - radius;
  return { radius: radius + width / 2, width };
}

/** Reads the kind that the previous scene passed in `scene.start(key, data)`. */
export function enterKind(data: unknown): TransitionKind | null {
  const t = (data as { transition?: unknown } | null | undefined)?.transition;
  return typeof t === 'string' && KINDS.includes(t) ? (t as TransitionKind) : null;
}

interface Overlay {
  draw(progress: number, direction: Direction): void;
  destroy(): void;
}

function createOverlay(scene: Phaser.Scene, kind: TransitionKind): Overlay {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(OVERLAY_DEPTH).setScrollFactor(0);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = irisMaxRadius(width, height, cx, cy);
  return {
    draw(progress, direction) {
      g.clear();
      if (kind === 'fade') {
        g.fillStyle(COVER_COLOR, fadeAlpha(progress, direction));
        g.fillRect(0, 0, width, height);
        return;
      }
      const r = irisRadius(progress, direction, maxR);
      if (r <= 0) {
        g.fillStyle(COVER_COLOR, 1);
        g.fillRect(0, 0, width, height);
        return;
      }
      const ring = irisRing(r, maxR + 4);
      g.lineStyle(ring.width, COVER_COLOR, 1);
      g.strokeCircle(cx, cy, ring.radius);
    },
    destroy: () => g.destroy(),
  };
}

function run(scene: Phaser.Scene, overlay: Overlay, direction: Direction, onDone: () => void): void {
  overlay.draw(0, direction);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: TRANSITION_MS,
    ease: 'Sine.easeInOut',
    onUpdate: (tween: Phaser.Tweens.Tween) => overlay.draw(tween.getValue() ?? 0, direction),
    onComplete: () => {
      overlay.draw(1, direction);
      onDone();
    },
  });
}

const busy = new WeakSet<Phaser.Scene>();

/** Closes the screen with `kind` and then starts `key`, which should call `transitionIn` in `create`. */
export function transitionTo(scene: Phaser.Scene, key: string, data: object = {}, kind: TransitionKind = 'fade'): void {
  if (busy.has(scene)) return;
  busy.add(scene);
  scene.input.enabled = false;
  const overlay = createOverlay(scene, kind);
  run(scene, overlay, 'close', () => {
    busy.delete(scene);
    scene.scene.start(key, { ...data, transition: kind });
  });
}

/** Opens the screen after `transitionTo` (pass `enterKind(data)`). Calls `onDone` when it is open (right away without a kind). */
export function transitionIn(scene: Phaser.Scene, kind: TransitionKind | null, onDone?: () => void): void {
  if (kind === null) {
    onDone?.();
    return;
  }
  const overlay = createOverlay(scene, kind);
  run(scene, overlay, 'open', () => {
    overlay.destroy();
    onDone?.();
  });
}
