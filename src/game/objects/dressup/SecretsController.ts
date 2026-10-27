// The secrets of the fitting room (F8, moved from DressUp in F11.14): combo reactions, the gift box with its bow, the prize
// that flies to its cell, the "¡Casi...!" hint, the counter and the golden twinkle on the secret garments that are worn.
import Phaser from 'phaser';
import { DressUpEvents, ObjectEvents, RegistryKeys, SfxKeys } from '../../constants';
import { comboFate, combosDue } from '../../domain/checkout';
import { almostCombos, almostHint, newlyCompleted } from '../../domain/combos';
import { sellerLines } from '../../domain/copy';
import { GiftReveal } from '../../domain/giftReveal';
import { getLayers } from '../../domain/outfit';
import type { BrandDef, ClothingDef, ComboDef, EconomyRules, Outfit, Point, Progress } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { getSave } from '../../plugins/SavePlugin';
import { profileOf } from '../../systems/motion';
import { opaqueBounds } from '../alphaMap';
import { SpeechBubble } from '../kit/SpeechBubble';
import { playComboReaction, playShortReaction, showBubble, type ComboFxContext } from '../comboFx';
import { GiftBox } from '../GiftBox';
import { SecretCounter } from '../SecretCounter';
import { payDiscovery } from './awards';
import type { DressUpContext, DressUpController, OutfitCause } from './DressUpController';
import { GHOST_HOME_SIZE } from './layout';

/** The seller's line about a gift that waits for payment stays long enough to read. */
const HOOK_MS = 2400;

