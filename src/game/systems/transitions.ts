// Scene transitions (ADR 0007): fade and iris (circle, heart or paw). No scene calls `scene.start` directly.
// The math is pure; the overlay needs no masks or filters so it can be tested with a fake scene:
// - the circle iris is a very thick circle stroke;
// - the heart and paw irises are an image with a hole of that shape (painted once into a canvas texture),
//   scaled by the progress, plus rects that cover the rest of the screen.
// Phaser is only a type here.
import type Phaser from 'phaser';
import { TRANSITION_KINDS, type TransitionKind } from '../domain/flow';
import { IRIS_SHAPES, coverRects, irisHoleScale, type Direction } from './irisShapes';

export type { Direction, TransitionKind };

/** Art-direction section 8: scene changes last 400 to 600 ms. */
export const TRANSITION_MS = 500;
const COVER_COLOR = 0xff8fb8; // rosa-400
const OVERLAY_DEPTH = 10000;
const KINDS: readonly string[] = TRANSITION_KINDS;
/** Side of the canvas texture of the shaped irises, and the px of one shape unit in it. */
const IRIS_TEXTURE = 1024;
const IRIS_UNIT_PX = 380;
type Shaped = 'heart' | 'paw';

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

const irisTextureKey = (kind: Shaped) => `iris-${kind}`;

/** Paints the cover color with a hole of the shape in the middle (the hole is cut with destination-out, so overlaps are fine). */
function paintIrisTexture(scene: Phaser.Scene, kind: Shaped): void {
  const key = irisTextureKey(kind);
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, IRIS_TEXTURE, IRIS_TEXTURE);
  if (!tex) return;
  const ctx = tex.getContext();
  const c = IRIS_TEXTURE / 2;
  ctx.fillStyle = `#${COVER_COLOR.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, IRIS_TEXTURE, IRIS_TEXTURE);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  if (kind === 'heart') {
    IRIS_SHAPES.heart.outline.forEach((p, i) => (i === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, c + p.x * IRIS_UNIT_PX, c + p.y * IRIS_UNIT_PX));
    ctx.closePath();
  } else {
    for (const e of IRIS_SHAPES.paw.parts) {
      ctx.moveTo(c + e.cx * IRIS_UNIT_PX + e.rx * IRIS_UNIT_PX * Math.cos(e.rot), c + e.cy * IRIS_UNIT_PX + e.rx * IRIS_UNIT_PX * Math.sin(e.rot));
      ctx.ellipse(c + e.cx * IRIS_UNIT_PX, c + e.cy * IRIS_UNIT_PX, e.rx * IRIS_UNIT_PX, e.ry * IRIS_UNIT_PX, e.rot, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  tex.refresh();
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
  if (kind === 'heart' || kind === 'paw') return createShapedOverlay(scene, kind, g, cx, cy, maxR);
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

function createShapedOverlay(
  scene: Phaser.Scene, kind: Shaped, g: Phaser.GameObjects.Graphics, cx: number, cy: number, maxR: number,
): Overlay {
  paintIrisTexture(scene, kind);
  const img = scene.add.image(cx, cy, irisTextureKey(kind)).setDepth(OVERLAY_DEPTH).setScrollFactor(0);
  const { width, height } = scene.scale;
  return {
    draw(progress, direction) {
      g.clear();
      g.fillStyle(COVER_COLOR, 1);
      const unitPx = irisHoleScale(progress, direction, IRIS_SHAPES[kind].inner, maxR);
      if (unitPx <= 0) {
        img.setVisible(false);
        g.fillRect(0, 0, width, height);
        return;
      }
      const scale = unitPx / IRIS_UNIT_PX;
      img.setVisible(true).setScale(scale);
      for (const r of coverRects(cx, cy, (IRIS_TEXTURE / 2) * scale, width, height)) g.fillRect(r.x, r.y, r.width, r.height);
    },
    destroy() {
      img.destroy();
      g.destroy();
    },
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
