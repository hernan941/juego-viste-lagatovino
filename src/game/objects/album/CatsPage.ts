import Phaser from 'phaser';
import { Fonts, Ink, RegistryKeys } from '../../constants';
import { catEntries, gridPositions, type CatEntry } from '../../domain/albumEntries';
import { pageTally } from '../../domain/albumPages';
import { catTally } from '../../domain/catProgress';
import { albumLines } from '../../domain/copy/album';
import type { AnchorsDef } from '../../domain/types';
import { Cat } from '../Cat';
import { Polaroid } from '../kit/Polaroid';
import { createTallyLabel } from '../tallyLabel';
import type { AlbumPageContext } from './AlbumPage';
import { BookPage, GRID_TOP, entryContext } from './BookPage';
import type { EntryCardSpec } from './EntryCard';
import { makeTappable } from './makeTappable';

const COLUMNS = 3;
const CELL = { w: 130, h: 200 };
const PHOTO = { w: 122, h: 188, caption: 64 };
const CAT_SIZE = 104;
const PER_HALF = 6;
/** The glyphs of the tastes: ink colors once found, pencil while hidden. */
const GLYPH_COLOR = { '♥': Ink.frambuesa, '✕': Ink.tomate, '★': Ink.naranjo, '●': Ink.lapiz } as const;
const GLYPH_STEP = 19;

/**
 * Gatos (F17.4): the 12 cats as polaroids, six on each half, with their best star and a row of the five tastes (♥ ♥ ✕ ★ ●): in ink
 * the ones already found, in pencil the ones still to find. Tapping a cat opens its card with the taste names and its hint.
 */
export class CatsPage extends BookPage {
  private readonly entries: CatEntry[];
  private readonly anchors: AnchorsDef;

  constructor(scene: Phaser.Scene, tab: string, private readonly ctx: AlbumPageContext) {
    super(scene, tab);
    this.anchors = scene.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    this.entries = catEntries(entryContext(ctx));
    this.heading(albumLines.tally(pageTally('gatos', ctx.completion.sections)));
    (['left', 'right'] as const).forEach((side, s) => {
      const part = this.entries.slice(s * PER_HALF, (s + 1) * PER_HALF);
      gridPositions(part.length, COLUMNS, CELL.w, CELL.h).forEach((at, i) => {
        const cell = this.buildCell(part[i]!);
        cell.setPosition(at.x, GRID_TOP + at.y);
        this.place(side, part[i]!.id, cell, part[i]!.isNew, { x: PHOTO.w / 2 - 6, y: -PHOTO.h / 2 + 6 });
      });
    });
    this.popIn(this.cellList());
  }

  protected shown(): { id: string; state: string }[] {
    return this.entries.map((e) => ({ id: e.id, state: e.found === e.tastes.length ? 'complete' : e.found > 0 ? 'partial' : 'unknown' }));
  }

  private buildCell(entry: CatEntry): Phaser.GameObjects.Container {
    const scene = this.scene;
    // The photo leans (seeded by the cat) with the cat inside it; the texts stay level on top of it.
    const photo = new Polaroid(scene, 0, 0, { id: entry.id, width: PHOTO.w, height: PHOTO.h, captionHeight: PHOTO.caption, animate: false });
    const windowBottom = PHOTO.h / 2 - PHOTO.caption - 14;
    photo.add(new Cat(scene, 0, windowBottom - 4, entry.def, this.anchors, CAT_SIZE));
    const parts: Phaser.GameObjects.GameObject[] = [photo];
    parts.push(
      scene.add.text(0, PHOTO.h / 2 - PHOTO.caption + 16, entry.name, { fontFamily: Fonts.Voice, fontSize: '28px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5),
    );
    entry.tastes.forEach((t, i) => {
      const x = (i - (entry.tastes.length - 1) / 2) * GLYPH_STEP;
      const glyph = scene.add
        .text(x, PHOTO.h / 2 - 18, t.glyph, { fontFamily: Fonts.Voice, fontSize: '24px', color: t.found ? GLYPH_COLOR[t.glyph] : Ink.lineaLapiz, padding: { x: 1, y: 4 } })
        .setOrigin(0.5);
      if (!t.found) glyph.setAlpha(0.55);
      parts.push(glyph);
    });
    const tally = catTally(entry.def, this.ctx.progress);
    if (tally.stars) parts.push(createTallyLabel(scene, -PHOTO.w / 2 + 26, -PHOTO.h / 2 + 22, { stars: tally.stars, tastes: null }));
    const face = scene.add.container(0, 0, parts);
    const cell = scene.add.container(0, 0, [face]);
    makeTappable(cell, face, PHOTO.w, PHOTO.h, () => this.openCard(entry.id, this.cardOf(entry)));
    return cell;
  }

  private cardOf(entry: CatEntry): EntryCardSpec {
    const lines: EntryCardSpec['lines'] = [
      { text: entry.stars ? albumLines.best(entry.stars) : albumLines.noStars, pencil: !entry.stars },
      { text: `${albumLines.tastesTitle} ${entry.found} de ${entry.tastes.length}` },
      ...entry.tastes.map((t) => (t.found ? { text: albumLines.tasteLine(t.glyph, t.label) } : { text: albumLines.tasteLine(t.glyph, albumLines.hidden), pencil: true })),
    ];
    if (entry.hint) lines.push({ text: entry.hint, pencil: true });
    return { title: entry.name, lines };
  }
}
