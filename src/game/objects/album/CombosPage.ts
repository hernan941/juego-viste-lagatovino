import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';
import { comboEntries, gridPositions, type ComboEntry } from '../../domain/albumEntries';
import { pageTally } from '../../domain/albumPages';
import { albumLines } from '../../domain/copy/album';
import type { AlbumPageContext } from './AlbumPage';
import { BookPage, GRID_TOP, entryContext } from './BookPage';
import type { EntryCardSpec } from './EntryCard';
import { dashedRect, fitImage, silhouetteImage } from './pencil';
import { makeTappable } from './makeTappable';

const CELL = { w: 380, h: 132 };
const BOX = { w: 366, h: 118 };
const PRIZE = 78;
const PIECE = 46;
/** Three looks on each half. */
const PER_HALF = 3;

/** The washi of a hole: two translucent `sol` strips on its top corners. */
function washi(g: Phaser.GameObjects.Graphics, x: number, angle: number): void {
  g.fillStyle(colorToNumber(Ink.sol), 0.7).fillRect(-36, -11, 72, 22);
  g.setPosition(x, -BOX.h / 2).setAngle(angle);
}

/**
 * Looks especiales (F17.4): a hole with washi for each of the 6 combos. While it is not won it is a dashed pencil rectangle with
 * the silhouette of its prize and a whisper; once won, a white card with its name, the icons of its pieces and the prize in color.
 */
export class CombosPage extends BookPage {
  private readonly entries: ComboEntry[];

  constructor(scene: Phaser.Scene, tab: string, ctx: AlbumPageContext) {
    super(scene, tab);
    this.entries = comboEntries(entryContext(ctx));
    this.heading(albumLines.tally(pageTally('looks', ctx.completion.sections)));
    (['left', 'right'] as const).forEach((side, s) => {
      const part = this.entries.slice(s * PER_HALF, (s + 1) * PER_HALF);
      gridPositions(part.length, 1, CELL.w, CELL.h).forEach((at, i) => {
        const cell = this.buildCell(part[i]!);
        cell.setPosition(at.x, GRID_TOP + at.y);
        this.place(side, part[i]!.id, cell, part[i]!.isNew, { x: BOX.w / 2 - 8, y: -BOX.h / 2 + 6 });
      });
    });
    this.popIn(this.cellList());
  }

  protected shown(): { id: string; state: string }[] {
    return this.entries.map((e) => ({ id: e.id, state: e.state }));
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
