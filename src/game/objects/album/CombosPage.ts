import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';
import { comboEntries, gridPositions, setEntries, type ComboEntry, type SetEntry } from '../../domain/albumEntries';
import { pageTally } from '../../domain/albumPages';
import { albumLines } from '../../domain/copy/album';
import type { AlbumPageContext } from './AlbumPage';
import { BookPage, GRID_TOP, entryContext } from './BookPage';
import type { EntryCardSpec } from './EntryCard';
import { Pager } from './Pager';
import { dashedRect, fitImage, silhouetteImage } from './pencil';
import { SET_CELL, buildSetCard, setCardSpec } from './SetCards';
import { makeTappable } from './makeTappable';

const CELL = { w: 380, h: 120 };
const BOX = { w: 366, h: 108 };
const PRIZE = 78;
const PIECE = 46;
/** Three looks on each half. */
const PER_HALF = 3;
/** The sheet of sets (L1) holds four cards on the left and three on the right, and the pager sits under the right ones. */
const SETS_LEFT = 4;
const PAGER_Y = 212;

/** The washi of a hole: two translucent `sol` strips on its top corners. */
function washi(g: Phaser.GameObjects.Graphics, x: number, angle: number): void {
  g.fillStyle(colorToNumber(Ink.sol), 0.7).fillRect(-36, -11, 72, 22);
  g.setPosition(x, -BOX.h / 2).setAngle(angle);
}

/**
 * Looks especiales (F17.4): two sheets. The first has a hole with washi for each of the 6 combos; the second (L1) has the sets,
 * each with its pieces and its prize in the photo mode (the pager shows only when there are sets).
 * While it is not won it is a dashed pencil rectangle with
 * the silhouette of its prize and a whisper; once won, a white card with its name, the icons of its pieces and the prize in color.
 */
export class CombosPage extends BookPage {
  private readonly entries: ComboEntry[];
  private readonly sets: SetEntry[];
  private readonly looksTally: string;
  private readonly setsTally: string;
  private sheet = 0;
  private readonly pager: Pager;

  constructor(scene: Phaser.Scene, tab: string, ctx: AlbumPageContext) {
    super(scene, tab);
    const entries = entryContext(ctx);
    this.entries = comboEntries(entries);
    this.sets = setEntries(entries);
    this.looksTally = albumLines.tally(pageTally('looks', ctx.completion.sections));
    this.setsTally = albumLines.tally({ got: this.sets.filter((e) => e.done).length, total: this.sets.length });
    this.heading(this.looksTally);
    this.pager = new Pager(scene, 0, PAGER_Y, (sheet) => this.show(sheet, true));
    this.right.add(this.pager);
    this.show(0, false);
  }

  protected shown(): { id: string; state: string }[] {
    if (this.sheet === 1) return this.sets.map((e) => ({ id: `set:${e.id}`, state: e.done ? 'done' : 'missing' }));
    return this.entries.map((e) => ({ id: e.id, state: e.state }));
  }

  protected extra(): { page: number; pages: number } {
    return { page: this.sheet, pages: this.sets.length > 0 ? 2 : 1 };
  }

  /** Draws sheet `sheet` (0 the looks, 1 the sets): the cells of the other one go away. */
  private show(sheet: number, turned: boolean): void {
    this.clearCells();
    this.sheet = sheet;
    this.setTally(sheet === 1 ? this.setsTally : this.looksTally);
    this.pager.set(sheet, 2);
    this.pager.setVisible(this.sets.length > 0);
    if (sheet === 1) this.showSets();
    else this.showLooks();
    this.popIn(this.cellList());
    if (turned) this.scene.tweens.add({ targets: this.pager, alpha: { from: 0.6, to: 1 }, duration: 160 });
  }

  private showLooks(): void {
    (['left', 'right'] as const).forEach((side, s) => {
      const part = this.entries.slice(s * PER_HALF, (s + 1) * PER_HALF);
      gridPositions(part.length, 1, CELL.w, CELL.h).forEach((at, i) => {
        const cell = this.buildCell(part[i]!);
        cell.setPosition(at.x, GRID_TOP + at.y);
        this.place(side, part[i]!.id, cell, part[i]!.isNew, { x: BOX.w / 2 - 8, y: -BOX.h / 2 + 6 });
      });
    });
  }

