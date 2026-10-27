// Buying by touching the price tag (F13.5, S3). Another controller says "they touched the tag of X" (PriceTagPressed); this one
// asks "¿Te lo llevas?", and when the player says yes it pays at once (the registry write is what saves it), cuts the tag with the
// scissors, flies the buttons from the purse to the garment and celebrates. It only talks to the others through scene events and
// the progress, like the rest of the controllers (ADR 0019).
import type Phaser from 'phaser';
import { DressUpEvents, ObjectEvents, RegistryKeys, SfxKeys } from '../../constants';
import { shopLines } from '../../domain/copy';
import { unpaidPrice } from '../../domain/economy';
import { buyItem } from '../../domain/purchase';
import { anchorForSlot } from '../../domain/slots';
import type { ClothingDef, EconomyRules, Point, Progress } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import { SpeechBubble } from '../kit/SpeechBubble';
import { PurchaseSheet } from '../PurchaseSheet';
import { TagCut } from '../TagCut';
import type { DressUpContext, DressUpController } from './DressUpController';
import { CELL_TAG, WALLET_POSITION, WORN_TAG } from './layout';
import type { WalletFlightRequest } from './WalletController';

/** What the catalog of the registry carries besides the clothes (GameData, ADR 0017). */
interface WithEconomy {
  economy: EconomyRules;
}

/** After the snip the buttons are still on their way: the cash register rings when they arrive. */
const REGISTER_MS = 520;
/** The purchase is over (the next one may start) a bit after the celebration begins. */
const BUSY_MS = 1100;
const BUBBLE_MS = 1500;

