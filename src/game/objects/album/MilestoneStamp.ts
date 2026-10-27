import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';
import { albumLines } from '../../domain/copy';
import { profileOf } from '../../systems/motion';

const R = 92;
const HOLD_MS = 1900;
const LAND_MS = 380;
const LEAVE_MS = 320;

export interface StampCallbacks {
  /** The stamp hit the page: the scene shakes, bursts and plays the sound here. */
  onLand?: () => void;
  /** The stamp is gone. */
  onDone?: () => void;
}

/**
 * The stamp of a milestone (25, 50, 75, 100 %): a sun-yellow seal with the percentage and, on a strip of washi, what it gives to the
 * photo mode. It slams onto the notebook from big and tilted (Back.easeOut), stays a moment and floats away; a tap sends it off
 * early. With reduced motion it only fades in and out.
 */
export class MilestoneStamp extends Phaser.GameObjects.Container {
  private gone = false;
  private hold?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly pct: number, private readonly callbacks: StampCallbacks = {}) {
    super(scene, x, y);
    const ink = colorToNumber(Ink.tinta);
    const seal = scene.add.graphics();
    // A scalloped edge: sixteen little bumps around the disc, then the ink outline.
    const bumps = 16;
    seal.fillStyle(colorToNumber(Ink.sol), 1);
    for (let i = 0; i < bumps; i++) {
      const a = (i * Math.PI * 2) / bumps;
      seal.fillCircle(Math.cos(a) * R, Math.sin(a) * R, 14);
    }
    seal.fillCircle(0, 0, R);
    seal.lineStyle(4, ink, 1).strokeCircle(0, 0, R - 10);
    const label = scene.add
      .text(0, -6, albumLines.milestoneStamp(pct), { fontFamily: Fonts.Title, fontSize: '62px', color: Ink.tinta, padding: { x: 6, y: 10 } })
      .setOrigin(0.5);
    const prize = scene.add
      .text(0, 0, albumLines.milestonePrize(pct), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '26px', color: Ink.tinta, padding: { x: 4, y: 8 }, align: 'center' })
      .setOrigin(0.5);
    const w = Math.max(240, prize.width + 40);
    const strip = scene.add.graphics();
    strip.fillStyle(colorToNumber(Ink.rosa), 0.92).fillRect(-w / 2, -22, w, 44);
    strip.lineStyle(3, ink, 1).strokeRect(-w / 2, -22, w, 44);
    const tape = scene.add.container(0, R + 38, [strip, prize]).setAngle(-3);
    this.add([seal, label, tape]);
    this.setAlpha(0);
    scene.add.existing(this);
    this.land();
  }

  private land(): void {
    const { scene } = this;
    if (profileOf(scene).reduced) {
      scene.tweens.add({ targets: this, alpha: 1, duration: 200, onComplete: () => this.afterLand() });
      return;
    }
    this.setScale(2.6).setAngle(-16);
    scene.tweens.add({
      targets: this, alpha: 1, scale: 1, angle: -6, duration: LAND_MS, ease: 'Back.easeOut',
      onComplete: () => this.afterLand(),
    });
  }

  private afterLand(): void {
    if (this.gone) return;
    this.callbacks.onLand?.();
    this.hold = this.scene.time.delayedCall(HOLD_MS, () => this.dismiss());
  }

  /** Floats away (a tap, or the time is up); the stamp is destroyed at the end. */
  dismiss(): void {
    if (this.gone) return;
    this.gone = true;
    this.hold?.remove();
    const reduced = profileOf(this.scene).reduced;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this, alpha: 0, ...(reduced ? {} : { y: this.y - 50, scale: 1.1 }), duration: LEAVE_MS, ease: 'Sine.easeIn',
      onComplete: () => {
        this.callbacks.onDone?.();
        this.destroy();
      },
    });
  }

  get isGone(): boolean {
    return this.gone;
  }

  destroy(fromScene?: boolean): void {
    this.gone = true;
    this.hold?.remove();
    this.scene?.tweens?.killTweensOf(this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
