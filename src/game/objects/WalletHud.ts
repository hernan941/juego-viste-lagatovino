import Phaser from 'phaser';
import { Fonts, Ink, SfxKeys, TextureKeys, colorToNumber } from '../constants';
import { countSteps } from '../domain/wallet';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { appear, killTweensDeep } from './kit/appear';

const PILL_W = 112;
const PILL_H = 44;
/** The jar sticks out of the left of the pill. */
const JAR_X = -PILL_W / 2 - 4;
const JAR_SIZE = { w: 40, h: 50 };

/**
 * The purse (S3): a little jar of buttons and the number in Londrina Solid. The number ticks one unit at a time (1.2 s at most)
 * and pops. A scene that flies buttons into it `hold`s the number, adds each landing with `adjust` and `release`s at the end.
 * Centered on (x, y), where the pill is.
 */
export class WalletHud extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private readonly view: Phaser.GameObjects.Container;
  private shown = 0;
  private counting: Phaser.Time.TimerEvent | null = null;
  private held = false;
  private popTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-PILL_W / 2 + 3, -PILL_H / 2 + 4, PILL_W, PILL_H, PILL_H / 2);
    g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-PILL_W / 2, -PILL_H / 2, PILL_W, PILL_H, PILL_H / 2);
    g.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-PILL_W / 2, -PILL_H / 2, PILL_W, PILL_H, PILL_H / 2);
    const jar = scene.add.image(JAR_X, -2, TextureKeys.Purse).setDisplaySize(JAR_SIZE.w, JAR_SIZE.h);
    this.label = scene.add
      .text(14, 1, '0', { fontFamily: Fonts.Title, fontSize: '28px', color: Ink.tinta, fontStyle: '900', padding: { x: 2, y: 4 } })
      .setOrigin(0.5);
    this.view = scene.add.container(0, 0, [g, jar, this.label]);
    this.add(this.view);
    scene.add.existing(this);
    appear(scene, this, { pop: true });
  }

  /** The number on screen. */
  get value(): number {
    return this.shown;
  }

  get text(): string {
    return this.label.text;
  }

  get isHeld(): boolean {
    return this.held;
  }

  get isCounting(): boolean {
    return this.counting !== null;
  }

  /** Where the buttons land (or leave from): the jar, in game coordinates. */
  getJarPoint(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx + JAR_X, y: m.ty - 2 };
  }

  /** Shows the number at once (no tick, no pop). */
  setValue(n: number): void {
    this.stopCounting();
    this.show(n);
  }

  /** Ticks from the number on screen to `n`, one unit per tick and 1.2 s at most. Ignored while held. */
  countTo(n: number): void {
    if (this.held) return;
    this.stopCounting();
    const { values, stepMs } = countSteps(this.shown, n);
    if (values.length === 0) return;
    let i = 0;
    this.counting = this.scene.time.addEvent({
      delay: stepMs, repeat: values.length - 1,
      callback: () => {
        this.show(values[i++]);
        getAudio(this.scene).play(SfxKeys.Hover, { rate: 1.8, volume: 0.6 });
        if (i >= values.length) {
          this.counting = null;
          this.pop();
        }
      },
    });
  }

  /** The number stops following the progress (the scene moves it with `adjust` as buttons land). */
  hold(): void {
    this.held = true;
    this.stopCounting();
  }

  /** Follows the progress again: counts to `n` if it is not there yet. */
  release(n: number): void {
    this.held = false;
    this.countTo(n);
  }

  /** A button landed (positive) or left (negative): the number moves by its credit and pops. */
  adjust(credit: number): void {
    this.show(Math.max(0, this.shown + credit));
    this.pop();
  }

  /** Pop 1 to 1.15 to 1 (reduced motion: a fifth of that). */
  pop(): void {
    const p = profileOf(this.scene);
    this.popTween?.remove();
    this.view.setScale(1);
    this.popTween = this.scene.tweens.add({
      targets: this.view, scale: 1 + 0.15 * Math.max(p.squash, 0.2), duration: 110, yoyo: true, ease: 'Sine.easeOut',
      onComplete: () => { this.popTween = undefined; },
    });
  }

  /** "Not enough": a little shake. With reduced motion, a blink in place. */
  shake(): void {
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this.view);
    this.view.x = 0;
    this.view.setAlpha(1);
    if (p.shake === 0) {
      this.scene.tweens.add({ targets: this.view, alpha: 0.4, duration: 110, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
      return;
    }
    this.scene.tweens.add({
      targets: this.view, x: { from: -7, to: 7 }, duration: 55, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: () => { this.view.x = 0; },
    });
  }

  private show(n: number): void {
    this.shown = n;
    this.label.setText(String(n));
  }

  private stopCounting(): void {
    this.counting?.remove();
    this.counting = null;
  }

  destroy(fromScene?: boolean): void {
    this.stopCounting();
    killTweensDeep(this.scene, this);
    this.scene?.tweens?.killTweensOf(this.view);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