  private showSets(): void {
    (['left', 'right'] as const).forEach((side, s) => {
      const part = s === 0 ? this.sets.slice(0, SETS_LEFT) : this.sets.slice(SETS_LEFT);
      gridPositions(part.length, 1, SET_CELL.w, SET_CELL.h).forEach((at, i) => {
        const entry = part[i]!;
        const face = buildSetCard(this.scene, entry);
        const cell = this.scene.add.container(0, 0, [face]);
        makeTappable(cell, face, SET_CELL.w, SET_CELL.h, () => this.openCard(`set:${entry.id}`, setCardSpec(entry)));
        cell.setPosition(at.x, GRID_TOP + at.y);
        this.place(side, `set:${entry.id}`, cell, entry.isNew, { x: -SET_CELL.w / 2 + 14, y: -SET_CELL.h / 2 + 8 });
      });
    });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens?.killTweensOf(this.pager);
    super.destroy(fromScene);
  }

  private buildCell(entry: ComboEntry): Phaser.GameObjects.Container {
    const scene = this.scene;
    const won = entry.state === 'got';
    const frame = scene.add.graphics();
    const parts: Phaser.GameObjects.GameObject[] = [frame];
    if (won) {
      frame.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-BOX.w / 2 + 4, -BOX.h / 2 + 4, BOX.w, BOX.h, 16);
      frame.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-BOX.w / 2, -BOX.h / 2, BOX.w, BOX.h, 16);
      frame.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-BOX.w / 2, -BOX.h / 2, BOX.w, BOX.h, 16);
      parts.push(fitImage(scene.add.image(-BOX.w / 2 + 56, 0, entry.reward.icon), PRIZE));
      parts.push(
        scene.add.text(-BOX.w / 2 + 110, -28, entry.name, { fontFamily: Fonts.Title, fontSize: '30px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0, 0.5),
      );
      let x = -BOX.w / 2 + 110 + PIECE / 2;
      for (const piece of entry.pieces) {
        if (piece.icon) {
          parts.push(fitImage(scene.add.image(x, 28, piece.icon), PIECE));
          x += PIECE + 6;
        } else {
          // A requirement of "anything with this tag": a little pencil chip with the word.
          const chip = scene.add.text(x - PIECE / 2 + 2, 28, piece.label, { fontFamily: Fonts.Voice, fontSize: '22px', color: Ink.lapiz, padding: { x: 2, y: 4 } }).setOrigin(0, 0.5);
          parts.push(chip);
          x += chip.width + 10;
        }
      }
    } else {
      dashedRect(frame, BOX.w, BOX.h, 12, 8, 0.7);
      parts.push(silhouetteImage(scene, entry.reward.texture, PRIZE, 0.35).setPosition(-BOX.w / 2 + 56, 0));
      parts.push(scene.add.text(-BOX.w / 2 + 56, 0, albumLines.hidden, { fontFamily: Fonts.Title, fontSize: '50px', color: Ink.lineaLapiz, padding: { x: 2, y: 6 } }).setOrigin(0.5));
      parts.push(
        scene.add
          .text(-BOX.w / 2 + 112, 0, entry.hint, { fontFamily: Fonts.Voice, fontSize: '28px', color: Ink.lineaLapiz, wordWrap: { width: BOX.w - 128 }, padding: { x: 2, y: 6 } })
          .setOrigin(0, 0.5),
      );
    }
    const tape = scene.add.graphics();
    washi(tape, -BOX.w / 2 + 70, -3);
    const tape2 = scene.add.graphics();
    washi(tape2, BOX.w / 2 - 70, 3);
    parts.push(tape, tape2);
    const face = scene.add.container(0, 0, parts);
    const cell = scene.add.container(0, 0, [face]);
    makeTappable(cell, face, CELL.w, CELL.h, () => this.openCard(entry.id, this.cardOf(entry)));
    return cell;
  }

  private cardOf(entry: ComboEntry): EntryCardSpec {
    if (entry.state === 'got') {
      return {
        title: entry.name, art: { key: entry.reward.icon, look: 'color' },
        lines: [{ text: albumLines.lookWon }, { text: `${albumLines.pieces}: ${entry.pieces.map((p) => p.label).join(', ')}` }],
      };
    }
    return { title: albumLines.hidden, art: { key: entry.reward.icon, shape: entry.reward.texture, look: 'silhouette' }, lines: [{ text: entry.hint, pencil: true }] };
  }
}
