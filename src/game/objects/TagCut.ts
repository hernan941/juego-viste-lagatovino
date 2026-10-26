import type Phaser from 'phaser';
import { SfxKeys, TextureKeys } from '../constants';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { PriceTag } from './PriceTag';

/** Above the dragged garment (5000) and the flying buttons (5200). */
const DEPTH = 5300;
const SCISSORS = { w: 92, h: 66 };
/** The scissors stop with the blades over the thread: a bit to the left of it and just under its tip. */
const BITE = { dx: -22, dy: 10 };

export interface TagCutOptions {
  x: number;
  y: number;
  price: number;
  /** Display scale of the tag (the same as the one it is replacing). */
  scale: number;
  /** The thread is cut (the tag lets go). */
  onSnip?(): void;
  /** The tag is gone and everything was destroyed. */
  onDone?(): void;
}

/**
 * The satisfying part of buying (S3): a pair of scissors crosses, closes twice on the thread ("snip, snip"), and the tag drops
 * spinning and fades. Reduced motion: the scissors do not travel, they appear on the thread, and the tag just fades.
 * It makes its own tag (a copy of the one that was there) so the real tag can leave as soon as the progress changes.
 */
export class TagCut {
  private readonly tag: PriceTag;
  private readonly scissors: Phaser.GameObjects.Image;
  private ended = false;

  constructor(private readonly scene: Phaser.Scene, private readonly options: TagCutOptions) {
    const { x, y, price, scale } = options;
    const p = profileOf(scene);
    this.tag = new PriceTag(scene, x, y, price, { scale }).setDepth(DEPTH);
    this.scissors = scene.add.image(x + BITE.dx - (p.reduced ? 0 : 140), y + BITE.dy, TextureKeys.Scissors)
      .setDisplaySize(SCISSORS.w, SCISSORS.h).setDepth(DEPTH + 1).setAlpha(0).setAngle(p.reduced ? 0 : -14);
    // The blades face right: they close by squashing the image on Y.
    const bite = () => this.snip();
    if (p.reduced) {
      scene.tweens.add({ targets: this.scissors, alpha: 1, duration: 150, onComplete: bite });
      return;
    }
    scene.tweens.add({
      targets: this.scissors, x: x + BITE.dx, angle: 0, alpha: 1, duration: 240, ease: 'Cubic.easeOut',
      onComplete: () => this.close(2, bite),
    });
  }

  /** `times` closings of the blades, then `then`. */
  private close(times: number, then: () => void): void {
    if (this.ended) return;
    const h = this.scissors.scaleY;
    this.scene.tweens.add({
      targets: this.scissors, scaleY: h * 0.5, duration: 70, yoyo: true, repeat: times - 1, ease: 'Sine.easeInOut',
      onComplete: then,
    });
  }

  private snip(): void {
    if (this.ended) return;
    const { scene, tag, scissors } = this;
    const p = profileOf(scene);
    getAudio(scene).play(SfxKeys.Snip);
    this.options.onSnip?.();
    scene.tweens.add({ targets: scissors, alpha: 0, ...(p.reduced ? {} : { x: scissors.x - 60 }), duration: 220, delay: 120 });
    const done = () => this.finish();
    if (p.reduced) {
      scene.tweens.add({ targets: tag, alpha: 0, duration: 260, onComplete: done });
      return;
    }
    // It lets go and falls with gravity, turning, and fades near the end.
    scene.tweens.add({ targets: tag, angle: 200, duration: 700, ease: 'Quad.easeIn' });
    scene.tweens.add({ targets: tag, y: tag.y + 320, duration: 700, ease: 'Quad.easeIn' });
    scene.tweens.add({ targets: tag, alpha: 0, duration: 260, delay: 440, onComplete: done });
  }

  private finish(): void {
    if (this.ended) return;
    this.cancel();
    this.options.onDone?.();
  }

  /** True until the tag is gone. */
  get active(): boolean {
    return !this.ended;
  }

  /** Stops everything and removes what was drawn (the scene shuts down mid-cut). */
  cancel(): void {
    this.ended = true;
    this.scene.tweens.killTweensOf(this.scissors);
    this.scissors.destroy();
    this.tag.destroy();
  }
}
