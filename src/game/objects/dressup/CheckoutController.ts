// The seller's till at Ready (F13.6, S3): "only what is yours gets rated", with no punishment. When the player presses Ready with
// things on the cat that they have not paid, the seller's till opens with the list and the total: [Llevar todo] pays it all (or
// nothing), [Sacarme lo que no tengo] takes off what is not theirs (with a puf, back to the grid) and [Seguir probando] stays.
// It holds the way out with `beforeLeave` (ADR 0019 amendment: a promise that resolves false keeps the player in the room).
// It talks to the others through scene events (WalletFlight, WalletShake, ItemsBought) and the progress in the registry.
import type Phaser from 'phaser';
import { DressUpEvents, ObjectEvents, RegistryKeys, SfxKeys } from '../../constants';
import { checkoutPlan, keepOnlyOwned, payPlan, withoutLine, type CartLineRef, type CheckoutPlan } from '../../domain/checkout';
import { sellerLines, shopLines } from '../../domain/copy';
import { anchorForSlot } from '../../domain/slots';
import { staggerDelays } from '../../domain/stagger';
import type { BrandDef, ClothingDef, DyeDef, EconomyRules, ItemDye, Point, Progress } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import { CheckoutSheet, type CheckoutLine } from '../CheckoutSheet';
import { SpeechBubble } from '../kit/SpeechBubble';
import type { DressUpContext, DressUpController, LeaveAction } from './DressUpController';
import type { WalletFlightRequest } from './WalletController';

/** What the catalog of the registry carries besides the clothes (GameData, ADR 0017). */
interface WithShop {
  economy: EconomyRules;
  dyes?: DyeDef[];
  brand?: Pick<BrandDef, 'seller'>;
}

type Outcome = 'paid' | 'left-out' | 'kept';

/** The buttons are still on their way when the register rings. */
const REGISTER_MS = 520;
/** After the register the player may go (the celebration was seen). */
const PAID_GO_MS = 1050;
/** Between one garment coming off and the next. */
const OFF_STEP_MS = 80;
/** After the last garment came off. */
const OFF_GO_MS = 450;

