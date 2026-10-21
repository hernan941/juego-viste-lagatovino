// Small UI helpers shared by the game objects (art-direction section 6).
import Phaser from 'phaser';
import { FONT_FAMILY, Palette, colorToNumber } from '../constants';

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
  for (const ev of ['pointerup', 'pointerout']) target.on(ev, () => to(baseY, 150, 'Back.easeOut'));
}
