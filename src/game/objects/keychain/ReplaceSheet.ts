import type Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents } from '../../constants';
import { keychainLines } from '../../domain/copy';
import type { Point } from '../../domain/types';
import { Button } from '../Button';
import { ModalSheet } from '../kit/ModalSheet';

const CARD = { w: 640, h: 420 };
const BUTTON = { w: 270, h: 88 };

export interface ReplaceSheetOptions {
  catName: string;
  /** Stars of the keychain that hangs now and of the new one. */
  before: number;
  now: number;
  /** The answer that is highlighted (the rule of `defaultReplace`): true = [Cambiarlo], false = [Dejar el anterior]. */
  replaceByDefault: boolean;
}

/**
 * "¿Cambio el llavero de Luna?" (S8, F19.4): a card over a dim sheet that is always asked when a hook already has a keychain. The
 * button of the answer the rule prefers (the one with more stars) is the primary pill. [Cambiarlo] emits `SheetConfirm`, [Dejar el
 * anterior] emits `SheetKeep`, and a tap outside emits `SheetCancel` (nothing is decided). The owner calls `close()`.
 */
export class ReplaceSheet extends ModalSheet {
  private readonly yes: Button;
  private readonly keep: Button;

  constructor(scene: Phaser.Scene, options: ReplaceSheetOptions) {
    super(scene, { width: CARD.w, height: CARD.h });
    const title = scene.add.text(0, -CARD.h / 2 + 62, keychainLines.replaceTitle(options.catName), { fontFamily: Fonts.Title, fontSize: '44px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    const line = scene.add.text(0, -26, keychainLines.replaceStars(options.before, options.now), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '34px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    const y = CARD.h / 2 - 82;
    const x = BUTTON.w / 2 + 10;
    this.yes = new Button(scene, -x, y, keychainLines.replaceYes, { pill: options.replaceByDefault ? 'primary' : 'secondary', width: BUTTON.w, height: BUTTON.h, fontSize: 32 });
    this.keep = new Button(scene, x, y, keychainLines.replaceNo, { pill: options.replaceByDefault ? 'secondary' : 'primary', width: BUTTON.w, height: BUTTON.h, fontSize: 30 });
    this.yes.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetConfirm));
    this.keep.on(ObjectEvents.ButtonClick, () => this.emit(ObjectEvents.SheetKeep));
    this.add([title, line, this.yes, this.keep]);
  }

  /** Where each button is, in game coordinates (where a test or a finger presses). */
  getButtonPoints(): { replace: Point; keep: Point } {
    return { replace: this.yes.getCenter(), keep: this.keep.getCenter() };
  }

  protected onClosing(): void {
    this.yes.disableInteractive();
    this.keep.disableInteractive();
  }
}
