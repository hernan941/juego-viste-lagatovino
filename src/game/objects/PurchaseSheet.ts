import type Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents } from '../constants';
import { shopLines } from '../domain/copy';
import type { ClothingDef, Point } from '../domain/types';
import { Button } from './Button';
import { ModalSheet } from './kit/ModalSheet';

const CARD = { w: 600, h: 440 };
const PICTURE = 170;
const BUTTON = { w: 230, h: 88 };

/**
 * "¿Te lo llevas?" (S3, F13.5): a card over a dim sheet, in the middle of the screen, with the garment, its name and price, and
 * two pill buttons of 88 height. [Llevar] emits `SheetConfirm`, [Todavía no] or a tap outside emits `SheetCancel`. It does not
 * close by itself: the controller decides (`close()`).
 */
export class PurchaseSheet extends ModalSheet {
  private readonly take: Button;
  private readonly notYet: Button;

  constructor(scene: Phaser.Scene, readonly item: Pick<ClothingDef, 'id' | 'name' | 'icon'>, readonly price: number) {
    super(scene, { width: CARD.w, height: CARD.h });
    const title = scene.add.text(0, -CARD.h / 2 + 52, shopLines.purchaseTitle, { fontFamily: Fonts.Title, fontSize: '46px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    const picture = scene.add.image(0, -34, item.icon);
    picture.setScale(PICTURE / Math.max(picture.width, picture.height, 1));
    const line = scene.add.text(0, 78, shopLines.purchaseLine(item.name, price), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '34px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    this.take = new Button(scene, -BUTTON.w / 2 - 14, CARD.h / 2 - 70, shopLines.take, { pill: 'primary', width: BUTTON.w, height: BUTTON.h, fontSize: 38 });
    this.notYet = new Button(scene, BUTTON.w / 2 + 14, CARD.h / 2 - 70, shopLines.notYet, { pill: 'secondary', width: BUTTON.w, height: BUTTON.h, fontSize: 34 });
    this.take.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetConfirm));
    this.notYet.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetCancel));
    this.add([title, picture, line, this.take, this.notYet]);
  }

  /** Where each button is, in game coordinates (where a test or a finger presses). */
  getButtonPoints(): { take: Point; notYet: Point } {
    return { take: this.take.getCenter(), notYet: this.notYet.getCenter() };
  }

  protected onClosing(): void {
    this.take.disableInteractive();
    this.notYet.disableInteractive();
  }
}
