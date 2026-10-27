// Taste reactions (S2, F14.2): when a garment is dropped, the cat tells what it thinks of it. Love, dislike, favorite and
// color each have their own face, sound and motion (domain/tasteFx.ts). The garment always stays: the player decides, the
// cat only has an opinion. Combos have their own reaction (SecretsController) and neutral drops keep the scene's happy face.
// F14.3: the first time a taste shows (per cat) it is a discovery: a chip flies to the name sign and pays the bonus.
import type Phaser from 'phaser';
import { DressUpEvents, Ink, RegistryKeys, SfxKeys, TextureKeys, MEOW_KEYS, colorToNumber } from '../../constants';
import { tasteChip, type NameLookup } from '../../domain/catSheet';
import { newlyCompleted } from '../../domain/combos';
import { tasteLines } from '../../domain/copy';
import { anchorForSlot } from '../../domain/slots';
import { tasteFxPlan, type TasteSound } from '../../domain/tasteFx';
import { tasteKeyOf, tasteReaction, type TasteKind } from '../../domain/tastes';
import type { CatDef, ClothingDef, DyeDef, EconomyRules, Outfit, Point, Progress, TasteKey } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { getSave } from '../../plugins/SavePlugin';
import { profileOf } from '../../systems/motion';
import { SpeechBubble } from '../kit/SpeechBubble';
import { TasteChip } from '../TasteChip';
import type { DressUpContext, DressUpController } from './DressUpController';
import { payDiscovery } from './awards';

/** What the catalog of the registry carries besides the clothes (GameData, ADR 0017). */
interface WithRules {
  economy: EconomyRules;
  dyes?: DyeDef[];
}

const BUBBLE_MS = 1300;
const SOL = colorToNumber(Ink.sol);

