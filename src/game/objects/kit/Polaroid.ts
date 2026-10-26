import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';
import { stableTilt } from '../../domain/stableTilt';
import { profileOf } from '../../systems/motion';
import { appear, killTweensDeep } from './appear';

export interface PolaroidOptions {
  /** Seed of the resting rotation: the same id always leans the same way. */
  id: string;
  width?: number;
  height?: number;
  /** Texture of the photo, fitted inside the window. Without it the window is empty `cielo`. */
  texture?: string;
  /** What is written under the photo, in Gaegu. */
  caption?: string;
  /** Falls in with its washi when created (default). */
  animate?: boolean;
}

const MARGIN = 14;
const CAPTION_H = 64;

/** Photo card with a `sol` washi tape on top (art-direction section 6). Centered on (x, y); it falls in and the washi sticks down. */
export class Polaroid extends Phaser.GameObjects.Container {
  private readonly washi: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, { id, width = 220, height = 270, texture, caption, animate = true }: PolaroidOptions) {
    super(scene, x, y);
    const frame = scene.add.graphics();
    frame.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width, height, 12);
    frame.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    frame.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
    const winW = width - MARGIN * 2;
    const winH = height - MARGIN * 2 - CAPTION_H;
    const winY = -height / 2 + MARGIN;
    frame.fillStyle(colorToNumber(Ink.cielo), 1).fillRect(-winW / 2, winY, winW, winH);
    this.add(frame);
    if (texture) {
      const photo = scene.add.image(0, winY + winH / 2, texture);
      photo.setScale(Math.min(winW / photo.width, winH / photo.height));
      this.add(photo);
    }
    if (caption) {
      this.add(scene.add.text(0, height / 2 - CAPTION_H / 2 - 2, caption, { fontFamily: Fonts.Voice, fontSize: '30px', color: Ink.tinta }).setOrigin(0.5));
    }
    this.washi = scene.add.graphics();
    this.washi.fillStyle(colorToNumber(Ink.sol), 0.7).fillRect(-45, -13, 90, 26);
    this.washi.setPosition(0, -height / 2 + 2).setAngle(-3);
    this.add(this.washi);
    this.setSize(width, height);
    const tilt = stableTilt(id);
    this.setAngle(tilt);
    scene.add.existing(this);
    if (animate) {
      appear(scene, this, { fallTo: tilt });
      if (!profileOf(scene).reduced) {
        // The washi "sticks": it lands a bit big and flattens against the card.
        this.washi.setScale(1.5, 1.5).setAlpha(0);
        scene.tweens.add({ targets: this.washi, scaleX: 1, scaleY: 1, alpha: 1, duration: 200, delay: 120, ease: 'Back.easeOut' });
      }
    }
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
