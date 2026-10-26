import Phaser from 'phaser';
import { Ink, ObjectEvents, SfxKeys, colorToNumber } from '../constants';
import { getAudio } from '../plugins/AudioPlugin';
import { shouldShowFullscreen } from '../systems/touch';
import { STAMP_TILT } from '../systems/kit';
import { StampButton } from './StampButton';
import { touchEnv } from './ui';
import { hoverSfx } from './hoverSfx';

/**
 * Round fullscreen stamp (F12.R A3) next to the mute one (ADR 0014): four corners that point out (go fullscreen) or in (leave it).
 * Optional: it exists only on a touch device whose browser has the Fullscreen API (`FullscreenButton.create` returns null
 * otherwise, e.g. Safari on iPhone), and the game never depends on it.
 */
export class FullscreenButton extends StampButton {
  private readonly corners: Phaser.GameObjects.Graphics;

  /** The button, or null where there is nothing to offer. */
  static create(scene: Phaser.Scene, x: number, y: number): FullscreenButton | null {
    return shouldShowFullscreen({ touch: touchEnv().touch, available: scene.sys.game.device.fullscreen.available }) ? new FullscreenButton(scene, x, y) : null;
  }

  private constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, STAMP_TILT.fullscreen);
    this.corners = scene.add.graphics();
    this.face.add(this.corners);
    this.init();

    this.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.5));
    // The request has to start inside the tap (a browser rule), so it is made right here and not after a tween.
    this.on('pointerup', () => {
      getAudio(scene).play(SfxKeys.Click);
      if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
      else scene.scale.startFullscreen();
      this.emit(ObjectEvents.FullscreenToggle, !scene.scale.isFullscreen);
    });
    scene.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, this.onEnter, this);
    scene.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.onLeave, this);
  }

  private readonly onEnter = () => this.draw(true);
  private readonly onLeave = () => this.draw(false);

  private ink = colorToNumber(Ink.tinta);

  protected paintIcon(ink: number): void {
    this.ink = ink;
    this.draw(this.scene.scale.isFullscreen);
  }

  /** Corners pointing out ("go big") or in ("go back"); the sparkle shows while it is fullscreen. */
  private draw(fullscreen: boolean): void {
    const g = this.corners;
    g.clear().lineStyle(4, this.ink, 1);
    const a = 8;
    const b = 17;
    const arm = 8;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      // Outward: the corner sits at the edge; inward: it sits near the center.
      const c = fullscreen ? a : b;
      g.beginPath().moveTo(sx * (c - arm), sy * c).lineTo(sx * c, sy * c).lineTo(sx * c, sy * (c - arm)).strokePath();
    }
    this.setActiveMark(fullscreen);
  }

  destroy(fromScene?: boolean): void {
    this.scene?.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.onEnter, this);
    this.scene?.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.onLeave, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