export class TasteReactions implements DressUpController {
  readonly key = 'tastes';
  private ctx!: DressUpContext;
  private before: Outfit = {};
  private current: Outfit = {};
  private log: TasteKind[] = [];
  private bubble: SpeechBubble | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  /** Discoveries whose chip is still in the air: the taste is paid when it lands (or when the scene closes first). */
  private pending = new Map<TasteKey, TasteChip>();
  /** Tastes discovered in this visit, newest last (for the e2e hook). */
  private discovered: TasteKey[] = [];

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    this.current = this.before = ctx.getOutfit();
    ctx.scene.events.on(DressUpEvents.OutfitChanged, this.onOutfit, this);
    ctx.scene.events.on(DressUpEvents.ItemDropped, this.onDropped, this);
    ctx.scene.events.on(DressUpEvents.ItemDyed, this.onDyed, this);
  }

  destroy(): void {
    this.ctx.scene.events.off(DressUpEvents.OutfitChanged, this.onOutfit, this);
    this.ctx.scene.events.off(DressUpEvents.ItemDropped, this.onDropped, this);
    this.ctx.scene.events.off(DressUpEvents.ItemDyed, this.onDyed, this);
    // A discovery in the air is not lost: it is written now, without the flight.
    for (const [key, chip] of [...this.pending]) {
      chip.destroy();
      this.pay(key, null);
    }
    this.pending.clear();
    for (const t of this.timers) t.remove();
    this.timers = [];
    this.bubble?.destroy();
    this.bubble = null;
  }

  e2eState(): { last: TasteKind | null; log: TasteKind[]; discovered: TasteKey[]; pending: TasteKey[] } {
    return { last: this.log[this.log.length - 1] ?? null, log: [...this.log], discovered: [...this.discovered], pending: [...this.pending.keys()] };
  }

  /** False while a discovery chip is flying. */
  isSettled(): boolean {
    return this.pending.size === 0;
  }

  private onOutfit(outfit: Outfit): void {
    this.before = this.current;
    this.current = outfit;
  }

  private onDropped(item: ClothingDef): void {
    const { scene, catalog, catId } = this.ctx;
    const cat = catalog.cats.find((c) => c.id === catId);
    if (!cat) return;
    const dye = getSave(scene).saved.itemDye[item.id];
    const combos = newlyCompleted(this.before, this.current, catalog.combos, catalog.clothes);
    const reaction = tasteReaction(item, dye, cat, combos);
    this.log.push(reaction.kind);
    this.play(reaction.kind, item);
    const key = tasteKeyOf(reaction);
    if (key) this.discover(key, cat);
  }

  // ---- Discovering ---------------------------------------------------------

  private progress(): Progress {
    return this.ctx.scene.registry.get(RegistryKeys.Progress) as Progress;
  }

  private names(): NameLookup {
    const { catalog } = this.ctx;
    const dyes = (catalog as unknown as WithRules).dyes ?? [];
    return {
      item: (id) => catalog.clothes.find((c) => c.id === id)?.name ?? id,
      dye: (id) => dyes.find((d) => d.id === id)?.name ?? id,
    };
  }

  /** The first time (per cat) a taste shows: a chip comes out of the cat and flies to the name sign, where it pays. */
  private discover(key: TasteKey, cat: CatDef): void {
    const { scene, catId, cat: kitty, sign } = this.ctx;
    if (this.pending.has(key) || (this.progress().tastesFound[catId] ?? []).includes(key)) return;
    const head = kitty.getAnchorWorld('head');
    // It comes out to the left of the face (the bubble is on the right) and waits a moment so it is seen.
    const chip = new TasteChip(scene, head.x - 190, head.y + 10, tasteChip(key, this.names(), cat), { width: 150, maxWidth: 340, height: 64 }).setDepth(4150);
    this.pending.set(key, chip);
    const target = { x: sign.x, y: sign.y + 11 };
    chip.flyTo(target, () => {
      this.pending.delete(key);
      this.pay(key, target);
      this.pulseSign();
    });
  }

  /** Pays the discovery (only the first time) and, with a `from`, flies the buttons from there to the purse. */
  private pay(key: TasteKey, from: Point | null): void {
    const rules = (this.ctx.catalog as unknown as WithRules).economy;
    if (payDiscovery(this.ctx.scene, 'taste', key, rules, this.ctx.catId, from) > 0) this.discovered.push(key);
  }

  /** The sign takes the chip in with a little jump (reduced motion: none). */
  private pulseSign(): void {
    const { scene, sign } = this.ctx;
    if (profileOf(scene).reduced) return;
    scene.tweens.add({ targets: sign, scale: 1.1, duration: 110, yoyo: true, ease: 'Sine.easeOut', onComplete: () => sign.setScale(1) });
  }

  /** A bottle was put on a worn item (F16.3): the cat only reacts to its own favorite color. The dye comes with the event, the save may not have it yet. */
  private onDyed(item: ClothingDef, dyeId: string): void {
    const cat = this.ctx.catalog.cats.find((c) => c.id === this.ctx.catId);
    if (!cat?.prefs || dyeId !== cat.prefs.favoriteDye) return;
    this.log.push('color');
    this.play('color', item);
  }

  private play(kind: TasteKind, item: ClothingDef): void {
    const plan = tasteFxPlan(kind);
    const { scene, cat, hearts } = this.ctx;
    const p = profileOf(scene);
    const head = cat.getAnchorWorld('head');
    if (plan.sayNo) cat.sayNo();
    else if (plan.face) cat.playFaces({ expression: plan.face, ms: plan.ms });
    if (plan.glance) cat.glanceAt(cat.getAnchorWorld(anchorForSlot(item.slot)), 900);
    if (plan.hearts > 0) hearts.explode(p.count(plan.hearts), head.x, head.y - 40);
    if (plan.sparks > 0) this.goldenSparks(head.x, head.y - 40, p.count(plan.sparks));
    if (plan.sound) this.sound(plan.sound);
    if (plan.bubble) this.say(tasteLines.bubble(kind as 'dislike' | 'favorite' | 'color'), head.x + 120, head.y - 70);
  }

  private sound(sound: TasteSound): void {
    const audio = getAudio(this.ctx.scene);
    if (sound === 'meowLow') audio.playRandom(MEOW_KEYS, { rate: 0.8, vary: false });
    else audio.play(SfxKeys.Purr, { volume: 0.8 });
    // A long purr: the short one again, a bit lower, right after.
    if (sound === 'purrLong') this.later(380, () => audio.play(SfxKeys.Purr, { volume: 0.7, rate: 0.9 }));
  }

  /** A one-shot burst of golden ink sparkles that cleans itself up. */
  private goldenSparks(x: number, y: number, count: number): void {
    const { scene } = this.ctx;
    const burst = scene.add.particles(x, y, TextureKeys.InkSparkle, {
      emitting: false, speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 }, lifespan: 800, scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, tint: SOL,
    }).setDepth(4000);
    burst.explode(count);
    this.later(900, () => burst.destroy());
  }

  /** The cat's bubble: it pops in by itself, stays a moment and fades. One at a time. */
  private say(text: string, x: number, y: number): void {
    const { scene } = this.ctx;
    this.bubble?.destroy();
    const bubble = new SpeechBubble(scene, x, y, text, { maxWidth: 320 }).setDepth(4100);
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
    const t = this.ctx.scene.time.delayedCall(ms, fn);
    this.timers.push(t);
  }
}
