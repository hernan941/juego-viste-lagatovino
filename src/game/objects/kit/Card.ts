import Phaser from 'phaser';
import { Ink, colorToNumber } from '../../constants';
import { appear, killTweensDeep } from './appear';

export interface CardOptions {
  width: number;
  height: number;
  /** Resting rotation in degrees (see `stableTilt`). */
  tilt?: number;
  /** Pops in when created (default). Pass false to have it already there. */
  animate?: boolean;
}

/** Loose card (art-direction section 6): white, 3 px `borde`, radius 20 and a flat 4 px `sombraTarjeta` shadow. Centered on (x, y). */
export class Card extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, { width, height, tilt = 0, animate = true }: CardOptions) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width, height, 20);
    g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-width / 2, -height / 2, width, height, 20);
    g.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 20);
    this.add(g);
    this.setSize(width, height);
    this.setAngle(tilt);
    scene.add.existing(this);
    if (animate) appear(scene, this, { pop: true });
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
