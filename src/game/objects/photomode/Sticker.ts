import Phaser from 'phaser';
import { ObjectEvents } from '../../constants';
import type { Point } from '../../domain/types';
import { STICKER_SIZE } from '../../domain/photoComposition';
import { tiltToward } from '../../domain/tilt';
import { profileOf } from '../../systems/motion';
import { killTweensDeep } from '../kit/appear';
import { hitRect } from '../ui';

/** How much bigger a sticker is while it is in the hand, and how fast it catches up with the pointer. */
const HELD_SCALE = 1.18;
const CATCH_UP = 0.0004;

/**
 * A sticker of the photo mode, centered on (x, y). It is peeled off the sheet (`peel`), follows the pointer leaning with its
 * speed (`follow`, the tilt of the garments), settles with a little stamp (`settle`) and goes away with a pop (`poof`). Once it is
 * on the photo it can be picked up again: it emits StickerGrab (sticker, pointer) when a drag starts on it.
 */
export class Sticker extends Phaser.GameObjects.Container {
  private readonly view: Phaser.GameObjects.Container;
  private held = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly id: string, texture: string) {
    super(scene, x, y);
    const img = scene.add.image(0, 0, texture);
    img.setScale(STICKER_SIZE / img.height);
    this.view = scene.add.container(0, 0, [img]);
    this.add(this.view);
    this.setSize(STICKER_SIZE, STICKER_SIZE);
    scene.add.existing(this);
  }

  /** Makes a placed sticker draggable (it is pulled again when a drag starts on it). */
  enableGrab(): void {
    if (this.input) return;
    this.setInteractive({ hitArea: hitRect(STICKER_SIZE, STICKER_SIZE), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true, draggable: true });
    this.on('dragstart', (p: Phaser.Input.Pointer) => {
      if (!this.held) this.emit(ObjectEvents.StickerGrab, this, p);
    });
  }

  get isHeld(): boolean {
    return this.held;
  }

  /** Comes off the sheet (or off the photo): it grows, leans and a little squash says it is soft paper. */
  peel(): void {
    this.held = true;
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this.view);
    this.scene.tweens.killTweensOf(this);
    if (p.reduced) {
      this.view.setScale(HELD_SCALE);
      return;
    }
    this.view.setScale(0.8, 1.15);
    this.scene.tweens.add({ targets: this.view, scaleX: HELD_SCALE, scaleY: HELD_SCALE, duration: 200, ease: p.ease('Back.easeOut') });
    this.scene.tweens.add({ targets: this, angle: { from: -14, to: 0 }, duration: 260, ease: p.ease('Back.easeOut') });
  }

  /** Every frame while it is in the hand: it moves toward the pointer and leans with the speed it goes at. */
  follow(target: Point, deltaMs: number): void {
    const k = 1 - Math.pow(CATCH_UP, Math.max(0, deltaMs) / 1000);
    const dx = (target.x - this.x) * k;
    this.x += dx;
    this.y += (target.y - this.y) * k;
    this.setAngle(tiltToward(this.angle, dx, deltaMs, profileOf(this.scene).reduced ? 0 : 1));
  }

  /** Lands at `to` with `angle`: a stamp (scale 1.2 back to 1) with Back.easeOut; a plain fade-in nudge with reduced motion. */
  settle(to: Point, angle: number): void {
    this.held = false;
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.view);
    if (p.reduced) {
      this.setPosition(to.x, to.y).setAngle(angle);
      this.view.setScale(1);
      return;
    }
    this.scene.tweens.add({ targets: this, x: to.x, y: to.y, angle, duration: 120, ease: 'Sine.easeOut' });
    this.view.setScale(HELD_SCALE);
    this.scene.tweens.add({ targets: this.view, scale: { from: 1.2, to: 1 }, duration: 240, ease: p.ease('Back.easeOut') });
  }

  /** Goes away: shrinks and fades (only fades with reduced motion), then destroys itself. */
  poof(): void {
    this.held = false;
    this.disableInteractive();
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.view);
    this.scene.tweens.add({
      targets: this, alpha: 0, scale: p.reduced ? 1 : 0.3, angle: this.angle + (p.reduced ? 0 : 40), duration: p.reduced ? 180 : 200, ease: p.reduced ? 'Sine.easeIn' : 'Back.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
