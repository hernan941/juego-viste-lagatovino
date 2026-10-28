import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, SfxKeys, colorToNumber } from '../constants';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { addKitFeedback, kitHitRect } from './ui';
import { hoverSfx } from './hoverSfx';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  /** Lagatovino flat pill (art-direction section 6.3): primary is ink, secondary is a card. */
  pill?: 'primary' | 'secondary';
}

const INK = colorToNumber(Ink.tinta);
const CARD = colorToNumber(Ink.tarjeta);

/**
 * Flat pill button (art-direction section 6.3). Hover swaps its colors, press shrinks it (kit feedback), it sounds on hover and
 * click, and emits ButtonClick when it is pressed and released on it.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, options: ButtonOptions = {}) {
    super(scene, x, y);
    const { width = 240, height = 84, fontSize = 36, pill = 'primary' } = options;
    this.text = scene.add.text(0, 0, label, { fontFamily: Fonts.Title, fontSize: `${fontSize}px`, color: Ink.cremaPapel }).setOrigin(0.5);
    this.face = scene.add.container(0, 0);
    this.buildPill(scene, width, height, pill);
  }

  /** Flat pill: primary is ink with paper text, secondary is a card with an ink border; hover swaps the colors. */
  private buildPill(scene: Phaser.Scene, width: number, height: number, kind: 'primary' | 'secondary'): void {
    const gfx = scene.add.graphics();
    const paint = (hovered: boolean) => {
      const inverted = (kind === 'primary') !== hovered;
      const fill = inverted ? INK : CARD;
      gfx.clear();
      gfx.fillStyle(fill, 1).fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
      gfx.lineStyle(3, INK, 1).strokeRoundedRect(-width / 2, -height / 2, width, height, height / 2);
      this.text.setColor(inverted ? Ink.cremaPapel : Ink.tinta);
    };
    paint(false);
    this.face.add([gfx, this.text]);
    this.add(this.face);
    scene.add.existing(this);
    this.setSize(width, height);
    this.setInteractive({ hitArea: kitHitRect(width, height), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    addKitFeedback(this, this.face);
    const audio = getAudio(scene);
    this.on('pointerover', (p: Phaser.Input.Pointer) => { paint(true); hoverSfx(scene, p, 0.5); });
    this.on('pointerdown', () => { this.pressed = true; });
    this.on('pointerout', () => { this.pressed = false; paint(false); });
    this.on('pointerup', () => {
      if (!this.pressed) return;
      this.pressed = false;
      audio.play(SfxKeys.Click);
      this.emit(ObjectEvents.ButtonClick);
    });
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  /** Center in game coordinates (where a test clicks). */
  getCenter(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
