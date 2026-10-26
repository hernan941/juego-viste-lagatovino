import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, RegistryKeys, SfxKeys, colorToNumber } from '../constants';
import { getAudio } from '../plugins/AudioPlugin';
import { getMotion } from '../plugins/MotionPlugin';
import { STAMP_TILT } from '../systems/kit';
import { profileOf } from '../systems/motion';
import { STAMP_SIZE, StampButton } from './StampButton';
import { hoverSfx } from './hoverSfx';

/**
 * Round stamp next to the mute one (ADR 0013, F12.R A3): a bouncing ball with speed lines, crossed out when motion is reduced.
 * It saves the opposite of the effective state (the player's choice beats the browser's) and follows the registry, so it
 * also changes when the browser's setting changes. Hovering shows, to its left, how motion is now.
 */
export class MotionButton extends StampButton {
  private readonly icon: Phaser.GameObjects.Graphics;
  private readonly slash: Phaser.GameObjects.Graphics;
  private readonly captionBg: Phaser.GameObjects.Graphics;
  private readonly captionText: Phaser.GameObjects.Text;
  private readonly caption: Phaser.GameObjects.Container;
  private reduced = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, STAMP_TILT.motion);
    this.icon = scene.add.graphics();
    this.slash = scene.add.graphics();
    this.face.add([this.icon, this.slash]);
    this.init();
    // A little white card in Gaegu 700 with the state in words, to the left of the stamp.
    this.captionBg = scene.add.graphics();
    this.captionText = scene.add.text(0, 0, '', { fontFamily: Fonts.Voice, fontSize: '22px', fontStyle: '700', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    this.caption = scene.add.container(-STAMP_SIZE / 2 - 14, 4, [this.captionBg, this.captionText]).setAlpha(0);
    this.add(this.caption);

    const audio = getAudio(scene);
    this.refresh(profileOf(scene).reduced, true);
    this.on('pointerover', (p: Phaser.Input.Pointer) => {
      hoverSfx(scene, p, 0.5);
      this.showCaption(true);
    });
    this.on('pointerout', () => this.showCaption(false));
    this.on('pointerup', () => {
      audio.play(SfxKeys.Click);
      getMotion(scene).toggle();
      this.emit(ObjectEvents.MotionToggle, getMotion(scene).reduced);
    });
    // The icon follows the registry: it also changes when the browser's setting changes.
    scene.registry.events.on(`changedata-${RegistryKeys.ReducedMotion}`, this.onRegistry, this);
  }

  protected paintIcon(ink: number, fill: number): void {
    // A ball and the speed lines behind it, in ink line.
    this.icon.clear().lineStyle(4, ink, 1);
    this.icon.strokeCircle(8, 5, 9);
    this.icon.beginPath().moveTo(-21, 12).lineTo(-9, 12).moveTo(-23, 4).lineTo(-8, 4).moveTo(-19, -4).lineTo(-3, -4).strokePath();
    this.slash.clear().lineStyle(9, fill, 1).beginPath().moveTo(-18, -18).lineTo(18, 18).strokePath();
    this.slash.lineStyle(4, ink, 1).beginPath().moveTo(-18, -18).lineTo(18, 18).strokePath();
  }

  private onRegistry(_parent: unknown, value: unknown): void {
    if (!this.scene) return;
    this.refresh(value === true);
    if (this.caption.alpha > 0) this.showCaption(true);
  }

  private refresh(reduced: boolean, instant = false): void {
    this.reduced = reduced;
    this.scene.tweens.killTweensOf([this.slash]);
    if (instant) this.slash.setAlpha(reduced ? 1 : 0);
    else this.scene.tweens.add({ targets: this.slash, alpha: reduced ? 1 : 0, duration: 120 });
    this.setActiveMark(!reduced, instant);
  }

  /** The current state in words, to the left of the button. */
  private showCaption(on: boolean): void {
    this.captionText.setText(this.reduced ? 'Movimiento suave' : 'Movimiento normal');
    const w = this.captionText.width + 28;
    const h = 40;
    this.captionBg.clear();
    this.captionBg.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.captionBg.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    this.caption.setX(-STAMP_SIZE / 2 - 14 - w / 2);
    this.scene.tweens.killTweensOf(this.caption);
    this.scene.tweens.add({ targets: this.caption, alpha: on ? 1 : 0, duration: 140 });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.registry.events.off(`changedata-${RegistryKeys.ReducedMotion}`, this.onRegistry, this);
    this.scene?.tweens.killTweensOf([this.slash, this.caption]);
    super.destroy(fromScene);
  }
}
