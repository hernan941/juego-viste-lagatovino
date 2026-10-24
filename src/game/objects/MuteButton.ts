import Phaser from 'phaser';
import { ObjectEvents, SfxKeys } from '../constants';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { addHover, addPress, hex, hitCircle } from './ui';
import { hoverSfx } from './hoverSfx';

const SIZE = 60;

/** Round speaker button that mutes and unmutes every sound; the state persists through the AudioPlugin. */
export class MuteButton extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Container;
  private readonly waves: Phaser.GameObjects.Graphics;
  private readonly slash: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const bg = scene.add.graphics();
    bg.fillStyle(hex('rosa600'), 0.18).fillEllipse(0, SIZE / 2 + 2, SIZE - 8, 12);
    bg.fillStyle(hex('rosa200'), 1).fillCircle(0, 4, SIZE / 2);
    const faceGfx = scene.add.graphics();
    faceGfx.fillStyle(hex('crema'), 1).fillCircle(0, 0, SIZE / 2);
    faceGfx.lineStyle(4, hex('rosa200'), 1).strokeCircle(0, 0, SIZE / 2 - 2);
    // Speaker: a box and a cone.
    faceGfx.fillStyle(hex('rosa600'), 1);
    faceGfx.fillRoundedRect(-17, -7, 9, 14, 3);
    faceGfx.fillPoints([new Phaser.Math.Vector2(-10, -7), new Phaser.Math.Vector2(1, -16), new Phaser.Math.Vector2(1, 16), new Phaser.Math.Vector2(-10, 7)], true);
    this.waves = scene.add.graphics();
    this.waves.lineStyle(4, hex('rosa600'), 1);
    this.waves.beginPath().arc(2, 0, 9, -0.9, 0.9).strokePath();
    this.waves.beginPath().arc(2, 0, 16, -0.9, 0.9).strokePath();
    this.slash = scene.add.graphics();
    this.slash.lineStyle(5, hex('rosa600'), 1).beginPath().moveTo(7, -9).lineTo(19, 9).moveTo(19, -9).lineTo(7, 9).strokePath();
    this.face = scene.add.container(0, 0, [faceGfx, this.waves, this.slash]);
    this.add([bg, this.face]);
    scene.add.existing(this);
    this.setSize(SIZE, SIZE);
    this.setInteractive({ hitArea: hitCircle(SIZE, 4, 80), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    addHover(this, 1.1);
    addPress(this, this.face);

    const audio = getAudio(scene);
    this.refresh(audio.muted, true);
    this.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.5));
    this.on('pointerup', () => {
      // Turning it off: the click is the last sound. Turning it on: the first one.
      if (!audio.muted) audio.play(SfxKeys.Click);
      const muted = audio.toggleMute();
      if (!muted) audio.play(SfxKeys.Click);
      this.refresh(muted);
      this.emit(ObjectEvents.MuteToggle, muted);
    });
  }

  private refresh(muted: boolean, instant = false): void {
    this.scene.tweens.killTweensOf([this.waves, this.slash]);
    const to = (g: Phaser.GameObjects.Graphics, alpha: number) =>
      instant ? g.setAlpha(alpha) : this.scene.tweens.add({ targets: g, alpha, duration: 120 });
    to(this.waves, muted ? 0 : 1);
    to(this.slash, muted ? 1 : 0);
    if (!instant && profileOf(this.scene).shake > 0) {
      this.scene.tweens.add({ targets: this.face, angle: { from: -10, to: 0 }, duration: 220, ease: 'Back.easeOut' });
    }
  }

  getCenter(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}