export class CheckoutController implements DressUpController {
  readonly key = 'checkout';
  private ctx!: DressUpContext;
  private rules!: EconomyRules;
  private dyes: DyeDef[] = [];
  private sheet: CheckoutSheet | null = null;
  private plan: CheckoutPlan | null = null;
  private lines: string[] = [];
  /** The answer to `beforeLeave` while the till is open. */
  private verdict: ((ok: boolean) => void) | null = null;
  /** From [Llevar todo] or [Sacarme...] until the player goes: a second tap does nothing. */
  private busy = false;
  private bubble: SpeechBubble | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  /** How each till of this visit ended, newest last (for the e2e hook). */
  private outcomes: Outcome[] = [];

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    const shop = ctx.catalog as unknown as WithShop;
    this.rules = shop.economy;
    this.dyes = shop.dyes ?? [];
  }

  destroy(): void {
    for (const t of this.timers) t.remove();
    this.timers = [];
    this.sheet?.destroy();
    this.sheet = null;
    this.bubble?.destroy();
    this.bubble = null;
    // The scene is closing: nobody leaves through a till that is gone.
    this.settle(false);
  }

  e2eState(): {
    open: boolean; busy: boolean; total: number | null; lines: string[]; buttons: ReturnType<CheckoutSheet['getButtonPoints']> | null; removes: Point[]; outcomes: Outcome[];
  } {
    return {
      open: this.sheet !== null,
      busy: this.busy,
      total: this.plan && this.sheet ? this.plan.cart.total : null,
      lines: this.sheet ? [...this.lines] : [],
      buttons: this.sheet && !this.sheet.isClosing ? this.sheet.getButtonPoints() : null,
      removes: this.sheet && !this.sheet.isClosing ? this.sheet.getRemovePoints() : [],
      outcomes: [...this.outcomes],
    };
  }

  isSettled(): boolean {
    return this.sheet === null && !this.busy;
  }

  // ---- The way out ---------------------------------------------------------

  /** Trying is free, so only Ready is charged ("Otro gato" takes the look along as it is). */
  beforeLeave(action: LeaveAction): boolean | Promise<boolean> {
    if (action !== 'finish' || this.sheet) return action !== 'finish';
    const plan = this.makePlan();
    if (plan.cart.items.length + plan.cart.dyes.length === 0) return true;
    return new Promise<boolean>((resolve) => {
      this.verdict = resolve;
      this.open(plan);
    });
  }

  private progress(): Progress {
    return this.ctx.scene.registry.get(RegistryKeys.Progress) as Progress;
  }

  private itemDye(): ItemDye {
    return (this.ctx.scene.registry.get(RegistryKeys.ItemDye) as ItemDye | undefined) ?? {};
  }

  private makePlan(): CheckoutPlan {
    return checkoutPlan(this.ctx.getOutfit(), this.itemDye(), this.progress(), { catalog: this.ctx.catalog.clothes, dyes: this.dyes, rules: this.rules });
  }

  /** The player decides (or the scene closes): the pending `beforeLeave` is answered once. */
  private settle(ok: boolean): void {
    const resolve = this.verdict;
    this.verdict = null;
    resolve?.(ok);
  }

  // ---- The till ------------------------------------------------------------

  private open(plan: CheckoutPlan): void {
    const { scene, catalog } = this.ctx;
    const seller = (catalog as unknown as WithShop).brand?.seller;
    const sheet = new CheckoutSheet(scene, { ...this.contentOf(plan), sellerTexture: seller?.texture });
    this.sheet = sheet;
    sheet.on(ObjectEvents.SheetConfirm, () => this.pay(sheet));
    sheet.on(ObjectEvents.SheetShort, () => this.short(sheet));
    sheet.on(ObjectEvents.SheetLeaveOut, () => this.leaveOut(sheet));
    sheet.on(ObjectEvents.SheetRemoveLine, (ref: CartLineRef) => this.removeLine(sheet, ref));
    sheet.on(ObjectEvents.SheetCancel, () => this.keepTrying(sheet));
  }

  /** What the till shows for a plan: the lines (each with the cross that takes it off), the total and what the seller says. */
  private contentOf(plan: CheckoutPlan): { lines: CheckoutLine[]; total: number; missing: number; sellerLine: string } {
    const { clothes } = this.ctx.catalog;
    const lines: CheckoutLine[] = [
      ...plan.cart.items.map((l): CheckoutLine => {
        const item = clothes.find((c) => c.id === l.id)!;
        return { label: item.name, price: l.price, icon: item.icon, ref: { kind: 'item', id: l.id } };
      }),
      ...plan.cart.dyes.map((l): CheckoutLine => {
        const dye = this.dyes.find((d) => d.id === l.id);
        return { label: shopLines.dyeRow(dye?.name ?? l.id), price: l.price, swatch: dye?.hex, ref: { kind: 'dye', id: l.id } };
      }),
    ];
    this.plan = plan;
    this.lines = lines.map((l) => l.label);
    const seller = (this.ctx.catalog as unknown as WithShop).brand?.seller;
    return {
      lines, total: plan.cart.total, missing: plan.missing,
      sellerLine: seller ? sellerLines(seller).checkout(plan.cart.total) : shopLines.total(plan.cart.total),
    };
  }

  private close(sheet: CheckoutSheet): void {
    if (this.sheet !== sheet) return;
    this.sheet = null;
    sheet.close();
  }

  private keepTrying(sheet: CheckoutSheet): void {
    if (this.sheet !== sheet || this.busy) return;
    this.outcomes.push('kept');
    this.close(sheet);
    this.settle(false);
  }

  /** Not enough buttons: the purse and the button shake, and the till stays (the sheet already says how many are lacking). */
  private short(sheet: CheckoutSheet): void {
    if (this.sheet !== sheet || this.busy) return;
    this.ctx.scene.events.emit(DressUpEvents.WalletShake);
    sheet.nudge();
  }

  // ---- [Llevar todo] -------------------------------------------------------

  private pay(sheet: CheckoutSheet): void {
    // The sheet that was closed (or already paid) does nothing: a double tap pays once.
    if (this.sheet !== sheet || this.busy) return;
    const { scene } = this.ctx;
    const plan = this.makePlan();
    const paid = payPlan(this.progress(), plan);
    if (!paid) {
      this.short(sheet);
      return;
    }
    this.busy = true;
    this.outcomes.push('paid');
    const garment = this.ctx.cat.getAnchorWorld(anchorForSlot('sweater'));
    // The buttons are asked first so the purse holds its number while they leave; then the progress changes (and saves).
    const flight: WalletFlightRequest = { direction: 'out', at: garment, coins: plan.cart.total };
    scene.events.emit(DressUpEvents.WalletFlight, flight);
    scene.registry.set(RegistryKeys.Progress, paid);
    scene.events.emit(DressUpEvents.ItemsBought, plan.cart.items.map((l) => l.id));
    this.close(sheet);
    this.later(REGISTER_MS, () => this.celebrate(garment));
    this.later(PAID_GO_MS, () => this.go());
  }

  /** The register rings, the cat is happy and the seller thanks. */
  private celebrate(at: Point): void {
    const { scene, cat, hearts, sparkles } = this.ctx;
    const p = profileOf(scene);
    const head = cat.getAnchorWorld('head');
    getAudio(scene).play(SfxKeys.Register, { volume: 0.8 });
    cat.playFaces({ expression: 'amor', ms: 1200 });
    hearts.explode(p.count(4), head.x, head.y - 40);
    sparkles.explode(p.count(8), at.x, at.y);
    this.say(shopLines.bought, head.x + 195, head.y + 10);
  }

  // ---- The cross of a line -------------------------------------------------

  /**
   * One garment (or one bottle) goes, with a puf, and the till is written again with the new total: "no alcanza" is not a dead
   * end, choosing what to take home is part of the wanting. When nothing unpaid is left the till closes and the player goes.
   */
  private removeLine(sheet: CheckoutSheet, ref: CartLineRef): void {
    if (this.sheet !== sheet || this.busy) return;
    const before = this.makePlan();
    const there = ref.kind === 'item' ? before.unpaidItems.includes(ref.id) : before.cart.dyes.some((d) => d.id === ref.id);
    if (!there) return;
    const { scene, cat, sparkles } = this.ctx;
    const puf = (slotItemId: string) => {
      const item = this.ctx.catalog.clothes.find((c) => c.id === slotItemId);
      if (!item) return;
      const at = cat.getAnchorWorld(anchorForSlot(item.slot));
      sparkles.explode(profileOf(scene).count(6), at.x, at.y);
    };
    const dye = this.itemDye();
    const next = withoutLine(this.ctx.getOutfit(), dye, ref);
    // The bottle goes first (the garment shows its own color), then the garment comes off.
    if (Object.keys(next.itemDye).length !== Object.keys(dye).length) scene.registry.set(RegistryKeys.ItemDye, next.itemDye);
    if (ref.kind === 'item') {
      const item = this.ctx.catalog.clothes.find((c) => c.id === ref.id);
      if (item) {
        puf(item.id);
        this.ctx.removeItem(item);
        this.ctx.grid.getCell(item.id)?.receivePop();
      }
    } else {
      before.unpaidDyed.forEach(puf);
    }
    const after = this.makePlan();
    if (after.cart.items.length + after.cart.dyes.length === 0) {
      this.busy = true;
      this.outcomes.push('left-out');
      this.close(sheet);
      this.later(OFF_GO_MS, () => this.go());
      return;
    }
    sheet.update(this.contentOf(after));
  }

  // ---- [Sacarme lo que no tengo] -------------------------------------------

  private leaveOut(sheet: CheckoutSheet): void {
    if (this.sheet !== sheet || this.busy) return;
    const { scene, cat, grid, sparkles } = this.ctx;
    this.busy = true;
    this.outcomes.push('left-out');
    const plan = this.makePlan();
    this.close(sheet);
    // The unpaid bottles go first (the garments that stay show their own color), then the garments come off one after another.
    const kept = keepOnlyOwned(this.ctx.getOutfit(), this.itemDye(), plan);
    const dye = this.itemDye();
    if (Object.keys(kept.itemDye).length !== Object.keys(dye).length) scene.registry.set(RegistryKeys.ItemDye, kept.itemDye);
    const off = plan.unpaidItems.map((id) => this.ctx.catalog.clothes.find((c) => c.id === id)).filter((c): c is ClothingDef => c !== undefined);
    const delays = staggerDelays(off.length, OFF_STEP_MS);
    off.forEach((item, i) => {
      this.later(delays[i], () => {
        const at = cat.getAnchorWorld(anchorForSlot(item.slot));
        sparkles.explode(profileOf(scene).count(6), at.x, at.y);
        this.ctx.removeItem(item);
        grid.getCell(item.id)?.receivePop();
      });
    });
    this.later((delays[delays.length - 1] ?? 0) + OFF_GO_MS, () => this.go());
  }

  /** The player goes: the scene departs with whatever the outfit is now. */
  private go(): void {
    this.busy = false;
    this.settle(true);
  }

  // ---- The seller talks ----------------------------------------------------

  /** One bubble at a time: it pops in by itself, stays a moment and fades. */
  private say(text: string, x: number, y: number): void {
    const { scene } = this.ctx;
    this.bubble?.destroy();
    const bubble = new SpeechBubble(scene, x, y, text, { maxWidth: 340 }).setDepth(4100);
    this.bubble = bubble;
    this.later(1400, () => {
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
