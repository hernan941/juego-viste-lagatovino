// The shop window of the fitting room (F13.4, S3): every garment shows in full color, and the ones the player has not bought
// carry a cardboard price tag, in the grid and on the cat while they are worn. Trying is free: the tag only shows the price
// and, when it is touched, says so (DressUpEvents.PriceTagPressed); buying is another controller's job.
import type Phaser from 'phaser';
import { DressUpEvents, ObjectEvents, RegistryKeys } from '../../constants';
import { unpaidPrice } from '../../domain/economy';
import { anchorForSlot } from '../../domain/slots';
import type { ClothingDef, EconomyRules, Point, Progress } from '../../domain/types';
import { profileOf } from '../../systems/motion';
import type { ClothingItem } from '../ClothingItem';
import { PriceTag } from '../PriceTag';
import type { DressUpContext, DressUpController } from './DressUpController';
import { CELL_TAG, WORN_TAG } from './layout';

/** What the catalog of the registry carries besides the clothes (GameData, ADR 0017). */
interface WithEconomy {
  economy: EconomyRules;
}

export class PriceTagsController implements DressUpController {
  readonly key = 'tags';
  private ctx!: DressUpContext;
  private rules!: EconomyRules;
  private removeDecorator: (() => void) | null = null;
  /** The tag of each cell that has one (the cell owns it: it is destroyed with the cell). */
  private cellTags = new Map<ClothingItem, PriceTag>();
  /** Cells whose hover is already wired (a refresh decorates the same cell again, and its listeners stay). */
  private wired = new WeakSet<ClothingItem>();
  /** The tags hanging on the cat, by item id. */
  private wornTags = new Map<string, PriceTag>();
  /** Worn tags that are fading out. */
  private leaving = new Set<PriceTag>();
  private count = 0;

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    this.rules = (ctx.catalog as unknown as WithEconomy).economy;
    this.removeDecorator = ctx.grid.addCellDecorator((cell) => this.decorate(cell));
    ctx.grid.on(ObjectEvents.ItemClick, this.onCellClick, this);
    ctx.scene.events.on(DressUpEvents.OutfitChanged, this.syncWorn, this);
    ctx.scene.registry.events.on(`changedata-${RegistryKeys.Progress}`, this.onProgress, this);
    this.syncWorn();
  }

  destroy(): void {
    const { scene, grid } = this.ctx;
    scene.events.off(DressUpEvents.OutfitChanged, this.syncWorn, this);
    scene.registry.events.off(`changedata-${RegistryKeys.Progress}`, this.onProgress, this);
    grid.off(ObjectEvents.ItemClick, this.onCellClick, this);
    this.removeDecorator?.();
    this.removeDecorator = null;
    for (const tag of [...this.wornTags.values(), ...this.leaving]) tag.destroy();
    this.wornTags.clear();
    this.leaving.clear();
    // The cell tags are the cells' children (the grid destroys them with the cells): the ones still alive stop swaying now.
    for (const tag of this.cellTags.values()) if (tag.active !== false) tag.destroy();
    this.cellTags.clear();
    this.wired = new WeakSet();
  }

  e2eState(): { tags: { cells: string[]; worn: string[] } } {
    // A cell that the grid destroyed (a tab change) leaves the map when its cell is decorated again, so those are skipped here.
    const cells = [...this.cellTags].filter(([cell, tag]) => cell.active !== false && tag.active !== false).map(([cell]) => cell.item.id);
    return { tags: { cells, worn: [...this.wornTags.keys()] } };
  }

  private owned(): string[] {
    return (this.ctx.scene.registry.get(RegistryKeys.Progress) as Progress | undefined)?.owned ?? [];
  }

  private priceOf(item: ClothingDef): number {
    return unpaidPrice(item, this.owned(), this.rules);
  }

  // ---- The cells -----------------------------------------------------------

  /** Runs on every cell the grid builds: a not bought item hangs a tag from the top right corner. */
  private decorate(cell: ClothingItem): void {
    this.cellTags.delete(cell);
    const price = this.priceOf(cell.item);
    if (price <= 0) return;
    // The cell keeps the touch (it drags), so the tag is only a picture: a tap on the cell is a tap on the tag.
    const tag = cell.addDecoration(new PriceTag(this.ctx.scene, CELL_TAG.x, CELL_TAG.y, price, { scale: CELL_TAG.scale, phase: (this.count++ % 5) * 220 }));
    this.cellTags.set(cell, tag);
    if (this.wired.has(cell)) return;
    this.wired.add(cell);
    cell.on('pointerover', (p?: Phaser.Input.Pointer) => !p?.wasTouch && this.cellTags.get(cell)?.setHover(true));
    cell.on('pointerout', () => this.cellTags.get(cell)?.setHover(false));
  }

  private onCellClick(cell: ClothingItem): void {
    if (this.priceOf(cell.item) <= 0) return;
    this.cellTags.get(cell)?.flick();
    this.ctx.scene.events.emit(DressUpEvents.PriceTagPressed, cell.item);
  }

  // ---- The worn items ------------------------------------------------------

  private hangPoint(item: ClothingDef): Point {
    const anchor = this.ctx.cat.getAnchorWorld(anchorForSlot(item.slot));
    return { x: anchor.x + WORN_TAG.dx, y: anchor.y + WORN_TAG.dy };
  }

  /** One tag for each worn item that is not bought: new ones fade in, the ones of removed or bought items fade out. */
  private syncWorn(): void {
    const unpaid = new Map<string, ClothingDef>();
    for (const id of Object.values(this.ctx.getOutfit())) {
      const item = this.ctx.catalog.clothes.find((c) => c.id === id);
      if (item && this.priceOf(item) > 0) unpaid.set(item.id, item);
    }
    for (const [id, tag] of [...this.wornTags]) {
      if (unpaid.has(id)) continue;
      this.wornTags.delete(id);
      this.fadeOut(tag);
    }
    for (const [id, item] of unpaid) {
      if (this.wornTags.has(id)) continue;
      const at = this.hangPoint(item);
      const tag = new PriceTag(this.ctx.scene, at.x, at.y, this.priceOf(item), { scale: WORN_TAG.scale, interactive: true });
      tag.on(ObjectEvents.PriceTagPress, () => this.ctx.scene.events.emit(DressUpEvents.PriceTagPressed, item));
      this.ctx.hud.add(tag);
      this.wornTags.set(id, tag);
    }
  }

  private fadeOut(tag: PriceTag): void {
    const { scene } = this.ctx;
    this.leaving.add(tag);
    const gone = () => {
      this.leaving.delete(tag);
      tag.destroy();
    };
    if (profileOf(scene).reduced) {
      scene.tweens.add({ targets: tag, alpha: 0, duration: 150, onComplete: gone });
      return;
    }
    scene.tweens.add({ targets: tag, alpha: 0, y: tag.y + 24, duration: 200, ease: 'Sine.easeIn', onComplete: gone });
  }

  // ---- A purchase ----------------------------------------------------------

  /** The bought items change: the cells lose their tags (they are decorated again) and the cat's tags follow. */
  private onProgress(): void {
    this.ctx.grid.refreshDecorations();
    this.syncWorn();
  }
}
