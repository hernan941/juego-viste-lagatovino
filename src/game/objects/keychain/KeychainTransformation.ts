// The transformation of the cat into a porcelain keychain (S8, ADR 0021), about 2.2 s: a kiln flash and the cat shrinks, a half turn
// that comes back as porcelain, a streak of varnish, the hardware going on piece by piece and the swing. It is ONE counter that runs
// the clock; everything else is set from `transformFrame(t)` (domain/keychainTransform.ts), so skipping is asking for the end and
// there is nothing else to clean up. The keychain is built (bare, without hardware) while the flash is at its brightest.
import Phaser from 'phaser';
import { ObjectEvents, SfxKeys, TextureKeys, colorToNumber, GAME_HEIGHT, GAME_WIDTH } from '../../constants';
import { hardwareParts, ringFor, type HardwarePartId } from '../../domain/keychain';
import { streakStops, transformFrame, transformPlan, type KeychainPhase, type TransformFrame } from '../../domain/keychainTransform';
import type { Point, KeychainRecipe } from '../../domain/types';
import { profileOf } from '../../systems/motion';
import type { Cat } from '../Cat';
import { Keychain, type KeychainData } from './Keychain';
import { bakeStreakFrames, removeStreakFrames } from './varnishStreak';

/** How big the cat is when it turns into porcelain, and the canvas rows between its feet and the middle of the 512 canvas. */
const FEET_TO_CENTER = 234;
const SHRUNK = 0.6;
/** The flash goes up in this many ms; the keychain is built right after, under the white, and the plan starts from the peak. */
const FLASH_RISE_MS = 70;
const BUILD_AFTER_MS = 100;
/** How far above its place the ring starts to fall, in px of the keychain texture. */
const RING_FALL = 260;
const VEIL_DEPTH = 90;

export interface TransformationOptions {
  cat: Cat;
  recipe: KeychainRecipe;
  data: KeychainData;
  depth: number;
  play: (key: string, volume?: number) => void;
  onPhase: (phase: KeychainPhase) => void;
}

interface Base { x: number; y: number; scaleX: number; scaleY: number; angle: number }

export class KeychainTransformation {
  keychain: Keychain | null = null;
  private readonly scene: Phaser.Scene;
  private readonly o: TransformationOptions;
  private readonly reduced: boolean;
  private readonly charm: boolean;
  private veil: Phaser.GameObjects.Rectangle | null = null;
  private clock: Phaser.Tweens.Tween | null = null;
  private delay: Phaser.Time.TimerEvent | null = null;
  private streakKeys: string[] = [];
  private streakImages: Phaser.GameObjects.Image[] = [];
  private parts: Partial<Record<HardwarePartId, Phaser.GameObjects.Image>> = {};
  private base: Partial<Record<HardwarePartId, Base>> = {};
  private catScale = 1;
  private phase: KeychainPhase | null = null;
  private swung = false;
  private chimed = false;
  private quiet = false;
  private finished = false;
  private gone = false;
  private resolve: (() => void) | null = null;

  constructor(scene: Phaser.Scene, options: TransformationOptions) {
    this.scene = scene;
    this.o = options;
    this.reduced = profileOf(scene).reduced;
    this.charm = ringFor(options.recipe.stars, options.data.rules).charm;
  }

  get done(): boolean {
    return this.finished;
  }

  get currentPhase(): KeychainPhase | null {
    return this.phase;
  }

