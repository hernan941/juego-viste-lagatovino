import Phaser from 'phaser';
import { Ink, colorToNumber } from '../../constants';
import { profileOf } from '../../systems/motion';
import { SpeechBubble } from '../kit/SpeechBubble';
import { TweenBag } from './TweenBag';

export interface JudgeOptions {
  /** Texture of the character (from brand.json). Without it, or if it is not loaded, a plain drawing stands in. */
  texture?: string;
  /** Height of the drawing, in px. */
  height?: number;
}

const SLIDE_PX = 300;

/**
 * The supervisor cat of the runway. The origin is the middle of his feet. He slides in from the right (Back.easeOut, 420 ms),
 * and his words come in a speech bubble above his head (Gaegu). Texture and name are data (brand.json), never code.
 */
export class JudgeCharacter extends Phaser.GameObjects.Container {
  private readonly bag: TweenBag;
  private readonly figure: Phaser.GameObjects.Container;
  private readonly drawnHeight: number;
  private bubble?: SpeechBubble;

  constructor(scene: Phaser.Scene, x: number, y: number, { texture, height = 190 }: JudgeOptions = {}) {
    super(scene, x, y);
    this.bag = new TweenBag(scene);
    this.drawnHeight = height;
    this.figure = scene.add.container(0, 0);
    if (texture && scene.textures.exists(texture)) {
      const image = scene.add.image(0, 0, texture).setOrigin(0.5, 1);
      image.setScale(height / image.height);
      this.figure.add(image);
    } else {
      this.figure.add(this.drawStandIn(scene, height));
    }
    this.add(this.figure);
    this.setSize(height, height);
    this.setAlpha(0);
    scene.add.existing(this);
  }

  /** A plain grey cat with a notebook: only for when the character has no art yet. */
  private drawStandIn(scene: Phaser.Scene, h: number): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    const r = h * 0.3;
    g.fillStyle(0xa9a9b8, 1).fillCircle(0, -h * 0.4, r).fillTriangle(-r, -h * 0.55, -r * 0.4, -h * 0.82, 0, -h * 0.62).fillTriangle(r, -h * 0.55, r * 0.4, -h * 0.82, 0, -h * 0.62);
    g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(r * 0.5, -h * 0.25, r * 0.9, r * 1.1, 6);
    g.lineStyle(5, colorToNumber(Ink.tinta), 1).strokeCircle(0, -h * 0.4, r).strokeRoundedRect(r * 0.5, -h * 0.25, r * 0.9, r * 1.1, 6);
    return g;
  }

  /** Slides in from the right and fades in. With reduced motion (`slide` false) he only fades in. */
  enter(ms: number, slide: boolean, onDone?: () => void): void {
    const p = profileOf(this.scene);
    const rest = this.x;
    this.setAlpha(0);
    const config: Phaser.Types.Tweens.TweenBuilderConfig = { targets: this, alpha: 1, duration: ms, ease: p.ease('Back.easeOut'), onComplete: onDone };
    if (slide) {
      this.x = rest + SLIDE_PX;
      config.x = rest;
    }
    this.bag.add(config);
  }

  /** Shows `text` in the bubble above his head; saying something else replaces the bubble. */
  say(text: string): void {
    this.bubble?.destroy();
    this.bubble = new SpeechBubble(this.scene, -this.drawnHeight * 0.1, -this.drawnHeight - 4, text, { maxWidth: 440 });
    this.add(this.bubble);
  }

  /** A little hop of joy (he applauds a good look). Reduced motion: nothing moves. */
  hop(): void {
    const p = profileOf(this.scene);
    if (p.squash < 0.5) return;
    this.bag.add({ targets: this.figure, y: -22, duration: 130, yoyo: true, repeat: 1, ease: 'Sine.easeOut' });
  }

  speedUp(factor: number): void {
    this.bag.speedUp(factor);
  }

  destroy(fromScene?: boolean): void {
    this.bag.clear();
    this.bubble?.destroy();
    this.scene?.tweens?.killTweensOf(this);
    this.scene?.tweens?.killTweensOf(this.figure);
    super.destroy(fromScene);
  }
}
