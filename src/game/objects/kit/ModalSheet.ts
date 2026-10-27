import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, ObjectEvents } from '../../constants';
import { profileOf } from '../../systems/motion';
import { killTweensDeep } from './appear';
import { addBackdrop } from './backdrop';
import { Card } from './Card';

const CLOSE_MS = 180;

export interface ModalSheetOptions {
  width: number;
  height: number;
  /** Resting rotation of the card in degrees. */
  tilt?: number;
}

/**
 * A card in the middle of the screen over a dim sheet (the purchase sheet, the cat sheet). The base builds the backdrop (a tap
 * outside emits `SheetCancel`), the card and a zone that keeps the touches that land on the card; subclasses add their content
 * with `this.add`. It never closes by itself: whoever owns it calls `close()`.
 */
export abstract class ModalSheet extends Phaser.GameObjects.Container {
  protected readonly card: Card;
  private closing = false;

  protected constructor(scene: Phaser.Scene, { width, height, tilt = -1 }: ModalSheetOptions) {
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    addBackdrop(scene, this, () => this.emit(ObjectEvents.SheetCancel));
    this.card = new Card(scene, 0, 0, { width, height, tilt });
    // The card catches the touches that land on it: tapping the card is not tapping outside.
    const catcher = scene.add.zone(0, 0, width, height).setInteractive();
    this.add([this.card, catcher]);
    scene.add.existing(this);
    this.setDepth(6000);
  }

  get isClosing(): boolean {
    return this.closing;
  }

  /** Called once when `close()` starts: a subclass stops its buttons here. */
  protected onClosing(): void {}

  /** Fades out (the card shrinks a little) and destroys itself. Calling it again does nothing. */
  close(onDone?: () => void): void {
    if (this.closing) return;
    this.closing = true;
    this.onClosing();
    const reduced = profileOf(this.scene).reduced;
    // The dim sheet only fades: scaled, its edges would show.
    if (!reduced) this.scene.tweens.add({ targets: this.card, scale: 0.94, duration: CLOSE_MS, ease: 'Sine.easeIn' });
    this.scene.tweens.add({
      targets: this, alpha: 0, duration: CLOSE_MS, ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy();
        onDone?.();
      },
    });
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
