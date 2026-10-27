import Phaser from 'phaser';
import { ObjectEvents, SfxKeys } from '../constants';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { StampButton } from './StampButton';
import { hoverSfx } from './hoverSfx';

/** Resting tilt, like the other stamps (see STAMP_TILT in systems/kit.ts). */
const NOTEBOOK_TILT = 2;

/**
 * Round notebook stamp (S5, F17.6): an ink drawing of the album, in the corner of DressUp and the Showcase. A `sol` sparkle sits on
 * its corner while the album has entries the player has not seen (`setNews`), so it invites a look. Pressing it makes the book
 * flip open a little; it emits `NotebookPress` and the scene decides what to do (it opens the album).
 */
export class NotebookButton extends StampButton {
  private readonly book: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, news = false) {
    super(scene, x, y, NOTEBOOK_TILT);
    this.book = scene.add.graphics();
    this.face.add(this.book);
    this.init();
    this.setActiveMark(news, true);

    this.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.5));
    this.on('pointerup', () => {
      getAudio(scene).play(SfxKeys.Paper, { volume: 0.7 });
      if (profileOf(scene).shake > 0) scene.tweens.add({ targets: this.face, angle: { from: 12, to: 0 }, duration: 260, ease: 'Back.easeOut' });
      this.emit(ObjectEvents.NotebookPress);
    });
  }

  /** The sparkle of "something new inside". */
  setNews(on: boolean): void {
    this.setActiveMark(on);
  }

  protected paintIcon(ink: number): void {
    const g = this.book.clear().lineStyle(4, ink, 1);
    // The cover, three rings on its left edge and two lines of writing.
    g.strokeRoundedRect(-11, -16, 25, 32, 4);
    for (const y of [-8, 0, 8]) g.beginPath().moveTo(-16, y).lineTo(-8, y).strokePath();
    g.lineStyle(3, ink, 1);
    g.beginPath().moveTo(-3, -6).lineTo(8, -6).strokePath();
    g.beginPath().moveTo(-3, 2).lineTo(5, 2).strokePath();
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf(this.face);
    super.destroy(fromScene);
  }
}
