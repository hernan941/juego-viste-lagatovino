import type Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, colorToNumber } from '../constants';
import { shopLines } from '../domain/copy';
import type { CartLineRef } from '../domain/checkout';
import type { Point } from '../domain/types';
import { staggerDelays } from '../domain/stagger';
import { profileOf } from '../systems/motion';
import { Button } from './Button';
import { KIT_MIN_HIT } from '../systems/kit';
import { hoverSfx } from './hoverSfx';
import { addHover, addPress } from './ui';
import { killTweensDeep } from './kit/appear';
import { ModalSheet } from './kit/ModalSheet';

const CARD = { w: 960, h: 620 };
const BUTTONS = { y: 232, h: 88, gap: 14 };
/** The list: x of the picture, of the name and of the price (right aligned), and the vertical room it has. */
const LIST = { icon: -150, name: -112, price: 400, top: -196, room: 268, maxStep: 52, remove: 440 };
const SELLER = { x: -340, y: -72, height: 200 };
const ROW_START_MS = 220;
/** Alpha of [Llevar todo] while the wallet does not reach. */
const PALE = 0.55;

export interface CheckoutLine {
  label: string;
  price: number;
  /** Texture key of the picture (an item). */
  icon?: string;
  /** Color of the dot (a dye bottle), "#RRGGBB". */
  swatch?: string;
  /** What the cross of the line takes off (A6). Without it the line has no cross. */
  ref?: CartLineRef;
}

export interface CheckoutSheetOptions {
  lines: readonly CheckoutLine[];
  total: number;
  /** Buttons the wallet lacks for the whole cart; 0 when it reaches. */
  missing: number;
  /** What the seller says (sellerLines.checkout). */
  sellerLine: string;
  /** Texture of the seller, when there is one. */
  sellerTexture?: string;
}

/**
 * The seller's till (S3, F13.6): a card over a dim sheet with the list of what is worn and not paid, the total, the seller and
 * three pill buttons of 88 height. [Llevar todo] emits `SheetConfirm` when the wallet reaches and `SheetShort` when it does not
 * (the button is paler, but it answers: a touch never goes unanswered); [Sacarme lo que no tengo] emits `SheetLeaveOut`; the cross
 * of a line emits `SheetRemoveLine` with its `ref` and the owner answers with `update()` (the new list, total and wallet state);
 * [Seguir probando] or a tap outside emits `SheetCancel`. It does not close by itself: the controller decides (`close()`).
 */
export class CheckoutSheet extends ModalSheet {
  private readonly takeAll: Button;
  private takeAllX = 0;
  private readonly leaveOut: Button;
  private readonly keepTrying: Button;
  private missing: number;
  private dynamic: Phaser.GameObjects.Container | null = null;
  private totalText: Phaser.GameObjects.Text | null = null;
  private readonly say: Phaser.GameObjects.Text;
  private removePoints: Point[] = [];

