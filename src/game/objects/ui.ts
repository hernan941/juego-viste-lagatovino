// Small UI helpers shared by the game objects (art-direction section 6).
import Phaser from 'phaser';
import { FONT_FAMILY, Palette, colorToNumber } from '../constants';
import { profileOf } from '../systems/motion';
import { liftOffset, minHitExtent } from '../systems/touch';
import { readTouchEnv } from '../systems/touchEnv';

export const hex = (token: keyof typeof Palette) => colorToNumber(Palette[token]);

/** Soft panel: very rounded corners, rosa-200 border of 4 px and a soft shadow below. */
export function drawPanel(g: Phaser.GameObjects.Graphics, width: number, height: number, radius = 32): void {
  g.clear();
  g.fillStyle(hex('rosa600'), 0.16);
  g.fillRoundedRect(2, 10, width, height, radius);
  g.fillStyle(hex('rosa50'), 1);
  g.fillRoundedRect(0, 0, width, height, radius);
  g.lineStyle(4, hex('rosa200'), 1);
  g.strokeRoundedRect(0, 0, width, height, radius);
  g.fillStyle(0xffffff, 0.8);
  g.fillRoundedRect(radius, 8, 90, 6, 3);
}

/** A cream pill with a rosa-200 border and text (art-direction section 6): a quiet label that stays readable on any backdrop. */
export function makePill(
  scene: Phaser.Scene, x: number, y: number, text: string, size = 24, { skipIcon = false }: { skipIcon?: boolean } = {},
): Phaser.GameObjects.Container {
  const label = scene.add
    .text(skipIcon ? 18 : 0, -2, text, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color: Palette.texto, fontStyle: '600', padding: { x: 2, y: 6 } })
    .setOrigin(0.5);
  const w = label.width + 52 + (skipIcon ? 36 : 0);
  const h = size + 28;
  const g = scene.add.graphics();
  g.fillStyle(hex('rosa600'), 0.16).fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, h / 2);
  g.fillStyle(hex('crema'), 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(4, hex('rosa200'), 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const parts: Phaser.GameObjects.GameObject[] = [g, label];
  if (skipIcon) {
    // The "skip" icon (two triangles) drawn in code: no emoji glyph is needed.
    const icon = scene.add.graphics();
    const cx = -w / 2 + 34;
    icon.fillStyle(hex('rosa600'), 1);
    icon.fillTriangle(cx - 12, -9, cx - 12, 9, cx, 0).fillTriangle(cx, -9, cx, 9, cx + 12, 0);
    parts.push(icon);
  }
  return scene.add.container(x, y, parts);
}

export function makeText(
  scene: Phaser.Scene, x: number, y: number, text: string, size = 24, color: string = Palette.texto,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: '600' })
    .setOrigin(0.5);
}

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
