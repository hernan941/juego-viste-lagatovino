import Phaser from 'phaser';
import { ObjectEvents, SfxKeys } from '../constants';
import { getAudio } from '../plugins/AudioPlugin';
import { STAMP_TILT } from '../systems/kit';
import { profileOf } from '../systems/motion';
import { StampButton } from './StampButton';
import { hoverSfx } from './hoverSfx';

/** Round speaker stamp that mutes and unmutes every sound (F12.R A3); the state persists through the AudioPlugin. */
export class MuteButton extends StampButton {
  private readonly speaker: Phaser.GameObjects.Graphics;
  private readonly waves: Phaser.GameObjects.Graphics;
  private readonly slash: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, STAMP_TILT.mute);
    this.speaker = scene.add.graphics();
    this.waves = scene.add.graphics();
    this.slash = scene.add.graphics();
    this.face.add([this.speaker, this.waves, this.slash]);
    this.init();

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

  protected paintIcon(ink: number, fill: number): void {
    // Speaker: a box and a cone, as an ink line drawing.
    const g = this.speaker.clear().lineStyle(4, ink, 1);
    g.beginPath().moveTo(-17, -6).lineTo(-9, -6).lineTo(1, -15).lineTo(1, 15).lineTo(-9, 6).lineTo(-17, 6).closePath().strokePath();
    this.waves.clear().lineStyle(4, ink, 1);
    this.waves.beginPath().arc(2, 0, 9, -0.9, 0.9).strokePath();
    this.waves.beginPath().arc(2, 0, 16, -0.9, 0.9).strokePath();
    // "Off" is an ink stroke with a halo of the disc color, never red.
    this.slash.clear().lineStyle(9, fill, 1).beginPath().moveTo(-20, -19).lineTo(20, 19).strokePath();
    this.slash.lineStyle(4, ink, 1).beginPath().moveTo(-20, -19).lineTo(20, 19).strokePath();
  }

  private refresh(muted: boolean, instant = false): void {
    this.scene.tweens.killTweensOf([this.waves, this.slash]);
    const to = (g: Phaser.GameObjects.Graphics, alpha: number) =>
      instant ? g.setAlpha(alpha) : this.scene.tweens.add({ targets: g, alpha, duration: 120 });
    to(this.waves, muted ? 0 : 1);
    to(this.slash, muted ? 1 : 0);
    this.setActiveMark(!muted, instant);
    if (!instant && profileOf(this.scene).shake > 0) {
      this.scene.tweens.add({ targets: this.face, angle: { from: -10, to: 0 }, duration: 220, ease: 'Back.easeOut' });
    }
  }
}

