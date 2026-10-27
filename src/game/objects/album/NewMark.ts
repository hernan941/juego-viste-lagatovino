import Phaser from 'phaser';
import { Ink, colorToNumber } from '../../constants';
import { profileOf } from '../../systems/motion';

const PULSE_MS = 650;

/**
 * The ✦ of an entry that is new since the last visit (S5): a four-point `sol` sparkle with an ink outline. It pulses until the
 * entry is seen; with reduced motion it simply sits there.
 */
export class NewMark extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, size = 15) {
    super(scene, x, y);
    const points = Array.from({ length: 8 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      const r = i % 2 === 0 ? size : size * 0.34;
      return new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r);
    });
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.sol), 1).fillPoints(points, true);
    g.lineStyle(2.5, colorToNumber(Ink.tinta), 1).strokePoints(points, true);
    this.add(g);
    scene.add.existing(this);
    if (profileOf(scene).loops) {
      scene.tweens.add({ targets: this, scale: 1.3, duration: PULSE_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens?.killTweensOf(this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
