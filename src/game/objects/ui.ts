// Small UI helpers shared by the game objects (art-direction section 6).
import Phaser from 'phaser';
import { profileOf } from '../systems/motion';
import { hoverTarget, kitHitSize, pressTarget } from '../systems/kit';
import { liftOffset, minHitExtent } from '../systems/touch';
import { readTouchEnv } from '../systems/touchEnv';

/** Sets the scale of `visual` with a short tween; replaces the previous one (and only that one). */
export type ScaleTo = (scale: number, duration?: number, ease?: string) => void;

/**
 * Hover feedback for anything interactive: grows to 1.05 in 100 ms and shows the hand cursor.
 * Only the hover tween is replaced (never `killTweensOf`), so other tweens of the target, like the
 * pop-in alpha of a grid cell, keep running. `visual` is what scales (the target by default).
 * Returns the scale setter so press feedback can share the same tween slot.
 */
export function addHover(
  target: Phaser.GameObjects.Container, scale = 1.05, visual: Phaser.GameObjects.Container = target,
): ScaleTo {
  let tween: Phaser.Tweens.Tween | undefined;
  const to: ScaleTo = (s, duration = 100, ease = 'Sine.easeOut') => {
    tween?.remove();
    tween = target.scene.tweens.add({ targets: visual, scale: s, duration, ease, onComplete: () => { tween = undefined; } });
  };
  target.on('pointerover', () => to(scale));
  target.on('pointerout', () => to(1));
  return to;
}

/** Press feedback (art-direction section 8): `visual` drops `dy` px in 60 ms and comes back with a bounce. */
export function addPress(target: Phaser.GameObjects.Container, visual: Phaser.GameObjects.Container = target, dy = 4): void {
  const scene = target.scene;
  const baseY = visual.y;
  let tween: Phaser.Tweens.Tween | undefined;
  const to = (y: number, duration: number, ease: string) => {
    tween?.remove();
    tween = scene.tweens.add({ targets: visual, y, duration, ease, onComplete: () => { tween = undefined; } });
  };
  target.on('pointerdown', () => to(baseY + dy, 60, 'Sine.easeOut'));
  for (const ev of ['pointerup', 'pointerout']) target.on(ev, () => to(baseY, 150, profileOf(scene).ease('Back.easeOut')));
}

/**
 * Feedback of the Lagatovino kit (art-direction section 8). Hover (a mouse ornament): `target` grows 1.04 and turns 1 degree
 * (no rotation with reduced motion). Press (required, also on a finger): `face` shrinks to 0.95 and drops 2 px in 100 ms, and
 * comes back with Back.easeOut (a Sine without overshoot with reduced motion).
 */
export function addKitFeedback(target: Phaser.GameObjects.Container, face: Phaser.GameObjects.Container): void {
  const scene = target.scene;
  const baseY = face.y;
  let hoverTween: Phaser.Tweens.Tween | undefined;
  let pressTween: Phaser.Tweens.Tween | undefined;
  const hover = (on: boolean) => {
    const h = hoverTarget(profileOf(scene).reduced);
    hoverTween?.remove();
    hoverTween = scene.tweens.add({ targets: target, scale: on ? h.scale : 1, angle: on ? h.angle : 0, duration: 100, ease: 'Sine.easeOut', onComplete: () => { hoverTween = undefined; } });
  };
  const press = (down: boolean) => {
    const p = pressTarget();
    pressTween?.remove();
    pressTween = scene.tweens.add({
      targets: face, scale: down ? p.scale : 1, y: baseY + (down ? p.dy : 0), duration: down ? p.duration : 150,
      ease: down ? 'Sine.easeOut' : profileOf(scene).ease('Back.easeOut'), onComplete: () => { pressTween = undefined; },
    });
  };
  target.on('pointerover', () => hover(true));
  target.on('pointerout', () => { hover(false); press(false); });
  target.on('pointerdown', () => press(true));
  target.on('pointerup', () => press(false));
}

/** Hit area of a kit control: the drawing (or 44 CSS px on a touch device) and never less than 80 game units. */
export function kitHitRect(width: number, height: number, cap: { width?: number; height?: number } = {}): Phaser.Geom.Rectangle {
  const base = hitRect(width, height, cap);
  const min = kitHitSize(base.width, base.height);
  return new Phaser.Geom.Rectangle(-(min.width - width) / 2, -(min.height - height) / 2, min.width, min.height);
}

// ---- Touch (ADR 0014) ---------------------------------------------------------

/** Whether a finger can play here and the game units per CSS px (read from the window each time: it changes with the phone's turn). */
export const touchEnv = () => readTouchEnv(window);

/** Hit area for a container of `width` x `height` (setSize): the drawing on a mouse, at least 44 CSS px on a touch device (the art does not change). */
export function hitRect(width: number, height: number, cap: { width?: number; height?: number } = {}): Phaser.Geom.Rectangle {
  const env = touchEnv();
  if (!env.touch) return new Phaser.Geom.Rectangle(0, 0, width, height);
  const w = minHitExtent(width, env.scale, cap.width);
  const h = minHitExtent(height, env.scale, cap.height);
  return new Phaser.Geom.Rectangle(-(w - width) / 2, -(h - height) / 2, w, h);
}

/** Circular hit area for a round container of `size` (setSize): `reach` px beyond the drawing, and at least 44 CSS px on a touch device. */
export function hitCircle(size: number, reach = 4, cap = Infinity): Phaser.Geom.Circle {
  const env = touchEnv();
  const diameter = env.touch ? minHitExtent(size + reach * 2, env.scale, cap) : size + reach * 2;
  return new Phaser.Geom.Circle(size / 2, size / 2, diameter / 2);
}

/** How far above the finger a dragged garment is drawn for this pointer (zero for a mouse). */
export const liftFor = (pointer: Phaser.Input.Pointer) => liftOffset(pointer.wasTouch, touchEnv().scale);
