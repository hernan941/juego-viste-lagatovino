import Phaser from 'phaser';
import { FONT_FAMILY, ObjectEvents, Palette, SfxKeys } from '../constants';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { addHover, addPress, hex, hitRect } from './ui';
import { hoverSfx } from './hoverSfx';

export type ButtonTone = 'rosa' | 'mantequilla' | 'menta' | 'lavanda';

/** Face and base colors of each tone (art-direction section 4: palette, base always darker). */
const TONES: Record<ButtonTone, { face: number; base: number; text: string; stroke: string }> = {
  rosa: { face: hex('rosa400'), base: hex('rosa600'), text: '#FFFFFF', stroke: Palette.rosa600 },
  mantequilla: { face: hex('mantequilla'), base: 0xf0cf63, text: Palette.texto, stroke: '#FFF9D6' },
  menta: { face: hex('menta'), base: 0x86d4b4, text: Palette.texto, stroke: '#E8FAF1' },
  lavanda: { face: hex('lavanda'), base: 0xb7a5f2, text: Palette.texto, stroke: '#F1ECFF' },
};

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  tone?: ButtonTone;
}

const LIFT = 8;

/**
 * "Chubby" button (art-direction section 6): a soft 3D base under the face, which sinks 4 px when pressed.
 * Grows on hover, sounds on hover and click, and emits ButtonClick when it is pressed and released on it.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Container;
  private readonly text: Phaser.GameObjects.Text;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, options: ButtonOptions = {}) {
    super(scene, x, y);
    const { width = 240, height = 84, fontSize = 36, tone = 'rosa' } = options;
    const t = TONES[tone];
    const bg = scene.add.graphics();
    bg.fillStyle(hex('rosa600'), 0.18).fillEllipse(0, height / 2 + 2, width - 20, 14);
    bg.fillStyle(t.base, 1).fillRoundedRect(-width / 2, -height / 2 + LIFT, width, height - LIFT, (height - LIFT) / 2);
    const faceGfx = scene.add.graphics();
    faceGfx.fillStyle(t.face, 1).fillRoundedRect(-width / 2, -height / 2, width, height - LIFT, (height - LIFT) / 2);
    faceGfx.fillStyle(0xffffff, 0.55).fillRoundedRect(-width / 2 + 26, -height / 2 + 9, width * 0.35, 10, 5).fillCircle(-width / 2 + 26 + width * 0.35 + 14, -height / 2 + 14, 4.5);
    this.text = scene.add
      .text(0, -LIFT / 2, label, { fontFamily: FONT_FAMILY, fontSize: `${fontSize}px`, color: t.text, fontStyle: '600', stroke: t.stroke, strokeThickness: tone === 'rosa' ? 5 : 0 })
      .setOrigin(0.5);
    this.face = scene.add.container(0, 0, [faceGfx, this.text]);
    this.add([bg, this.face]);
    scene.add.existing(this);
    this.setSize(width, height);
    // Phone: the touch area grows to 44 CSS px (up to half a button's height more); the drawing stays.
    this.setInteractive({ hitArea: hitRect(width, height, { height: height + 24 }), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });

    addHover(this, 1.05);
    addPress(this, this.face);
    const audio = getAudio(scene);
    this.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.5));
    this.on('pointerdown', () => { this.pressed = true; });
    this.on('pointerout', () => { this.pressed = false; });
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
