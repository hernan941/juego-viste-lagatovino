import Phaser from 'phaser';
import { Fonts, GAME_HEIGHT, GAME_WIDTH, Ink, ObjectEvents } from '../constants';
import { shopLines } from '../domain/copy';
import type { ClothingDef, Point } from '../domain/types';
import { profileOf } from '../systems/motion';
import { Button } from './Button';
import { Card } from './kit/Card';
import { addBackdrop } from './kit/backdrop';
import { killTweensDeep } from './kit/appear';

const CARD = { w: 600, h: 440 };
const PICTURE = 170;
const BUTTON = { w: 230, h: 88 };
const CLOSE_MS = 180;

/**
 * "¿Te lo llevas?" (S3, F13.5): a card over a dim sheet, in the middle of the screen, with the garment, its name and price, and
 * two pill buttons of 88 height. [Llevar] emits `SheetConfirm`, [Todavía no] or a tap outside emits `SheetCancel`. It does not
 * close by itself: the controller decides (`close()`).
 */
export class PurchaseSheet extends Phaser.GameObjects.Container {
  private readonly take: Button;
  private readonly notYet: Button;
  private readonly card: Card;
  private closing = false;

  constructor(scene: Phaser.Scene, readonly item: ClothingDef, readonly price: number) {
    super(scene, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    addBackdrop(scene, this, () => this.emit(ObjectEvents.SheetCancel));
    const card = this.card = new Card(scene, 0, 0, { width: CARD.w, height: CARD.h, tilt: -1 });
    // The card catches the touches that land on it: tapping the card is not tapping outside.
    const catcher = scene.add.zone(0, 0, CARD.w, CARD.h).setInteractive();
    const title = scene.add.text(0, -CARD.h / 2 + 52, shopLines.purchaseTitle, { fontFamily: Fonts.Title, fontSize: '46px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    const picture = scene.add.image(0, -34, item.icon);
    picture.setScale(PICTURE / Math.max(picture.width, picture.height, 1));
    const line = scene.add.text(0, 78, shopLines.purchaseLine(item.name, price), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '34px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    this.take = new Button(scene, -BUTTON.w / 2 - 14, CARD.h / 2 - 70, shopLines.take, { pill: 'primary', width: BUTTON.w, height: BUTTON.h, fontSize: 38 });
    this.notYet = new Button(scene, BUTTON.w / 2 + 14, CARD.h / 2 - 70, shopLines.notYet, { pill: 'secondary', width: BUTTON.w, height: BUTTON.h, fontSize: 34 });
    this.take.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetConfirm));
    this.notYet.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetCancel));
    this.add([card, catcher, title, picture, line, this.take, this.notYet]);
    scene.add.existing(this);
    this.setDepth(6000);
  }

  /** Where each button is, in game coordinates (where a test or a finger presses). */
  getButtonPoints(): { take: Point; notYet: Point } {
    return { take: this.take.getCenter(), notYet: this.notYet.getCenter() };
  }

  get isClosing(): boolean {
    return this.closing;
  }

  /** Fades out and destroys itself. Calling it again does nothing. */
  close(onDone?: () => void): void {
    if (this.closing) return;
    this.closing = true;
    this.take.disableInteractive();
    this.notYet.disableInteractive();
    const reduced = profileOf(this.scene).reduced;
    // The card shrinks a little; the dim sheet only fades (scaled, its edges would show).
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