  constructor(scene: Phaser.Scene, options: CheckoutSheetOptions) {
    super(scene, { width: CARD.w, height: CARD.h, tilt: -0.6 });
    this.missing = options.missing;
    const title = scene.add.text(0, -CARD.h / 2 + 52, shopLines.checkoutTitle, { fontFamily: Fonts.Title, fontSize: '50px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    this.add(title);
    this.say = this.addSeller(options);
    this.render(options, true);
    const widths = [250, 340, 280];
    const left = -(widths.reduce((a, b) => a + b, 0) + BUTTONS.gap * 2) / 2;
    const xs = widths.map((w, i) => left + widths.slice(0, i).reduce((a, b) => a + b, 0) + BUTTONS.gap * i + w / 2);
    this.takeAll = new Button(scene, xs[0], BUTTONS.y, shopLines.takeAll, { pill: 'primary', width: widths[0], height: BUTTONS.h, fontSize: 38 });
    this.leaveOut = new Button(scene, xs[1], BUTTONS.y, shopLines.leaveOut, { pill: 'secondary', width: widths[1], height: BUTTONS.h, fontSize: 30 });
    this.keepTrying = new Button(scene, xs[2], BUTTONS.y, shopLines.keepTrying, { pill: 'secondary', width: widths[2], height: BUTTONS.h, fontSize: 34 });
    // Short on buttons: paler, but it still answers (the purse shakes).
    this.takeAllX = xs[0];
    if (this.missing > 0) this.takeAll.setAlpha(PALE);
    this.takeAll.on(ObjectEvents.ButtonClick, () => this.emit(this.missing > 0 ? ObjectEvents.SheetShort : ObjectEvents.SheetConfirm));
    this.leaveOut.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetLeaveOut));
    this.keepTrying.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetCancel));
    this.add([this.takeAll, this.leaveOut, this.keepTrying]);
  }

  /** Where each button is, in game coordinates (where a test or a finger presses). */
  getButtonPoints(): { takeAll: Point; leaveOut: Point; keepTrying: Point } {
    return { takeAll: this.takeAll.getCenter(), leaveOut: this.leaveOut.getCenter(), keepTrying: this.keepTrying.getCenter() };
  }

  /** Where the cross of each line is, in game coordinates (where a test or a finger presses). */
  getRemovePoints(): Point[] {
    return this.removePoints.map((p) => ({ x: this.x + p.x, y: this.y + p.y }));
  }

  /**
   * The till after a line went: the new list, total and state of the wallet. The rows stay still (they were already there), the
   * total pops, the seller says her new line and [Llevar todo] pales or lights up.
   */
  update(options: Pick<CheckoutSheetOptions, 'lines' | 'total' | 'missing' | 'sellerLine'>): void {
    if (this.isClosing) return;
    this.missing = options.missing;
    this.render(options, false);
    this.say.setText(options.sellerLine);
    this.takeAll.setAlpha(this.missing > 0 ? PALE : 1);
    const { scene, totalText } = this;
    if (totalText && !profileOf(scene).reduced) {
      scene.tweens.add({ targets: totalText, scale: 1.15, duration: 110, yoyo: true, ease: 'Sine.easeOut' });
    }
  }

  /** The rows hold the crosses, which have their own hover tweens: kill them all before the rows go. */
  private killRowTweens(): void {
    const { scene, dynamic } = this;
    if (!dynamic) return;
    for (const child of dynamic.list) if ('list' in child) killTweensDeep(scene, child as Phaser.GameObjects.Container);
    scene?.tweens?.killTweensOf(dynamic);
  }

  destroy(fromScene?: boolean): void {
    this.killRowTweens();
    super.destroy(fromScene);
  }

  /** "Not enough": the pale button shakes its head (reduced motion: it only blinks). */
  nudge(): void {
    const { scene, takeAll } = this;
    scene.tweens.killTweensOf(takeAll);
    const restX = this.takeAllX;
    takeAll.setX(restX);
    if (profileOf(scene).reduced) {
      takeAll.setAlpha(PALE);
      scene.tweens.add({ targets: takeAll, alpha: 0.2, duration: 90, yoyo: true, repeat: 1, onComplete: () => takeAll.setAlpha(PALE) });
      return;
    }
    scene.tweens.add({ targets: takeAll, x: restX + 12, duration: 60, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: () => takeAll.setX(restX) });
  }

  protected onClosing(): void {
    for (const b of [this.takeAll, this.leaveOut, this.keepTrying]) b.disableInteractive();
  }

  /** The seller behind the counter, with what she says under her; she sways a little (reduced motion: still). */
  private addSeller({ sellerTexture, sellerLine }: CheckoutSheetOptions): Phaser.GameObjects.Text {
    const { scene } = this;
    if (sellerTexture && scene.textures.exists(sellerTexture)) {
      const image = scene.add.image(SELLER.x, SELLER.y, sellerTexture);
      image.setScale(SELLER.height / Math.max(image.height, 1));
      this.add(image);
      const p = profileOf(scene);
      if (!p.reduced) {
        image.setAngle(-1.5);
        scene.tweens.add({ targets: image, angle: 1.5, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    const say = scene.add.text(SELLER.x, SELLER.y + SELLER.height / 2 + 40, sellerLine, {
      fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '28px', color: Ink.tinta, align: 'center', wordWrap: { width: 280 }, padding: { x: 2, y: 6 },
    }).setOrigin(0.5, 0);
    this.add(say);
    return say;
  }

  /** The list, the rule, the total and the "te faltan" line: they are rebuilt whenever a line goes. `animate`: the rows pop in. */
  private render({ lines, total, missing }: Pick<CheckoutSheetOptions, 'lines' | 'total' | 'missing'>, animate: boolean): void {
    const { scene } = this;
    if (this.dynamic) {
      if (this.totalText) scene.tweens.killTweensOf(this.totalText);
      this.killRowTweens();
      this.dynamic.destroy();
    }
    const dynamic = scene.add.container(0, 0);
    this.dynamic = dynamic;
    this.addRows(dynamic, lines, animate);
    const rule = scene.add.graphics();
    rule.lineStyle(3, colorToNumber(Ink.borde), 1).lineBetween(LIST.icon - 24, 82, LIST.price + 10, 82);
    const totalText = scene.add.text(LIST.price, 112, shopLines.total(total), { fontFamily: Fonts.Title, fontSize: '36px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(1, 0.5);
    this.totalText = totalText;
    dynamic.add([rule, totalText]);
    if (missing > 0) {
      const short = scene.add.text(LIST.price, 152, shopLines.notEnough(missing), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '26px', color: Ink.mutedTexto, align: 'right', wordWrap: { width: 620 }, padding: { x: 2, y: 6 } }).setOrigin(1, 0.5);
      dynamic.add(short);
    }
    this.add(dynamic);
  }

  private addRows(into: Phaser.GameObjects.Container, lines: readonly CheckoutLine[], animate: boolean): void {
    const { scene } = this;
    const p = profileOf(scene);
    const step = Math.min(LIST.maxStep, LIST.room / Math.max(lines.length, 1));
    const delays = staggerDelays(lines.length);
    this.removePoints = [];
    lines.forEach((line, i) => {
      const y = LIST.top + step * i + step / 2;
      const row = scene.add.container(0, y);
      if (line.icon) {
        const picture = scene.add.image(LIST.icon, 0, line.icon);
        picture.setScale((step - 4) / Math.max(picture.width, picture.height, 1));
        row.add(picture);
      } else if (line.swatch) {
        const dot = scene.add.graphics();
        dot.fillStyle(colorToNumber(line.swatch), 1).fillCircle(LIST.icon, 0, step / 2 - 4);
        dot.lineStyle(3, colorToNumber(Ink.tinta), 1).strokeCircle(LIST.icon, 0, step / 2 - 4);
        row.add(dot);
      }
      const name = scene.add.text(LIST.name, 0, line.label, { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '30px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0, 0.5);
      const price = scene.add.text(LIST.price, 0, String(line.price), { fontFamily: Fonts.Title, fontSize: '32px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(1, 0.5);
      row.add([name, price]);
      if (line.ref) row.add(this.makeCross(line.ref, step));
      if (line.ref) this.removePoints.push({ x: LIST.remove, y });
      into.add(row);
      if (!animate) return;
      // One after another: a pop (reduced motion: only a fade).
      row.setAlpha(0);
      if (!p.reduced) row.setScale(0.85);
      scene.tweens.add({
        targets: row, alpha: 1, ...(p.reduced ? {} : { scale: 1 }), delay: ROW_START_MS + delays[i], duration: p.reduced ? 200 : 260, ease: p.ease('Back.easeOut'),
      });
    });
  }

  /** The cross of a line: a small ink cross in a round stamp, with a touch area of 80 wide (it asks the owner to take the line off). */
  private makeCross(ref: CartLineRef, step: number): Phaser.GameObjects.Container {
    const { scene } = this;
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillCircle(0, 2, 17);
    g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillCircle(0, 0, 17);
    g.lineStyle(3, colorToNumber(Ink.tinta), 1).strokeCircle(0, 0, 17);
    g.lineStyle(4, colorToNumber(Ink.tinta), 1).beginPath().moveTo(-6, -6).lineTo(6, 6).moveTo(6, -6).lineTo(-6, 6).strokePath();
    const cross = scene.add.container(LIST.remove, 0, [g]);
    cross.setSize(KIT_MIN_HIT, step);
    cross.setInteractive({ useHandCursor: true });
    addHover(cross, 1.15);
    addPress(cross, cross, 2);
    cross.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.5));
    cross.on('pointerdown', () => this.emit(ObjectEvents.SheetRemoveLine, ref));
    return cross;
  }
}
