import Phaser from 'phaser';
import { Fonts, Ink, SfxKeys } from '../../constants';
import { ALBUM_TABS } from '../../domain/albumPages';
import { HALF, type EntryContext } from '../../domain/albumEntries';
import { staggerDelays } from '../../domain/stagger';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import type { AlbumPage, AlbumPageContext } from './AlbumPage';
import { PAGE_AREA } from './AlbumPage';
import { createEntryCard, type EntryCardSpec } from './EntryCard';
import { NewMark } from './NewMark';

/** Y (in a half) of the title line of a page and of the first row under it. */
export const HEADER_Y = -212;
export const GRID_TOP = -176;
/** Hand-written entries pop in one after another: this far apart, and never longer than STAGGER_CAP in all. */
const STAGGER_MS = 32;
const STAGGER_CAP = 560;
const CARD_CLOSE_MS = 120;

/** The entry builders take what the page was given plus the entries seen. */
export function entryContext(ctx: AlbumPageContext): EntryContext {
  return { catalog: ctx.catalog, progress: ctx.progress, seen: ctx.progress.albumSeen };
}

export type HalfSide = 'left' | 'right';

/**
 * The base of the pages that live on the open sheet (F17.3, F17.4): two halves, left and right, each centered on its own side of
 * the spine, with the rings of the notebook free in the middle. A half is a container whose (0, 0) is the middle of its area.
 * It also owns what every page shares: the title, the sparkles of the new entries, the staggered pop-in and the card of an entry.
 */
