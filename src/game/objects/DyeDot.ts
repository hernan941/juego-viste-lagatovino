import Phaser from 'phaser';
import { Ink, colorToNumber } from '../constants';
import { profileOf } from '../systems/motion';

/**
 * The little dot of color (F16.4, S4) that says "this garment is dyed": on the wardrobe cell and on the row of the layers panel.
 * It is empty (invisible) until it has a color; a color pops in with a bounce, and a new color pops again.
 */
export class DyeDot extends Phaser.GameObjects.Container {
  hex: string | null = null;
  private readonly radius: number;
  private readonly art: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 11) {
    super(scene, x, y);
    this.radius = radius;
    this.art = scene.add.graphics();
    this.add(this.art);
    this.setAlpha(0);
  }

  /** Shows the color of a dye (null: no dye, the dot goes away). */
  setDye(hex: string | null): void {
    if (hex === this.hex) return;
    this.hex = hex;
    this.scene.tweens.killTweensOf(this);
    if (hex === null) {
      this.setAlpha(0);
      return;
    }
    const r = this.radius;
    this.art.clear();
    // A flat dot with the thick dark outline of the art direction, and a tiny white glint.
    this.art.fillStyle(colorToNumber(hex), 1).fillCircle(0, 0, r);
    this.art.lineStyle(3, colorToNumber(Ink.tinta), 1).strokeCircle(0, 0, r);
    this.art.fillStyle(0xffffff, 0.8).fillCircle(-r * 0.35, -r * 0.35, r * 0.2);
    this.setAlpha(1);
    const p = profileOf(this.scene);
    if (p.reduced) {
      this.setScale(1);
      return;
    }
    this.setScale(0.2);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }
}
