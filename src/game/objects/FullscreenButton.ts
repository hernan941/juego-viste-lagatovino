import Phaser from 'phaser';
import { ObjectEvents, SfxKeys } from '../constants';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { shouldShowFullscreen } from '../systems/touch';
import { addHover, addPress, hex, hitCircle, touchEnv } from './ui';
import { hoverSfx } from './hoverSfx';

const SIZE = 60;

/**
 * Round fullscreen toggle next to the mute one (ADR 0014): four corners that point out (go fullscreen) or in (leave it).
 * Optional: it exists only on a touch device whose browser has the Fullscreen API (`FullscreenButton.create` returns null
 * otherwise, e.g. Safari on iPhone), and the game never depends on it.
 */
export class FullscreenButton extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Container;
  private readonly corners: Phaser.GameObjects.Graphics;

  /** The button, or null where there is nothing to offer. */
  static create(scene: Phaser.Scene, x: number, y: number): FullscreenButton | null {
    return shouldShowFullscreen({ touch: touchEnv().touch, available: scene.sys.game.device.fullscreen.available }) ? new FullscreenButton(scene, x, y) : null;
  }

  private constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const bg = scene.add.graphics();
    bg.fillStyle(hex('rosa600'), 0.18).fillEllipse(0, SIZE / 2 + 2, SIZE - 8, 12);
    bg.fillStyle(hex('rosa200'), 1).fillCircle(0, 4, SIZE / 2);
    const faceGfx = scene.add.graphics();
    faceGfx.fillStyle(hex('crema'), 1).fillCircle(0, 0, SIZE / 2);
    faceGfx.lineStyle(4, hex('rosa200'), 1).strokeCircle(0, 0, SIZE / 2 - 2);
    this.corners = scene.add.graphics();
    this.face = scene.add.container(0, 0, [faceGfx, this.corners]);
    this.add([bg, this.face]);
    scene.add.existing(this);
    this.setSize(SIZE, SIZE);
    this.setInteractive({ hitArea: hitCircle(SIZE, 4, 80), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    addHover(this, 1.1);
    addPress(this, this.face);
    this.draw(scene.scale.isFullscreen);

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

  /** Corners pointing out ("go big") or in ("go back"). */
  private draw(fullscreen: boolean): void {
    const g = this.corners;
    g.clear().lineStyle(5, hex('rosa600'), 1);
    const a = 8;
    const b = 17;
    const arm = 8;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      // Outward: the corner sits at the edge; inward: it sits near the center.
      const c = fullscreen ? a : b;
      g.beginPath().moveTo(sx * (c - arm), sy * c).lineTo(sx * c, sy * c).lineTo(sx * c, sy * (c - arm)).strokePath();
    }
  }

  getCenter(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  destroy(fromScene?: boolean): void {
    this.scene?.scale.off(Phaser.Scale.Events.ENTER_FULLSCREEN, this.onEnter, this);
    this.scene?.scale.off(Phaser.Scale.Events.LEAVE_FULLSCREEN, this.onLeave, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
