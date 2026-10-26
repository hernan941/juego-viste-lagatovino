import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';
import { appear, killTweensDeep } from './appear';

export interface SpeechBubbleOptions {
  /** Widest the bubble gets before the text wraps. */
  maxWidth?: number;
  /** Pops in when created (default). */
  animate?: boolean;
}

const FONT_SIZE = 28;
const PAD_X = 22;
const PAD_Y = 16;
const TAIL_H = 22;
const INK = colorToNumber(Ink.tinta);

/**
 * Voice bubble (art-direction section 6): white card, hand-drawn ink border (two slightly offset strokes), a drawn tail, Gaegu
 * 28 px and a 2 degree lean. The container origin is the **tip of the tail**; the bubble grows upward from it.
 */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, { maxWidth = 420, animate = true }: SpeechBubbleOptions = {}) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, { fontFamily: Fonts.Voice, fontSize: `${FONT_SIZE}px`, color: Ink.tinta, align: 'center', wordWrap: { width: maxWidth - PAD_X * 2 } })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.layout();
    this.setAngle(2);
    scene.add.existing(this);
    if (animate) appear(scene, this, { pop: true });
  }

  setText(text: string): this {
    this.label.setText(text);
    this.layout();
    return this;
  }

  /** Redraws the bubble around the current text. */
  private layout(): void {
    const w = Math.max(80, this.label.width + PAD_X * 2);
    const h = this.label.height + PAD_Y * 2;
    const top = -TAIL_H - h;
    this.label.setY(top + h / 2);
    const g = this.bg;
    g.clear();
    g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-w / 2, top, w, h, 22);
    g.fillTriangle(-14, -TAIL_H - 2, 14, -TAIL_H - 2, 0, 0);
    // Irregular ink: a full stroke and a thinner, offset one.
    g.lineStyle(3, INK, 1).strokeRoundedRect(-w / 2, top, w, h, 22);
    g.lineStyle(2, INK, 0.55).strokeRoundedRect(-w / 2 + 2, top + 1.5, w - 3, h - 2, 20);
    g.lineStyle(3, INK, 1).lineBetween(-14, -TAIL_H, 0, 0).lineBetween(0, 0, 14, -TAIL_H);
    g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRect(-12, -TAIL_H - 3, 24, 5);
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
