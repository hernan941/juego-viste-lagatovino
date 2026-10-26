// Taste reactions (S2, F14.2): when a garment is dropped, the cat tells what it thinks of it. Love, dislike, favorite and
// color each have their own face, sound and motion (domain/tasteFx.ts). The garment always stays: the player decides, the
// cat only has an opinion. Combos have their own reaction (SecretsController) and neutral drops keep the scene's happy face.
import type Phaser from 'phaser';
import { DressUpEvents, Ink, SfxKeys, TextureKeys, MEOW_KEYS, colorToNumber } from '../../constants';
import { newlyCompleted } from '../../domain/combos';
import { tasteLines } from '../../domain/copy';
import { anchorForSlot } from '../../domain/slots';
import { tasteFxPlan, type TasteSound } from '../../domain/tasteFx';
import { tasteReaction, type TasteKind } from '../../domain/tastes';
import type { ClothingDef, Outfit } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { getSave } from '../../plugins/SavePlugin';
import { profileOf } from '../../systems/motion';
import { SpeechBubble } from '../kit/SpeechBubble';
import type { DressUpContext, DressUpController } from './DressUpController';

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

  attach(ctx: DressUpContext): void {
    this.ctx = ctx;
    this.current = this.before = ctx.getOutfit();
    ctx.scene.events.on(DressUpEvents.OutfitChanged, this.onOutfit, this);
    ctx.scene.events.on(DressUpEvents.ItemDropped, this.onDropped, this);
  }

  destroy(): void {
    this.ctx.scene.events.off(DressUpEvents.OutfitChanged, this.onOutfit, this);
    this.ctx.scene.events.off(DressUpEvents.ItemDropped, this.onDropped, this);
    for (const t of this.timers) t.remove();
    this.timers = [];
    this.bubble?.destroy();
    this.bubble = null;
  }

  e2eState(): { last: TasteKind | null; log: TasteKind[] } {
    return { last: this.log[this.log.length - 1] ?? null, log: [...this.log] };
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
