import Phaser from 'phaser';
import { Fonts, Ink } from '../../constants';
import { dyeKey } from '../../data/assets';
import { dyeEntries, gridPositions, setMembership, type DyeEntry, type EntryContext } from '../../domain/albumEntries';
import { pageTally } from '../../domain/albumPages';
import { albumLines } from '../../domain/copy/album';
import type { AlbumPageContext } from './AlbumPage';
import { BookPage, GRID_TOP, entryContext } from './BookPage';
import type { EntryCardSpec } from './EntryCard';
import { fitImage, sketchImage } from './pencil';
import { makeTappable } from './makeTappable';

const COLUMNS = 3;
const CELL = { w: 126, h: 180 };
const BOTTLE = 118;
/** Five bottles on each half. */
const PER_HALF = 5;

/**
 * Tintes (F17.3): the 10 bottles, five on each half. A bought bottle is in color with its name; one that is not is a pencil sketch
 * with the name and the price in pencil. Tapping a bottle opens its card.
 */
export class DyesPage extends BookPage {
  private readonly entries: DyeEntry[];
  private readonly entryCtx: EntryContext;

  constructor(scene: Phaser.Scene, tab: string, ctx: AlbumPageContext) {
    super(scene, tab);
    this.entryCtx = entryContext(ctx);
    this.entries = dyeEntries(this.entryCtx);
    this.heading(albumLines.tally(pageTally('tintes', ctx.completion.sections)));
    (['left', 'right'] as const).forEach((side, s) => {
      const part = this.entries.slice(s * PER_HALF, (s + 1) * PER_HALF);
      gridPositions(part.length, COLUMNS, CELL.w, CELL.h).forEach((at, i) => {
        const cell = this.buildCell(part[i]!);
        cell.setPosition(at.x, GRID_TOP + at.y);
        this.place(side, part[i]!.id, cell, part[i]!.isNew, { x: BOTTLE / 4 + 8, y: -BOTTLE / 2 });
      });
    });
    this.popIn(this.cellList());
  }

  protected shown(): { id: string; state: string }[] {
    return this.entries.map((e) => ({ id: e.id, state: e.state }));
  }

  private buildCell(entry: DyeEntry): Phaser.GameObjects.Container {
    const scene = this.scene;
    const got = entry.state === 'got';
    const bottle = got ? fitImage(scene.add.image(0, -14, dyeKey(entry.id)), BOTTLE) : sketchImage(scene, dyeKey(entry.id), BOTTLE).setY(-14);
    const name = scene.add
      .text(0, 62, entry.name, { fontFamily: Fonts.Voice, fontSize: '28px', color: got ? Ink.tinta : Ink.lineaLapiz, padding: { x: 2, y: 6 } })
      .setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [bottle, name];
    // What is not yours has its price written in pencil under the name.
    if (!got) parts.push(scene.add.text(0, 90, albumLines.price(entry.price), { fontFamily: Fonts.Voice, fontSize: '24px', color: Ink.lineaLapiz, padding: { x: 2, y: 4 } }).setOrigin(0.5));
    const face = scene.add.container(0, 0, parts);
    const cell = scene.add.container(0, 0, [face]);
    makeTappable(cell, face, CELL.w, CELL.h - 20, () => this.openCard(entry.id, this.cardOf(entry)));
    return cell;
  }

  private cardOf(entry: DyeEntry): EntryCardSpec {
    const got = entry.state === 'got';
    const lines: EntryCardSpec['lines'] = [got ? { text: albumLines.dyeGot } : { text: albumLines.dyeSketch(entry.price), pencil: true }];
    // L1: a bottle that is part of a set says which one and how far along it is.
    for (const set of setMembership(this.entryCtx, 'dye', entry.id)) lines.push({ text: albumLines.itemSet(set.name, set.got, set.total) });
    return { title: entry.name, art: { key: dyeKey(entry.id), look: got ? 'color' : 'sketch', size: 130 }, lines };
  }
}