export class SecretsController implements DressUpController {
  readonly key = 'secrets';
  private ctx!: DressUpContext;
  /** Combo ids whose prize is already won (kept in step with the save, the counter and the grid follow `reveal`). */
  private unlocked: string[] = [];
  private gifts: ComboDef[] = [];
  private gift: GiftBox | null = null;
  /** Gift boxes whose arrival is already scheduled (after the reaction). */
  private giftsComing = 0;
  private counter!: SecretCounter;
  private almost = new Set<string>();
  private reveal = new GiftReveal();
  /** The outfit before and after the last change, to know what a drop completed. */
  private before: Outfit = {};
  private current: Outfit = {};
  private lookTimer?: Phaser.Time.TimerEvent;
  private twinkle?: Phaser.Time.TimerEvent;
  private hook: SpeechBubble | null = null;
  private hookTimer?: Phaser.Time.TimerEvent;
  private removeDecorator: (() => void) | null = null;
  /** Reactions played in this visit, newest last (for the e2e hook). */
  private reactionLog: string[] = [];
  /** Test hook: the prize and counter state at each step of the gift sequence. */
  private trace: { revealing: string[]; count: number; text: string }[] = [];

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    const { scene, grid, catalog } = ctx;
    this.unlocked = getSave(scene).secrets;
    this.current = this.before = ctx.getOutfit();
    this.counter = new SecretCounter(scene, 1093, 34).setDepth(31);
    this.counter.setCount(this.unlocked.length, catalog.combos.length);
    // A prize still on its way is not in its cell yet: the cell appears (with a pop) when the prize lands.
    this.removeDecorator = grid.addCellDecorator((cell) => {
      if (this.reveal.hiddenItems().includes(cell.item.id)) cell.setVisible(false);
    });
    // The prizes shine: every 2.5 s, a golden twinkle on each secret garment that is worn.
    this.twinkle = scene.time.addEvent({ delay: 2500, loop: true, callback: () => this.twinkleSecrets() });
    scene.events.on(DressUpEvents.OutfitChanged, this.onOutfit, this);
    scene.events.on(DressUpEvents.ItemDropped, this.onDropped, this);
    scene.events.on(DressUpEvents.ItemRemoved, this.updateAlmost, this);
    scene.events.on(DressUpEvents.ItemsBought, this.onBought, this);
  }

  destroy(): void {
    const { scene } = this.ctx;
    scene.events.off(DressUpEvents.OutfitChanged, this.onOutfit, this);
    scene.events.off(DressUpEvents.ItemDropped, this.onDropped, this);
    scene.events.off(DressUpEvents.ItemRemoved, this.updateAlmost, this);
    scene.events.off(DressUpEvents.ItemsBought, this.onBought, this);
    this.hookTimer?.remove();
    this.hook?.destroy();
    this.hook = null;
    this.removeDecorator?.();
    this.twinkle?.remove();
    this.lookTimer?.remove();
    this.gift?.destroy();
    this.gift = null;
    this.counter?.destroy();
  }

  /** A gift that was never opened is not lost: the player earned it, so it goes to the wardrobe quietly (the Showcase tells them). */
  beforeLeave(): void {
    const gifted = [...(this.gift ? [this.gift.comboId] : []), ...this.gifts.map((c) => c.id)];
    // The bonus of the first time is earned with the combo, opened or not (no flight: the scene is closing).
    for (const combo of gifted) this.unlockCombo(combo, null);
    this.ctx.leaveData.gifted = gifted;
  }

  isSettled(): boolean {
    return this.giftsComing === 0 && this.reveal.active === 0 && (this.gift === null || this.gift.ready);
  }

  e2eState() {
    return {
      unlocked: this.reveal.shownUnlocked(this.unlocked),
      count: this.reveal.shownCount(this.unlocked),
      revealing: this.reveal.hiddenItems(),
      sign: this.ctx.sign.text,
      signLog: [...this.ctx.sign.announced],
      trace: this.trace.map((t) => ({ ...t, revealing: [...t.revealing] })),
      total: this.ctx.catalog.combos.length,
      text: this.counter.text,
    };
  }

  e2eRoot(): Record<string, unknown> {
    const g = this.gift;
    return {
      gift: g ? { comboId: g.comboId, itemId: g.item.id, ready: g.ready, opened: g.opened, bow: g.getBowPoint(), box: g.getCenter(), pill: g.getHintPoint() } : null,
      pendingGifts: this.gifts.length,
      almost: [...this.almost],
      reactions: [...this.reactionLog],
    };
  }

  private onOutfit(next: Outfit, cause?: OutfitCause): void {
    this.before = this.current;
    this.current = next;
    // The test hook dresses the cat without a drop: what is "almost" now is the starting point, with no bubble.
    if (cause === 'test') this.almost = new Set(this.almostIds(next));
  }

  private almostIds(outfit: Outfit): string[] {
    const { catalog } = this.ctx;
    return almostCombos(outfit, catalog.combos, catalog.clothes, this.unlocked).map((c) => c.id);
  }

  private onDropped(): void {
    const { catalog } = this.ctx;
    for (const combo of newlyCompleted(this.before, this.current, catalog.combos, catalog.clothes)) this.onCombo(combo);
    this.updateAlmost();
  }

  private fx(): ComboFxContext {
    const { scene, cat, rainbow, hearts, sign } = this.ctx;
    return { scene, cat, rainbow, hearts, sign };
  }

  private traceSecrets(): void {
    this.trace.push({ revealing: this.reveal.hiddenItems(), count: this.reveal.shownCount(this.unlocked), text: this.counter.text });
  }

  /** A `mantequilla` sparkle at a random point of every worn secret item (the six prizes should feel special). */
  private twinkleSecrets(): void {
    const { scene, catalog, anchors, cat, sparkles } = this.ctx;
    if (this.ctx.isLeaving()) return;
    for (const layer of getLayers(this.ctx.getOutfit(), catalog.clothes)) {
      if (!layer.secret) continue;
      const b = opaqueBounds(scene, layer.texture);
      if (!b) continue;
      const { width, height } = anchors.canvas;
      const at = cat.canvasToWorld({ x: (b.x + Math.random() * b.width) * width, y: (b.y + Math.random() * b.height) * height });
      sparkles.explode(profileOf(scene).count(1), at.x, at.y);
    }
  }

  /** A combo was completed: its own reaction, and a gift if the prize is still locked and every piece is the player's. */
  private onCombo(combo: ComboDef): void {
    const { scene } = this.ctx;
    this.reactionLog.push(combo.reaction);
    const fate = comboFate(combo, { won: this.isDone(combo.id), outfit: this.ctx.getOutfit(), owned: this.owned(), ctx: this.pieces() });
    if (fate === 'repeat') {
      playShortReaction(this.fx(), combo);
      return;
    }
    // A piece is for sale: the combo sounds, the seller sells the gift, and the box waits until every piece is the player's.
    if (fate === 'hook') {
      playShortReaction(this.fx(), combo);
      this.sellerHook();
      return;
    }
    playComboReaction(this.fx(), combo);
    this.gifts.push(combo);
    this.giftsComing++;
    scene.time.delayedCall(1300, () => {
      this.giftsComing--;
      this.nextGift();
    });
  }

  private isDone(comboId: string): boolean {
    return this.unlocked.includes(comboId) || this.gifts.some((g) => g.id === comboId) || this.gift?.comboId === comboId;
  }

  private owned(): string[] {
    return (this.ctx.scene.registry.get(RegistryKeys.Progress) as Progress | undefined)?.owned ?? [];
  }

  private pieces(): { catalog: ClothingDef[]; rules: EconomyRules } {
    const { catalog } = this.ctx;
    return { catalog: catalog.clothes, rules: (catalog as unknown as { economy: EconomyRules }).economy };
  }

  /** "Uy, eso parece un look especial...": the seller says it from the side of the cat, and the line fades by itself. */
  private sellerHook(): void {
    const { scene, cat, catalog } = this.ctx;
    const seller = (catalog as unknown as { brand?: Pick<BrandDef, 'seller'> }).brand?.seller;
    if (!seller) return;
    const head = cat.getAnchorWorld('head');
    this.hookTimer?.remove();
    this.hook?.destroy();
    const bubble = new SpeechBubble(scene, head.x + 200, head.y + 120, sellerLines(seller).comboHook(), { maxWidth: 360 }).setDepth(4100);
    this.hook = bubble;
    this.hookTimer = scene.time.delayedCall(HOOK_MS, () => {
      scene.tweens.add({
        targets: bubble, alpha: 0, duration: 250,
        onComplete: () => {
          bubble.destroy();
          if (this.hook === bubble) this.hook = null;
        },
      });
    });
  }

  /**
   * Something was just paid (a purchase, or the till at Ready): a combo that waited for its piece can give its box now. At the
   * till the player is already leaving, so the prize goes to the wardrobe quietly with the other gifts (the Showcase tells them).
   */
  private onBought(): void {
    const { catalog } = this.ctx;
    const doneIds = [...this.unlocked, ...this.gifts.map((g) => g.id), ...(this.gift ? [this.gift.comboId] : [])];
    const due = combosDue(this.ctx.getOutfit(), catalog.combos, doneIds, this.owned(), this.pieces());
    if (this.ctx.isLeaving()) {
      if (due.length === 0) return;
      this.gifts.push(...due);
      this.beforeLeave();
      return;
    }
    for (const combo of due) this.onCombo(combo);
  }

  /** Brings the next gift box, one at a time. */
  private nextGift(): void {
    const { scene, catalog } = this.ctx;
    if (this.gift || this.ctx.isLeaving() || this.gifts.length === 0) return;
    const combo = this.gifts.shift()!;
    const item = catalog.clothes.find((c) => c.id === combo.rewardItemId);
    if (!item) return;
    const box = new GiftBox(scene, 570, 530, combo.id, item);
    this.gift = box;
    box.on(ObjectEvents.GiftOpened, (_b: GiftBox, prize: Phaser.GameObjects.Image) => this.onGiftOpened(combo, item, prize));
  }

  /** Saves a won combo (at once) and pays the bonus of the first time. `from` is where the buttons fly from; null for none. */
  private unlockCombo(comboId: string, from: Point | null): void {
    const { scene, catalog } = this.ctx;
    const rules = (catalog as unknown as { economy: EconomyRules }).economy;
    payDiscovery(scene, 'combo', comboId, rules, undefined, from);
    // Without a progress in the registry (nothing to pay) or already in it, this keeps the save in step.
    getSave(scene).unlockSecret(comboId);
  }

  /** The prize is out: it is saved at once, but the cell and the counter only react when it lands. */
  private onGiftOpened(combo: ComboDef, item: ClothingDef, prize: Phaser.GameObjects.Image): void {
    const { scene, catalog, grid, sparkles, sign } = this.ctx;
    this.gift = null;
    // The first time a combo is won it pays: the buttons fly from the prize to the purse as it comes out of the box.
    this.unlockCombo(combo.id, { x: prize.x, y: prize.y });
    this.unlocked = getSave(scene).secrets;
    this.reveal.begin(combo.id, item.id);
    this.traceSecrets();
    sign.announce(`${item.name}!`);
    // Show the tab of the prize so the cell is there (invisible) when it lands.
    this.ctx.showCategory(item.category);
    grid.setWorn(new Set(Object.values(this.ctx.getOutfit())));
    const home = grid.getCellPositions()[item.id];
    const finish = () => {
      prize.destroy();
      this.reveal.land(combo.id);
      const cell = grid.getCell(item.id);
      cell?.revealPop();
      scene.time.delayedCall(380, () => cell?.active && cell.celebrate());
      this.counter.setCount(this.reveal.shownCount(this.unlocked), catalog.combos.length, true);
      this.traceSecrets();
      if (home) sparkles.explode(profileOf(scene).count(14), home.x, home.y);
      getAudio(scene).play(SfxKeys.Return, { rate: 1.3 });
      scene.time.delayedCall(250, () => this.nextGift());
    };
    scene.tweens.add({
      targets: prize, x: home?.x ?? prize.x, y: home?.y ?? prize.y, alpha: home ? 1 : 0, duration: 650, ease: 'Cubic.easeInOut',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const k = 1 - tween.progress;
        const side = GHOST_HOME_SIZE * 1.1 + 170 * k;
        prize.setDisplaySize(side, side);
      },
      onComplete: finish,
    });
  }

  /**
   * "¡Casi!": a quiet twinkle on the cat when one piece is missing from a combo (no names, no spoilers). The bubble comes out
   * to the side of the head (it never covers the name sign) and the cat glances toward the tab of the piece that is missing.
   */
  private updateAlmost(): void {
    const { scene, catalog, cat, sparkles, tabs } = this.ctx;
    const outfit = this.ctx.getOutfit();
    const now = new Set(this.almostIds(outfit));
    const fresh = [...now].some((id) => !this.almost.has(id));
    this.almost = now;
    if (!fresh) return;
    const head = cat.getAnchorWorld('head');
    sparkles.explode(profileOf(scene).count(6), head.x + 90, head.y - 30);
    showBubble(scene, head.x + 160, head.y + 10, 'Casi...!', 'rosa50', { fontSize: 26, tail: 'left' });
    const hint = almostHint(outfit, catalog.combos, catalog.clothes, this.unlocked);
    const tab = hint && tabs.getTabPositions()[hint.category];
    if (tab && !this.ctx.isDragging()) {
      cat.lookAt(tab);
      this.lookTimer?.remove();
      this.lookTimer = scene.time.delayedCall(600, () => !this.ctx.isDragging() && cat.lookAt(null));
    }
  }
}
