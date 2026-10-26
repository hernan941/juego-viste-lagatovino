import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, SfxKeys, TextureKeys } from '../constants';
import { KIT_MIN_HIT } from '../systems/kit';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { appear, killTweensDeep } from './kit/appear';

/** The art (ui-price-tag.svg): 120 x 184, the thread tip at (60, 6) and the window for the price at (60, 134). */
const ART = { w: 120, h: 184, pivotY: 6, windowY: 134 };
/** Where the touch area sits: the cardboard body, relative to the thread tip. */
const BODY_CENTER_Y = 115;
const SWAY_ANGLE = 6;
const SWAY_MS = 1400;
const POKE_ANGLE = 18;
const HOVER_GROW = 1.12;

export interface PriceTagOptions {
  /** Display scale of the art (the tag is 120 x 184 at 1). */
  scale?: number;
  /** A touch area of at least 80 x 80 game px that pokes the tag and emits `PriceTagPress`. Off for a tag that only hangs. */
  interactive?: boolean;
  /** Delay of the sway, so a row of tags does not swing in step. */
  phase?: number;
}

/**
 * The price tag of cardboard (S3, art-direction section 6): hangs by its thread from (x, y), the price always written on it.
 * It sways (angle -6 to 6, 1.4 s) and, when poked, jumps to 18 degrees and settles back with Back.easeOut. Reduced motion:
 * no sway, and the poke is a soft pulse.
 */
export class PriceTag extends Phaser.GameObjects.Container {
  readonly price: number;
  private readonly baseScale: number;
  /** What turns around the thread tip. */
  private readonly swing: Phaser.GameObjects.Container;
  private readonly zone?: Phaser.GameObjects.Zone;
  private scaleTween?: Phaser.Tweens.Tween;
  private pokeTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number, price: number, { scale = 0.5, interactive = false, phase = 0 }: PriceTagOptions = {}) {
    super(scene, x, y);
    this.price = price;
    this.baseScale = scale;
    const art = scene.add.image(0, 0, TextureKeys.PriceTag).setOrigin(0.5, ART.pivotY / ART.h);
    const label = scene.add
      .text(0, ART.windowY - ART.pivotY, String(price), { fontFamily: Fonts.Title, fontSize: '40px', color: Ink.tinta, fontStyle: '900', padding: { x: 2, y: 4 } })
      .setOrigin(0.5);
    // Three digits fit the window of the art (64 px) at this size; anything wider shrinks to fit.
    if (label.width > 60) label.setScale(60 / label.width);
    this.swing = scene.add.container(0, 0, [art, label]);
    this.add(this.swing);
    this.setScale(scale);
    scene.add.existing(this);

    if (interactive) {
      const side = KIT_MIN_HIT / scale;
      this.zone = scene.add.zone(0, BODY_CENTER_Y, Math.max(ART.w, side), Math.max(ART.h - ART.pivotY, side)).setInteractive({ useHandCursor: true });
      this.swing.add(this.zone);
      this.zone.on('pointerover', () => this.setHover(true));
      this.zone.on('pointerout', () => this.setHover(false));
      this.zone.on('pointerup', () => {
        this.flick();
        this.emit(ObjectEvents.PriceTagPress, this);
      });
    }

    appear(scene, this);
    if (profileOf(scene).loops) {
      scene.tweens.add({
        targets: this.swing, angle: { from: -SWAY_ANGLE, to: SWAY_ANGLE }, duration: SWAY_MS, delay: phase, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  /** The angle of the tag now, in degrees. */
  get swingAngle(): number {
    return this.swing.angle;
  }

  /** The poke: the tag jumps to 18 degrees and settles back (reduced motion: a soft pulse in place). */
  flick(): void {
    const p = profileOf(this.scene);
    this.pokeTween?.remove();
    getAudio(this.scene).play(SfxKeys.Click, { volume: 0.5, rate: 1.4 });
    if (p.reduced) {
      this.pokeTween = this.scene.tweens.add({ targets: this, scale: this.baseScale * 1.08, duration: 90, yoyo: true, ease: 'Sine.easeOut' });
      return;
    }
    // The sway keeps going underneath: stop it while the poke settles, then it starts again from the middle.
    this.scene.tweens.killTweensOf(this.swing);
    this.swing.setAngle(POKE_ANGLE);
    this.pokeTween = this.scene.tweens.add({
      targets: this.swing, angle: 0, duration: 520, ease: 'Back.easeOut',
      onComplete: () => {
        this.pokeTween = undefined;
        if (!this.scene) return;
        this.scene.tweens.add({ targets: this.swing, angle: { from: -SWAY_ANGLE, to: SWAY_ANGLE }, duration: SWAY_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
  }

  /** The mouse over it (or over its cell): it grows a little. A finger has no hover. */
  setHover(on: boolean): void {
    this.scaleTween?.remove();
    this.scaleTween = this.scene.tweens.add({ targets: this, scale: this.baseScale * (on ? HOVER_GROW : 1), duration: 100, ease: 'Sine.easeOut' });
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.scene?.tweens?.killTweensOf(this.swing);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