  /** Runs the transformation; resolves when it is over (the keychain stays on screen, hanging and swinging). */
  run(): Promise<void> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      void this.begin();
    });
  }

  private async begin(): Promise<void> {
    const { scene, o } = this;
    const p = profileOf(scene);
    this.catScale = o.cat.scaleX;
    this.veil = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, p.flash.color, 0).setDepth(VEIL_DEPTH);
    this.play(SfxKeys.Oven);
    if (!this.reduced) {
      // The flash goes up fast and the keychain is built under it: the hitch of the drawing is hidden by the white.
      scene.tweens.add({ targets: this.veil, alpha: p.flash.alpha, duration: FLASH_RISE_MS, ease: 'Sine.easeOut' });
      await new Promise<void>((resolve) => { this.delay = scene.time.delayedCall(BUILD_AFTER_MS, () => resolve()); });
      if (this.gone) return;
    }
    const keychain = new Keychain(scene, 0, 0, o.recipe, o.data, { px: 512, hardware: false });
    this.keychain = keychain;
    keychain.setDepth(o.depth).setAlpha(0);
    keychain.on(ObjectEvents.KeychainTink, (strength: number) => this.play(SfxKeys.Porcelain, 0.35 + 0.65 * strength));
    await keychain.whenReady();
    if (this.gone) return;
    this.dress(keychain);
    this.apply(this.reduced ? 0 : FLASH_RISE_MS);
    const { total } = transformPlan(this.reduced);
    const from = this.reduced ? 0 : FLASH_RISE_MS;
    this.clock = scene.tweens.addCounter({
      from, to: total, duration: total - from, ease: 'Linear',
      onUpdate: (tween) => this.apply(tween.getValue() ?? 0),
      onComplete: () => this.finish(),
    });
  }

  /** Puts the keychain where the cat's middle is, at the size the cat has when it shrinks, and makes its live pieces and streak frames. */
  private dress(keychain: Keychain): void {
    const { cat } = this.o;
    const { layout } = keychain;
    const ks = this.catScale * SHRUNK;
    const center = { x: cat.x, y: cat.y - FEET_TO_CENTER * ks };
    const lookCenter = { x: layout.look.x + keychain.px / 2, y: layout.look.y + keychain.px / 2 };
    keychain.setPosition(center.x + (layout.hang.x - lookCenter.x) * ks, center.y + (layout.hang.y - lookCenter.y) * ks);
    keychain.setScale(ks);
    if (!this.reduced) {
      this.streakKeys = bakeStreakFrames(this.scene, keychain.textureKey, layout.width, layout.height, streakStops(layout.width));
      this.streakImages = this.streakKeys.map((key) => {
        const img = this.scene.add.image(-layout.hang.x, -layout.hang.y, key).setOrigin(0, 0).setDisplaySize(layout.width, layout.height).setVisible(false);
        keychain.add(img);
        return img;
      });
    }
    this.parts = keychain.hardwareImages();
    const ring = ringFor(this.o.recipe.stars, this.o.data.rules);
    for (const part of hardwareParts(layout, ring)) {
      const img = this.parts[part.part];
      if (!img) continue;
      this.base[part.part] = { x: img.x, y: img.y, scaleX: img.scaleX, scaleY: img.scaleY, angle: img.angle };
      img.setVisible(true).setAlpha(0);
    }
  }

  /** Moves everything to what the plan says at `t` ms, and announces the phases that went by. */
  private apply(t: number): void {
    if (this.gone) return;
    const frame = transformFrame(t, { reduced: this.reduced, charm: this.charm });
    this.announce(frame.phase);
    this.show(frame);
  }

  /** Tells each phase once and in order, even the ones a jump went over (without their sounds). */
  private announce(phase: KeychainPhase): void {
    const order = [...transformPlan(this.reduced).spans.map((s) => s.phase), 'package' as const];
    const from = this.phase === null ? 0 : order.indexOf(this.phase) + 1;
    const to = order.indexOf(phase);
    for (let i = from; i <= to; i++) {
      const next = order[i]!;
      this.phase = next;
      this.o.onPhase(next);
      if (i === to) this.cue(next);
    }
  }

  /** The sound of a phase (only when it is entered in time, not when a skip jumps over it). */
  private cue(phase: KeychainPhase): void {
    if (phase === 'varnish') this.play(SfxKeys.Varnish);
    else if (phase === 'hardware') this.play(SfxKeys.Latch);
  }

  private play(key: string, volume?: number): void {
    if (!this.quiet) this.o.play(key, volume);
  }

  private show(frame: TransformFrame): void {
    const { cat } = this.o;
    const veil = this.veil;
    const k = this.keychain;
    if (veil && !this.reduced && this.clock) veil.setAlpha(frame.flash * profileOf(this.scene).flash.alpha);
    // The cat shrinks (with a little squash) and turns; it is gone once the porcelain has taken its place.
    cat.setAlpha(frame.cat.alpha);
    const s = this.catScale * frame.cat.scale;
    cat.setScale(s * frame.cat.flip * (1 + frame.cat.squash), s * (1 - frame.cat.squash));
    if (!k) return;
    k.setAlpha(frame.keychain.alpha);
    const ks = this.catScale * SHRUNK;
    k.setScale(ks * frame.keychain.flip, ks);
    this.streakImages.forEach((img, i) => img.setVisible(frame.streak === i));
    this.setPart('eyelet', frame.eyelet.alpha, frame.eyelet.angle);
    for (const id of ['ring-silver', 'ring-gold'] as const) this.setPart(id, frame.ring.alpha, 0, -frame.ring.drop * RING_FALL);
    this.unroll(frame.chain, frame.charm);
    if (frame.swing && !this.swung) {
      this.swung = true;
      this.sparkleCharm();
      k.swing(1);
    }
  }

  private setPart(id: HardwarePartId, alpha: number, turn = 0, dy = 0): void {
    const img = this.parts[id];
    const base = this.base[id];
    if (!img || !base) return;
    img.setAlpha(alpha).setAngle(base.angle + turn).setY(base.y + dy);
  }

  /** The chain unrolls from the ring and the charm rides at its end, popping in. */
  private unroll(chain: number, charm: number): void {
    const c = this.parts.chain;
    const h = this.parts.charm;
    const cb = this.base.chain;
    const hb = this.base.charm;
    if (!c || !h || !cb || !hb) return;
    c.setAlpha(chain > 0 ? 1 : 0).setScale(cb.scaleX, cb.scaleY * chain);
    h.setAlpha(charm).setScale(hb.scaleX * (0.4 + 0.6 * charm), hb.scaleY * (0.4 + 0.6 * charm));
    h.setPosition(cb.x + (hb.x - cb.x) * chain, cb.y + (hb.y - cb.y) * chain);
    if (chain >= 0.99 && !this.chimed) {
      this.chimed = true;
      this.play(SfxKeys.Chain);
    }
  }

  /** With 5 stars the charm flashes and a few golden stars jump out of it. */
  private sparkleCharm(): void {
    const charm = this.parts.charm;
    const k = this.keychain;
    if (!charm || !k || this.reduced) return;
    const p = profileOf(this.scene);
    const at = { x: k.x + charm.x * k.scaleX, y: k.y + charm.y * k.scaleY };
    const n = p.count(7);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const star = this.scene.add.image(at.x, at.y, TextureKeys.Sparkle).setScale(0.5).setDepth(this.o.depth + 1).setTint(colorToNumber('#FFC84A'));
      this.scene.tweens.add({
        targets: star, x: at.x + Math.cos(a) * 70, y: at.y + Math.sin(a) * 70, alpha: 0, scale: 0.12, angle: 120, duration: 520, ease: 'Sine.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  /** A tap while it runs: jumps to the end state (the phases still go by in order, quietly). */
  skip(): void {
    if (this.finished || this.gone || !this.keychain || !this.clock) return;
    this.clock.remove();
    this.clock = null;
    // The phases that are jumped over still go by, in order, but without their sounds.
    this.quiet = true;
    this.apply(transformPlan(this.reduced).total);
    this.quiet = false;
    this.finish();
  }

  private finish(): void {
    if (this.finished || this.gone) return;
    this.finished = true;
    this.clock = null;
    this.veil?.destroy();
    this.veil = null;
    removeStreakFrames(this.scene, this.streakKeys);
    for (const img of this.streakImages) img.destroy();
    this.streakImages = [];
    this.streakKeys = [];
    this.resolve?.();
    this.resolve = null;
  }

  /** The keychain flies to `at` and settles at `scale` (it keeps swinging). */
  hangOn(at: Point, scale: number): Promise<void> {
    const k = this.keychain;
    if (!k) return Promise.resolve();
    const p = profileOf(this.scene);
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: k, x: at.x, y: at.y, scaleX: scale, scaleY: scale, duration: p.reduced ? 250 : 480, ease: p.ease('Back.easeOut'), onComplete: () => resolve(),
      });
    });
  }

  /** The keychain sinks and fades (it goes away with the packaging). */
  fadeOut(): Promise<void> {
    const k = this.keychain;
    if (!k) return Promise.resolve();
    const p = profileOf(this.scene);
    return new Promise((resolve) => {
      this.scene.tweens.add({ targets: k, alpha: 0, y: k.y + (p.reduced ? 0 : 70), duration: 300, ease: 'Sine.easeIn', onComplete: () => resolve() });
    });
  }

  /** Gives the cat back as it was (a tap on the packaging puts the keychain away, and the table is the same as before). */
  restoreCat(): void {
    const { cat } = this.o;
    cat.setAlpha(1);
    cat.setScale(this.catScale);
  }

  destroy(): void {
    if (this.gone) return;
    this.gone = true;
    this.clock?.remove();
    this.clock = null;
    this.delay?.remove();
    this.delay = null;
    this.veil?.destroy();
    this.veil = null;
    removeStreakFrames(this.scene, this.streakKeys);
    for (const img of this.streakImages) img.destroy();
    this.streakImages = [];
    if (this.keychain) this.scene.tweens.killTweensOf(this.keychain);
    this.keychain?.destroy();
    this.keychain = null;
    this.resolve?.();
    this.resolve = null;
  }
}
