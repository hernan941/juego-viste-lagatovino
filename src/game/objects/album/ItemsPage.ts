import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';
import { gridPositions, itemEntries, paginate, type ItemEntry } from '../../domain/albumEntries';
import { albumLines } from '../../domain/copy/album';
import { pageTally } from '../../domain/albumPages';
import type { AlbumPageContext } from './AlbumPage';
import { BookPage, GRID_TOP, entryContext } from './BookPage';
import type { EntryCardSpec } from './EntryCard';
import { Pager } from './Pager';
import { dashedRect, fitImage, silhouetteImage } from './pencil';
import { makeTappable } from './makeTappable';

const COLUMNS = 5;
const CELL = { w: 78, h: 112 };
const ICON = 58;
/** A spread: 15 entries on each half (3 rows of 5). */
const PER_HALF = 15;
const PER_SPREAD = PER_HALF * 2;
const PAGER_Y = 204;

/**
 * Prendas (F17.3): the 50 clothes in a grid on each half. What is yours is in color on a white card; what is not is a pencil sketch
 * with its price written under it; a secret that is not won is a faint silhouette with a "?". Tapping an entry opens its card.
 * A spread holds 30, so the rest is on a second spread with a small pager.
 */
export class ItemsPage extends BookPage {
  private readonly entries: ItemEntry[];
  private current: ItemEntry[] = [];
  private pageIndex = 0;
  private pages = 1;
  private readonly pager: Pager;

  constructor(scene: Phaser.Scene, tab: string, ctx: AlbumPageContext) {
    super(scene, tab);
    this.entries = itemEntries(entryContext(ctx));
    this.heading(albumLines.tally(pageTally('prendas', ctx.completion.sections)));
    this.pager = new Pager(scene, 0, PAGER_Y, (page) => this.show(page, true));
    this.right.add(this.pager);
    this.show(0, false);
  }

  protected shown(): { id: string; state: string }[] {
    return this.current.map((e) => ({ id: e.id, state: e.state }));
  }

  protected extra(): { page: number; pages: number } {
    return { page: this.pageIndex, pages: this.pages };
  }

  /** Draws spread `page`: the cells of the other one go away. */
  private show(page: number, turned: boolean): void {
    this.clearCells();
    const slice = paginate(this.entries, page, PER_SPREAD);
    this.pageIndex = slice.page;
    this.pages = slice.pages;
    this.current = slice.items;
    this.pager.set(slice.page, slice.pages);
    this.pager.setVisible(slice.pages > 1);
    const sides: ('left' | 'right')[] = ['left', 'right'];
    sides.forEach((side, s) => {
      const part = slice.items.slice(s * PER_HALF, (s + 1) * PER_HALF);
      gridPositions(part.length, COLUMNS, CELL.w, CELL.h).forEach((at, i) => {
        const cell = this.buildCell(part[i]!);
        cell.setPosition(at.x, GRID_TOP + at.y);
        this.place(side, part[i]!.id, cell, part[i]!.isNew, { x: CELL.w / 2 - 12, y: -CELL.h / 2 + 12 });
      });
    });
    this.popIn(this.cellList());
    if (turned) this.scene.tweens.add({ targets: this.pager, alpha: { from: 0.6, to: 1 }, duration: 160 });
  }

  private buildCell(entry: ItemEntry): Phaser.GameObjects.Container {
    const scene = this.scene;
    const face = scene.add.container(0, 0);
    const frame = scene.add.graphics();
    if (entry.state === 'got') {
      frame.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-CELL.w / 2 + 7, -CELL.h / 2 + 11, CELL.w - 10, CELL.h - 14, 12);
      frame.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-CELL.w / 2 + 4, -CELL.h / 2 + 8, CELL.w - 10, CELL.h - 14, 12);
      frame.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-CELL.w / 2 + 4, -CELL.h / 2 + 8, CELL.w - 10, CELL.h - 14, 12);
    } else {
      frame.setPosition(-1, 1);
      dashedRect(frame, CELL.w - 10, CELL.h - 14, 8, 6, 0.55);
    }
    face.add(frame);
    if (entry.state === 'got') face.add(fitImage(scene.add.image(0, -12, entry.icon), ICON));
    else {
      const art = silhouetteImage(scene, entry.texture, ICON, entry.state === 'secret' ? 0.35 : 0.5).setY(-12);
      face.add(art);
    }
    if (entry.state === 'secret') {
      face.add(scene.add.text(0, -12, albumLines.hidden, { fontFamily: Fonts.Title, fontSize: '44px', color: Ink.lineaLapiz, padding: { x: 2, y: 6 } }).setOrigin(0.5));
    }
    if (entry.state === 'sketch') {
      face.add(scene.add.text(0, 34, albumLines.price(entry.price), { fontFamily: Fonts.Voice, fontSize: '26px', color: Ink.lineaLapiz, padding: { x: 2, y: 4 } }).setOrigin(0.5));
    }
    const cell = scene.add.container(0, 0, [face]);
    makeTappable(cell, face, CELL.w, CELL.h, () => this.openCard(entry.id, this.cardOf(entry)));
    return cell;
  }

  private cardOf(entry: ItemEntry): EntryCardSpec {
    if (entry.state === 'secret') {
      return { title: albumLines.hidden, art: { key: entry.icon, shape: entry.texture, look: 'silhouette' }, lines: [{ text: entry.hint ?? albumLines.secretHint, pencil: true }] };
    }
    if (entry.state === 'sketch') {
      return { title: entry.name, art: { key: entry.icon, shape: entry.texture, look: 'sketch' }, lines: [{ text: albumLines.itemSketch(entry.price), pencil: true }] };
    }
    return { title: entry.name, art: { key: entry.icon, look: 'color' }, lines: [{ text: albumLines.itemGot }] };
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens?.killTweensOf(this.pager);
    super.destroy(fromScene);
  }
}
