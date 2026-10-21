import Phaser from 'phaser';
import { FONT_FAMILY, ObjectEvents, Palette, RegistryKeys, SfxKeys } from '../constants';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { getMotion } from '../plugins/MotionPlugin';
import { profileOf } from '../systems/motion';
import { addHover, addPress, hex } from './ui';

const SIZE = 60;

/**
 * Round button next to the mute one (ADR 0013): a bouncing ball with speed lines, crossed out when motion is reduced.
 * It saves the opposite of the effective state (the player's choice beats the browser's) and follows the registry, so it
 * also changes when the browser's setting changes. Hovering shows, to its left, how motion is now.
 */
export class MotionButton extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Container;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly slash: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const bg = scene.add.graphics();
    bg.fillStyle(hex('rosa600'), 0.18).fillEllipse(0, SIZE / 2 + 2, SIZE - 8, 12);
    bg.fillStyle(hex('rosa200'), 1).fillCircle(0, 4, SIZE / 2);
    const faceGfx = scene.add.graphics();
    faceGfx.fillStyle(hex('crema'), 1).fillCircle(0, 0, SIZE / 2);
    faceGfx.lineStyle(4, hex('rosa200'), 1).strokeCircle(0, 0, SIZE / 2 - 2);
    // A ball (with a highlight) and the arc it bounces along.
    faceGfx.fillStyle(hex('rosa600'), 1).fillCircle(8, 5, 9);
    faceGfx.fillStyle(0xffffff, 0.7).fillCircle(5, 2, 2.5);
    this.lines = scene.add.graphics();
    this.lines.lineStyle(4, hex('rosa400'), 1);
    this.lines.beginPath().moveTo(-21, 12).lineTo(-9, 12).moveTo(-23, 4).lineTo(-8, 4).moveTo(-19, -4).lineTo(-3, -4).strokePath();
    this.lines.lineStyle(3, hex('rosa600'), 1).beginPath().arc(2, -2, 17, Math.PI * 1.1, Math.PI * 1.75).strokePath();
    this.slash = scene.add.graphics();
    this.slash.lineStyle(7, hex('crema'), 1).beginPath().moveTo(-17, -17).lineTo(17, 17).strokePath();
    this.slash.lineStyle(4, hex('rosa600'), 1).beginPath().moveTo(-17, -17).lineTo(17, 17).strokePath();
    this.face = scene.add.container(0, 0, [faceGfx, this.lines, this.slash]);
    this.caption = scene.add
      .text(-SIZE / 2 - 8, 4, '', { fontFamily: FONT_FAMILY, fontSize: '22px', color: Palette.texto, fontStyle: '600', stroke: '#FFFFFF', strokeThickness: 6 })
      .setOrigin(1, 0.5)
      .setAlpha(0);
    this.add([bg, this.face, this.caption]);
    scene.add.existing(this);
    this.setSize(SIZE, SIZE);
    this.setInteractive({ hitArea: new Phaser.Geom.Circle(SIZE / 2, SIZE / 2, SIZE / 2 + 4), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    addHover(this, 1.1);
    addPress(this, this.face);

    const audio = getAudio(scene);
    this.refresh(profileOf(scene).reduced, true);
    this.on('pointerover', () => {
      audio.play(SfxKeys.Hover, { volume: 0.5 });
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

  private onRegistry(_parent: unknown, value: unknown): void {
    if (!this.scene) return;
    this.refresh(value === true);
    if (this.caption.alpha > 0) this.showCaption(true);
  }

  private reduced = false;

  private refresh(reduced: boolean, instant = false): void {
    this.reduced = reduced;
    this.scene.tweens.killTweensOf([this.slash]);
    if (instant) this.slash.setAlpha(reduced ? 1 : 0);
    else this.scene.tweens.add({ targets: this.slash, alpha: reduced ? 1 : 0, duration: 120 });
  }

  /** The current state in words, to the left of the button. */
  private showCaption(on: boolean): void {
    this.caption.setText(this.reduced ? 'Movimiento suave' : 'Movimiento normal');
    this.scene.tweens.killTweensOf(this.caption);
    this.scene.tweens.add({ targets: this.caption, alpha: on ? 1 : 0, duration: 140 });
  }

  getCenter(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  destroy(fromScene?: boolean): void {
    this.scene?.registry.events.off(`changedata-${RegistryKeys.ReducedMotion}`, this.onRegistry, this);
    this.scene?.tweens.killTweensOf([this.slash, this.caption]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
