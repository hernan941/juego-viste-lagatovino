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

/** Hover feedback for anything interactive: grows to 1.05 in 100 ms and shows the hand cursor. */
export function addHover(target: Phaser.GameObjects.Container, scale = 1.05): void {
  const scene = target.scene;
  const to = (s: number) => {
    scene.tweens.killTweensOf(target);
    scene.tweens.add({ targets: target, scale: s, duration: 100, ease: 'Sine.easeOut' });
  };
  target.on('pointerover', () => to(scale));
  target.on('pointerout', () => to(1));
}
