import type Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../constants';
import type { SheetEntry } from '../domain/catSheet';
import { tasteLines } from '../domain/copy';
import { profileOf } from '../systems/motion';
import { hintText } from '../systems/touch';
import { touchEnv } from './ui';
import { ModalSheet } from './kit/ModalSheet';
import { TasteChip } from './TasteChip';

const CARD = { w: 760, h: 520 };
/** Chip rows, from the center of the card: the two loves and the dislike, then the favorite and the color. */
const ROWS = [
  { y: -66, width: 214, gap: 232 },
  { y: 40, width: 320, gap: 340 },
];
const CHIP_H = 84;
const STAGGER_MS = 70;

export interface CatSheetOptions {
  catName: string;
  /** The five tastes in order, found or not (`catSheetEntries`). */
  entries: readonly SheetEntry[];
  /** The line in Gaegu: a clue while something is missing. */
  hint: string;
}

/**
 * The sheet of the cat (S2, F14.4): the name sign opens it. A card with a washi tape on top and the five tastes as chips; the ones
 * not found yet show a "?" in the color of their kind, and a clue in Gaegu tells where to look. A tap outside emits `SheetCancel`
 * (the controller closes it). The chips pop in one after another.
 */
export class CatSheet extends ModalSheet {
  readonly chips: TasteChip[] = [];

  constructor(scene: Phaser.Scene, { catName, entries, hint }: CatSheetOptions) {
    super(scene, { width: CARD.w, height: CARD.h, tilt: -0.8 });
    const found = entries.filter((e) => e.found).length;
    const washi = scene.add.graphics();
    washi.fillStyle(colorToNumber(Ink.sol), 0.7).fillRect(-60, -15, 120, 30);
    washi.setPosition(0, -CARD.h / 2 + 2).setAngle(-3);
    const title = scene.add.text(0, -CARD.h / 2 + 64, tasteLines.sheetTitle(catName), { fontFamily: Fonts.Title, fontSize: '48px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    const count = scene.add.text(0, -CARD.h / 2 + 116, tasteLines.count(found, entries.length), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '28px', color: Ink.mutedTexto, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    const clue = scene.add.text(0, 134, `“${hint}”`, {
      fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '36px', color: Ink.tinta, align: 'center', wordWrap: { width: CARD.w - 120 }, padding: { x: 2, y: 6 },
    }).setOrigin(0.5);
    const close = scene.add.text(0, CARD.h / 2 - 34, tasteLines.closeHint(), { fontFamily: Fonts.Voice, ...hintText(24, touchEnv()), padding: { x: 2, y: 6 } }).setOrigin(0.5);
    this.add([washi, title, count, clue, close]);
    this.addChips(entries);
  }

  private addChips(entries: readonly SheetEntry[]): void {
    const { scene } = this;
    const p = profileOf(scene);
    const perRow = [3, Math.max(0, entries.length - 3)];
    let index = 0;
    perRow.forEach((n, r) => {
      const row = ROWS[r];
      for (let i = 0; i < n; i++, index++) {
        const entry = entries[index];
        const x = (i - (n - 1) / 2) * row.gap;
        const chip = new TasteChip(scene, x, row.y, entry, { found: entry.found, width: row.width, height: CHIP_H, animate: false });
        this.add(chip);
        this.chips.push(chip);
        // One after another, each with a pop (reduced motion: only a fade).
        chip.setAlpha(0);
        if (!p.reduced) chip.setScale(0.8);
        scene.tweens.add({
          targets: chip, alpha: 1, ...(p.reduced ? {} : { scale: 1 }), delay: 220 + index * STAGGER_MS, duration: p.reduced ? 200 : 260, ease: p.ease('Back.easeOut'),
        });
      }
    });
  }
}
