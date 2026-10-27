// The sheet of the cat (F14.4, S2): the name sign becomes a button; touching it opens the sheet with the five tastes (the found ones
// as chips, the hidden ones as "?") and the clue. A tap outside closes it. It does not open in the middle of a drag or while the
// player is leaving. It reads the progress as it is when it opens, so a discovery that just landed is already in it.
import { ObjectEvents, RegistryKeys, SfxKeys } from '../../constants';
import { catSheetEntries, catSheetHint, type NameLookup, type SheetEntry } from '../../domain/catSheet';
import type { Point, Progress } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { CatSheet } from '../CatSheet';
import type { DressUpContext, DressUpController } from './DressUpController';
import { nameLookup } from './nameLookup';

export class CatSheetController implements DressUpController {
  readonly key = 'catsheet';
  private ctx!: DressUpContext;
  private sheet: CatSheet | null = null;
  private entries: SheetEntry[] = [];
  private hint = '';

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    ctx.sign.makeInteractive();
    ctx.sign.on(ObjectEvents.SignPress, this.open, this);
  }

  destroy(): void {
    this.ctx.sign.off(ObjectEvents.SignPress, this.open, this);
    this.sheet?.destroy();
    this.sheet = null;
  }

  e2eState(): { open: boolean; entries: { key: string; found: boolean }[]; found: number; hint: string; sign: Point } {
    const { sign } = this.ctx;
    return {
      open: this.sheet !== null,
      entries: this.sheet ? this.entries.map(({ key, found }) => ({ key, found })) : [],
      found: this.entries.filter((e) => e.found).length,
      hint: this.sheet ? this.hint : '',
      // The art of the sign is centered 11 px under its origin.
      sign: { x: sign.x, y: sign.y + 11 },
    };
  }

  /** False while the sheet is closing. */
  isSettled(): boolean {
    return this.sheet === null;
  }

  private names(): NameLookup {
    return nameLookup(this.ctx);
  }

  private open(): void {
    const { scene, catalog, catId, catName } = this.ctx;
    if (this.sheet || this.ctx.isDragging() || this.ctx.isLeaving()) return;
    const cat = catalog.cats.find((c) => c.id === catId);
    if (!cat) return;
    const found = (scene.registry.get(RegistryKeys.Progress) as Progress | undefined)?.tastesFound[catId] ?? [];
    this.entries = catSheetEntries(cat, found, this.names());
    this.hint = catSheetHint(cat, found);
    const sheet = new CatSheet(scene, { catName, entries: this.entries, hint: this.hint });
    this.sheet = sheet;
    getAudio(scene).play(SfxKeys.Paper, { volume: 0.7 });
    sheet.on(ObjectEvents.SheetCancel, () => this.close(sheet));
  }

  private close(sheet: CatSheet): void {
    if (this.sheet !== sheet) return;
    this.sheet = null;
    getAudio(this.ctx.scene).play(SfxKeys.Paper, { volume: 0.5, rate: 0.85 });
    sheet.close();
  }
}