export class PurchaseController implements DressUpController {
  readonly key = 'purchase';
  private ctx!: DressUpContext;
  private rules!: EconomyRules;
  private sheet: PurchaseSheet | null = null;
  /** From the [Llevar] until the celebration is done: nothing else opens meanwhile, and a second tap on [Llevar] is ignored. */
  private busy = false;
  private cuts = new Set<TagCut>();
  private bubble: SpeechBubble | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  /** Items bought in this visit, newest last (for the e2e hook). */
  private bought: string[] = [];

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    this.rules = (ctx.catalog as unknown as WithEconomy).economy;
    ctx.scene.events.on(DressUpEvents.PriceTagPressed, this.onTagPressed, this);
  }

  destroy(): void {
    this.ctx.scene.events.off(DressUpEvents.PriceTagPressed, this.onTagPressed, this);
    for (const t of this.timers) t.remove();
    this.timers = [];
    for (const cut of [...this.cuts]) cut.cancel();
    this.cuts.clear();
    this.sheet?.destroy();
    this.sheet = null;
    this.bubble?.destroy();
    this.bubble = null;
  }

  e2eState(): { open: boolean; busy: boolean; price: number | null; buttons: { take: Point; notYet: Point } | null; bought: string[] } {
    return {
      open: this.sheet !== null,
      busy: this.busy,
      price: this.sheet?.price ?? null,
      buttons: this.sheet && !this.sheet.isClosing ? this.sheet.getButtonPoints() : null,
      bought: [...this.bought],
    };
  }

  isSettled(): boolean {
    return !this.busy && this.cuts.size === 0 && this.sheet === null;
  }

  private progress(): Progress {
    return this.ctx.scene.registry.get(RegistryKeys.Progress) as Progress;
  }

  // ---- The sheet -----------------------------------------------------------

  private onTagPressed(item: ClothingDef): void {
    if (this.busy || this.sheet || this.ctx.isLeaving() || this.ctx.isDragging()) return;
    const price = unpaidPrice(item, this.progress().owned, this.rules);
    if (price <= 0) return;
    const sheet = new PurchaseSheet(this.ctx.scene, item, price);
    this.sheet = sheet;
    sheet.on(ObjectEvents.SheetCancel, () => this.dismiss(sheet));
    sheet.on(ObjectEvents.SheetConfirm, () => this.confirm(sheet, item));
  }

  private dismiss(sheet: PurchaseSheet): void {
    if (this.sheet !== sheet) return;
    this.sheet = null;
    sheet.close();
  }

  // ---- Paying --------------------------------------------------------------

  private confirm(sheet: PurchaseSheet, item: ClothingDef): void {
    // The sheet that was dismissed (or already confirmed) does nothing: a double tap pays once.
    if (this.sheet !== sheet || this.busy) return;
    this.dismiss(sheet);
    const { scene } = this.ctx;
    const result = buyItem(this.progress(), item, this.rules);
    if (!result.ok) {
      if (result.reason === 'short') {
        scene.events.emit(DressUpEvents.WalletShake);
        this.say(shopLines.notEnough(result.missing), WALLET_POSITION.x - 30, WALLET_POSITION.y + 150);
      }
      return;
    }
    this.busy = true;
    this.bought.push(item.id);
    const tag = this.tagSpot(item);
    const garment = this.garmentPoint(item);
    // The buttons are asked first so the purse holds its number while they leave; then the progress changes (and saves).
    const flight: WalletFlightRequest = { direction: 'out', at: garment, coins: result.price };
    scene.events.emit(DressUpEvents.WalletFlight, flight);
    scene.registry.set(RegistryKeys.Progress, result.progress);
    scene.events.emit(DressUpEvents.ItemsBought, [item.id]);
    const cut: TagCut = new TagCut(scene, { ...tag, price: result.price, onDone: () => this.cuts.delete(cut) });
    this.cuts.add(cut);
    this.later(REGISTER_MS, () => this.celebrate(item, garment));
    this.later(BUSY_MS, () => { this.busy = false; });
  }

  /** The register rings, the cat is happy and says it is its own, and the cell of the grid sparkles. */
  private celebrate(item: ClothingDef, at: Point): void {
    const { scene, cat, hearts, grid } = this.ctx;
    const p = profileOf(scene);
    const head = cat.getAnchorWorld('head');
    getAudio(scene).play(SfxKeys.Register, { volume: 0.8 });
    cat.playFaces({ expression: 'amor', ms: 1200 });
    hearts.explode(p.count(3), head.x, head.y - 40);
    this.ctx.sparkles.explode(p.count(8), at.x, at.y);
    grid.getCell(item.id)?.celebrate();
    // To the side of the face: straight up the bubble would cover the name sign.
    this.say(shopLines.mine, head.x + 195, head.y + 10);
  }

  // ---- Where things are ----------------------------------------------------

  private isWorn(item: ClothingDef): boolean {
    return Object.values(this.ctx.getOutfit()).includes(item.id);
  }

  /** Where the tag hangs now, and how big: on the cat when the garment is worn, in its cell otherwise. */
  private tagSpot(item: ClothingDef): { x: number; y: number; scale: number } {
    if (this.isWorn(item)) {
      const a = this.ctx.cat.getAnchorWorld(anchorForSlot(item.slot));
      return { x: a.x + WORN_TAG.dx, y: a.y + WORN_TAG.dy, scale: WORN_TAG.scale };
    }
    const cell = this.ctx.grid.getCellPositions()[item.id];
    if (cell) return { x: cell.x + CELL_TAG.x, y: cell.y + CELL_TAG.y, scale: CELL_TAG.scale };
    const head = this.ctx.cat.getAnchorWorld('head');
    return { x: head.x, y: head.y, scale: WORN_TAG.scale };
  }

  /** What the buttons fly to: the worn garment, or its cell, or the cat's head. */
  private garmentPoint(item: ClothingDef): Point {
    if (this.isWorn(item)) return this.ctx.cat.getAnchorWorld(anchorForSlot(item.slot));
    return this.ctx.grid.getCellPositions()[item.id] ?? this.ctx.cat.getAnchorWorld('head');
  }

  // ---- The seller and the cat talk -----------------------------------------

  /** One bubble at a time: it pops in by itself, stays a moment and fades. */
  private say(text: string, x: number, y: number): void {
    const { scene } = this.ctx;
    this.bubble?.destroy();
    const bubble = new SpeechBubble(scene, x, y, text, { maxWidth: 340 }).setDepth(4100);
    this.bubble = bubble;
    this.later(BUBBLE_MS, () => {
      scene.tweens.add({
        targets: bubble, alpha: 0, y: y - 12, duration: 250,
        onComplete: () => {
          bubble.destroy();
          if (this.bubble === bubble) this.bubble = null;
        },
      });
    });
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(this.ctx.scene.time.delayedCall(ms, fn));
  }
}
