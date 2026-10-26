import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, Ink, colorToNumber } from '../../constants';
import { gridLines } from '../../systems/kit';
import { appear, killTweensDeep } from './appear';

export interface PaperBackgroundOptions {
  width?: number;
  height?: number;
  /** Distance between grid lines, 24 px in the art direction. */
  step?: number;
  /** Fades in when created (default). */
  animate?: boolean;
}

/** Cream paper with a blue grid (art-direction section 6). Fills the canvas from (0, 0); give it a negative depth to keep it behind. */
export class PaperBackground extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, { width = GAME_WIDTH, height = GAME_HEIGHT, step = 24, animate = true }: PaperBackgroundOptions = {}) {
    super(scene, 0, 0);
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.cremaPapel), 1).fillRect(0, 0, width, height);
    g.lineStyle(1, colorToNumber(Ink.lineaCuadricula), 1);
    const grid = gridLines(width, height, step);
    for (const x of grid.vertical) g.lineBetween(x, 0, x, height);
    for (const y of grid.horizontal) g.lineBetween(0, y, width, y);
    this.add(g);
    this.setSize(width, height);
    scene.add.existing(this);
    if (animate) appear(scene, this);
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