export abstract class BookPage extends Phaser.GameObjects.Container implements AlbumPage {
  readonly left: Phaser.GameObjects.Container;
  readonly right: Phaser.GameObjects.Container;
  protected readonly cells = new Map<string, Phaser.GameObjects.Container>();
  private readonly sides = new Map<string, HalfSide>();
  private marks: NewMark[] = [];
  private tallyText: Phaser.GameObjects.Text | null = null;
  /** Everything `place` put on the halves (cells and sparkles), so a page can swap its entries. */
  private placed: Phaser.GameObjects.Container[] = [];
  private card: { id: string; view: Phaser.GameObjects.Container; scrim: Phaser.GameObjects.Zone } | null = null;
  /** The card that is shrinking away. */
  private closing: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, protected readonly tab: string) {
    super(scene, 0, 0);
    this.left = scene.add.container(HALF.left.center, 0);
    this.right = scene.add.container(HALF.right.center, 0);
    this.add([this.left, this.right]);
    scene.add.existing(this);
  }

  get view(): Phaser.GameObjects.Container {
    return this;
  }

  /** Ids and states of what is drawn now. */
  protected abstract shown(): { id: string; state: string }[];

  /** Extra numbers of the page (the inner page of a long one). */
  protected extra(): { page: number; pages: number } {
    return { page: 0, pages: 1 };
  }

  info(): { tab: string; shown: { id: string; state: string }[]; page: number; pages: number; card: string | null; marks: number } {
    return { tab: this.tab, shown: this.shown(), ...this.extra(), card: this.card?.id ?? null, marks: this.marks.length };
  }

  cellOf(id: string): Phaser.GameObjects.Container | undefined {
    return this.cells.get(id);
  }

  cardView(): Phaser.GameObjects.Container | null {
    return this.card?.view ?? null;
  }

  half(side: HalfSide): Phaser.GameObjects.Container {
    return side === 'left' ? this.left : this.right;
  }

  /** The title of the page, hand-written at the top of the left half, and how many entries are got at the right of it. */
  protected heading(tally: string): void {
    const title = ALBUM_TABS.find((t) => t.id === this.tab)?.label ?? '';
    const style = { padding: { x: 2, y: 8 } };
    this.tallyText = this.scene.add.text(HALF.width / 2 - 6, HEADER_Y + 4, tally, { fontFamily: Fonts.Voice, fontSize: '30px', color: Ink.lapiz, ...style }).setOrigin(1, 0.5);
    this.left.add([
      this.scene.add.text(-HALF.width / 2 + 6, HEADER_Y, title, { fontFamily: Fonts.Title, fontSize: '42px', color: Ink.tinta, ...style }).setOrigin(0, 0.5),
      this.tallyText,
    ]);
  }

  /** Changes the count at the right of the title (a page with two sheets counts something else on each). */
  protected setTally(tally: string): void {
    this.tallyText?.setText(tally);
  }

  /** Puts a cell on its half and remembers it by id; a new entry gets its sparkle on the corner. */
  protected place(side: HalfSide, id: string, cell: Phaser.GameObjects.Container, isNew: boolean, corner: { x: number; y: number }): void {
    this.half(side).add(cell);
    this.cells.set(id, cell);
    this.sides.set(id, side);
    this.placed.push(cell);
    if (isNew) {
      const mark = new NewMark(this.scene, cell.x + corner.x, cell.y + corner.y);
      this.half(side).add(mark);
      this.marks.push(mark);
      this.placed.push(mark);
    }
  }

  /** Takes every placed entry off the page (the card included), to draw others. */
  protected clearCells(): void {
    this.closeCard(true);
    for (const view of this.placed) {
      this.scene.tweens.killTweensOf(view);
      view.destroy();
    }
    this.placed = [];
    this.marks = [];
    this.cells.clear();
    this.sides.clear();
  }

  /** The cells placed so far, in order. */
  protected cellList(): Phaser.GameObjects.Container[] {
    return [...this.cells.values()];
  }

  /** The cells pop in one after another (a fade only with reduced motion); nothing appears all at once. */
  protected popIn(cells: Phaser.GameObjects.Container[]): void {
    const reduced = profileOf(this.scene).reduced;
    const step = Math.min(STAGGER_MS, STAGGER_CAP / Math.max(1, cells.length));
    const delays = staggerDelays(cells.length, step);
    cells.forEach((cell, i) => {
      cell.setAlpha(0);
      if (reduced) {
        this.scene.tweens.add({ targets: cell, alpha: 1, delay: delays[i], duration: 180 });
        return;
      }
      cell.setScale(0.8);
      this.scene.tweens.add({ targets: cell, alpha: 1, scale: 1, delay: delays[i], duration: 240, ease: 'Back.easeOut' });
    });
  }

  /** The card of an entry: it opens on the half of its entry (the spine stays free), replaces the open one, and a tap on it (or on the paper around) closes it. */
  protected openCard(id: string, spec: EntryCardSpec): void {
    this.closeCard(true);
    getAudio(this.scene).play(SfxKeys.Paper);
    const scrim = this.scene.add.zone(0, 0, PAGE_AREA.width, PAGE_AREA.height).setInteractive({ useHandCursor: true });
    const view = createEntryCard(this.scene, spec);
    view.setX(HALF[this.sides.get(id) ?? 'left'].center);
    scrim.on('pointerup', () => this.closeCard());
    view.on('pointerup', () => this.closeCard());
    this.add([scrim, view]);
    this.card = { id, view, scrim };
  }

  closeCard(instant = false): void {
    const card = this.card;
    if (!card) return;
    this.card = null;
    card.scrim.destroy();
    if (instant) {
      card.view.destroy();
      return;
    }
    card.view.disableInteractive();
    this.closing?.destroy();
    this.closing = card.view;
    this.scene.tweens.add({
      targets: card.view, alpha: 0, scale: profileOf(this.scene).reduced ? 1 : 0.85, duration: CARD_CLOSE_MS, ease: 'Sine.easeIn',
      onComplete: () => {
        card.view.destroy();
        if (this.closing === card.view) this.closing = null;
      },
    });
  }

  destroy(fromScene?: boolean): void {
    const tweens = this.scene?.tweens;
    if (tweens) {
      for (const view of this.placed) tweens.killTweensOf(view);
      if (this.card) tweens.killTweensOf(this.card.view);
      if (this.closing) tweens.killTweensOf(this.closing);
    }
    this.closing?.destroy();
    this.closing = null;
    this.card = null;
    this.marks = [];
    this.cells.clear();
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
