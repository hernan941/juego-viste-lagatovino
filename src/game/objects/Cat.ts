import Phaser from 'phaser';
import { ObjectEvents } from '../constants';
import { catTailKey, faceKey } from '../data/assets';
import { reactionFor, type Expression, type ReactionEvent } from '../domain/expressions';
import { Cooldown } from '../domain/cooldown';
import { blinkCount, idleLookOffset, lookOffset, nextBlinkDelay, nextFlickDelay, nextIdleLookDelay } from '../domain/idle';
import { staggerDelays } from '../domain/stagger';
import { grabPoint, hitsAlpha } from '../domain/pixelHit';
import { slotZIndex, hitBoxForSlot, anchorForSlot } from '../domain/slots';
import { TAIL_FLICK, TAIL_FLICK_DROP, TAIL_FLICK_WAG, TAIL_IDLE, flickSteps, tailPivot } from '../domain/tail';
import { isE2EEnabled } from '../e2eHook';
import { profileOf } from '../systems/motion';
import { RegistryKeys } from '../constants';
import { alphaMapOf, opaqueBounds } from './alphaMap';
import { hex } from './ui';
import type { AnchorName, AnchorsDef, CatDef, ClothingDef, Point, Rect } from '../domain/types';

/** Y of the paws' bottom edge in the 512 canvas: the pivot for breathing and squash. */
const FEET_Y = 490;
const FACE_DEPTH = slotZIndex('neck') + 0.5;
/** Pixels (of the 192 px alpha map) around the pointer that still count as touching a worn item: thin ones stay grabbable. */
const HIT_REACH = 2;
const FACE_LOOK_PX = { x: 5, y: 3 };
/** Petting the cat answers at most this often. */
const PET_COOLDOWN_MS = 400;
/** The pointer has to move this far from where it dropped before a garment lights up. */
const HOVER_MOVE_PX = 4;
/** The halo of a hovered garment: this many copies, this far (canvas px) from it. */
const HALO_COPIES = 8;
const HALO_PX = 5;

interface Layer {
  item: ClothingDef;
  image: Phaser.GameObjects.Image;
}

/**
 * The cat: a Container whose origin is the middle of its feet. Inside it, `rig` takes squash and shake,
 * and `breath` the idle loop. The body has no face and no tail: the tail is its own layer behind the
 * body, pivoting at its base (idle sway and flick, F3); the face is a swappable layer and the
 * clothes are one image per slot, ordered by the slot z index (ADR 0003). All art is the 512 canvas
 * scaled by `Cat.scale`, so anchors and boxes from anchors.json apply directly.
 */
export class Cat extends Phaser.GameObjects.Container {
  readonly def: CatDef;
  private readonly rig: Phaser.GameObjects.Container;
  private readonly breath: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Image;
  private readonly fur: Phaser.GameObjects.Image;
  private breathTween?: Phaser.Tweens.Tween;
  private tintTimer?: Phaser.Time.TimerEvent;
  private readonly tail: Phaser.GameObjects.Image;
  private tailTween?: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain;
  private readonly layers = new Map<string, Layer>();
  private expression: Expression = 'normal';
  private held = false;
  private blinkTimer?: Phaser.Time.TimerEvent;
  private idleLookTimer?: Phaser.Time.TimerEvent;
  private idleLookBack?: Phaser.Time.TimerEvent;
  private wagTimer?: Phaser.Time.TimerEvent;
  private glanceTimer?: Phaser.Time.TimerEvent;
  /** True while the face follows something (the dragged item): the idle glance waits. */
  private watching = false;
  private pettable = false;
  /** A worn item is being dragged off: no hover on the others. */
  private dragging = false;
  /** Where the pointer was at the last drop: a hover does not start until it moves away from there. */
  private hoverHold: Point | null = null;
  /** The halo copies of every layer that is hovered. */
  private readonly halos = new Map<Phaser.GameObjects.Image, Phaser.GameObjects.Image[]>();
  private readonly petCooldown = new Cooldown(PET_COOLDOWN_MS);
  /** Layers whose pop-in has not finished yet (stable positions are for tests, and for the scene's `settled`). */
  private readonly popping = new Set<Phaser.GameObjects.Image>();
  private revertTimer?: Phaser.Time.TimerEvent;
  private lookTween?: Phaser.Tweens.Tween;
  private faceTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene, x: number, y: number, def: CatDef, private readonly anchors: AnchorsDef, displaySize: number,
  ) {
    super(scene, x, y);
    this.def = def;
    this.setScale(displaySize / anchors.canvas.width);
    this.breath = scene.add.container(0, 0);
    this.rig = scene.add.container(0, 0, [this.breath]);
    this.add(this.rig);

    this.tail = this.createTail();
    this.fur = this.canvasImage(def.texture).setDepth(-1);
    this.face = this.canvasImage(faceKey('normal')).setDepth(FACE_DEPTH);
    this.breath.add([this.tail, this.fur, this.face]);
    this.breath.sort('depth');

    scene.add.existing(this);
    this.startIdle();
    // The idle follows the reduced motion setting live (ADR 0013).
    scene.registry?.events.on(`changedata-${RegistryKeys.ReducedMotion}`, this.startIdle, this);
  }

  /** Image of a full 512 canvas texture, placed so that canvas (0,0) is at the top left of the cat. */
  private canvasImage(key: string): Phaser.GameObjects.Image {
    const { width, height } = this.anchors.canvas;
    return this.scene.add.image(0, 0, key).setOrigin(0.5).setPosition(0, height / 2 - FEET_Y).setDisplaySize(width, height);
  }

  /** The tail layer: the full 512 canvas with its origin at the base of the tail, so it rotates from there. */
  private createTail(): Phaser.GameObjects.Image {
    const { width, height } = this.anchors.canvas;
    const { point, origin } = tailPivot(this.anchors);
    return this.scene.add.image(0, 0, catTailKey(this.def)).setOrigin(origin.x, origin.y)
      .setPosition(point.x - width / 2, point.y - FEET_Y).setDisplaySize(width, height).setDepth(-2);
  }

  /** Canvas point (px of the 512 canvas) to game coordinates. */
  canvasToWorld(p: Point): Point {
    return { x: this.x + (p.x - this.anchors.canvas.width / 2) * this.scaleX, y: this.y + (p.y - FEET_Y) * this.scaleY };
  }

  getAnchorWorld(name: AnchorName): Point {
    return this.canvasToWorld(this.anchors.anchors[name]);
  }

  /** Where the tip of the balloon is, in game coordinates (the top of the accessory item when it is worn, else above the head). */
  getAccessoryTip(): Point {
    const layer = this.layers.get('accessory');
    if (layer) {
      const b = opaqueBounds(this.scene, layer.item.texture);
      const { width, height } = this.anchors.canvas;
      if (b) return this.canvasToWorld({ x: (b.x + b.width / 2) * width, y: (b.y + b.height * 0.2) * height });
    }
    const head = this.anchors.anchors.head;
    return this.canvasToWorld({ x: head.x + 120, y: head.y - 70 });
  }

  /** The drop zone (body plus margin is added by the caller) in game coordinates. */
  getDropZoneRect(): Rect {
    const z = this.anchors.dropZone;
    const tl = this.canvasToWorld({ x: z.x, y: z.y });
    return { x: tl.x, y: tl.y, width: z.width * this.scaleX, height: z.height * this.scaleY };
  }

  /**
   * A visible point of the worn item, in game coordinates (where to grab it): a solid pixel that no item
   * drawn above covers. Thin items that are fully hidden fall back to the center of the slot box.
   */
  getLayerGrabPoint(item: ClothingDef): Point {
    const own = alphaMapOf(this.scene, item.texture);
    const covers = [...this.layers.values()]
      .filter((l) => slotZIndex(l.item.slot) > slotZIndex(item.slot))
      .map((l) => alphaMapOf(this.scene, l.item.texture));
    const p = grabPoint(own, covers, { reach: HIT_REACH });
    if (p) {
      const k = this.anchors.canvas.width / own.width;
      return this.canvasToWorld({ x: (p.x + 0.5) * k, y: (p.y + 0.5) * k });
    }
    const b = this.anchors.boxes[hitBoxForSlot(item.slot)];
    const slotAnchor = this.anchors.anchors[anchorForSlot(item.slot)];
    return this.canvasToWorld({ x: b.x + b.width / 2, y: Math.min(Math.max(slotAnchor.y, b.y), b.y + b.height) });
  }

  /** Current angle of the tail layer in degrees (for tests). */
  get tailAngle(): number {
    return this.tail.angle;
  }

  // ---- Idle: breathing, sway, blinking -----------------------------------

  /** (Re)starts the idle loops with the current motion profile: reduced motion keeps only blinking and a tiny, slow sway. */
  private startIdle(): void {
    const p = profileOf(this.scene);
    this.breathTween?.remove();
    this.breathTween = undefined;
    this.breath.setScale(1);
    if (p.breathe) {
      this.breathTween = this.scene.tweens.add({ targets: this.breath, scaleY: { from: 0.98, to: 1.02 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.swayTail();
    if (!this.blinkTimer) this.scheduleBlink();
    if (!this.idleLookTimer) this.scheduleIdleLook();
    if (!this.wagTimer) this.scheduleWag();
  }

  /**
   * Gentle endless sway of the tail from its base: ±4° with Sine.easeInOut (TAIL_IDLE).
   * The previous tail tween is stopped with `stop()`: `TweenChain.remove()` takes a child tween, not itself, and crashed.
   */
  private swayTail(fromCurrent = false): void {
    this.tailTween?.stop();
    const p = profileOf(this.scene);
    const angle = TAIL_IDLE.angle * p.tailSwing;
    // After a flick the tail already rests at -angle (TAIL_FLICK_STEPS), so it must not be reset: no jump.
    if (!fromCurrent) this.tail.setAngle(-angle);
    this.tailTween = this.scene.tweens.add({
      targets: this.tail, angle, duration: TAIL_IDLE.duration * p.slow, yoyo: true, repeat: -1, ease: TAIL_IDLE.ease,
    });
  }

  /** Every 8 to 12 s the cat glances to a side for a moment, as if something caught its attention. */
  private scheduleIdleLook(): void {
    this.idleLookTimer = this.scene.time.delayedCall(nextIdleLookDelay(Math.random()), () => {
      if (!this.watching && !this.held && this.expression === 'normal') {
        const off = idleLookOffset(Math.random(), FACE_LOOK_PX.x);
        this.moveFace(off, 260);
        this.idleLookBack = this.scene.time.delayedCall(900, () => {
          if (!this.watching) this.moveFace({ x: 0, y: 0 }, 260);
        });
      }
      this.scheduleIdleLook();
    });
  }

  /** Every 6 to 10 s a soft, spontaneous tail wag: the cat looks like it is thinking. */
  private scheduleWag(): void {
    this.wagTimer = this.scene.time.delayedCall(nextFlickDelay(Math.random()), () => {
      if (!this.held) this.tailFlick(TAIL_FLICK_WAG);
      this.scheduleWag();
    });
  }

  /** Moves the face layer `off` px from its rest position with a short ease. */
  private moveFace(off: Point, ms: number): void {
    const base = this.canvasImagePosition();
    this.lookTween?.remove();
    this.lookTween = this.scene.tweens.add({ targets: this.face, x: base.x + off.x, y: base.y + off.y, duration: ms, ease: 'Sine.easeOut' });
  }

  /** A glance to one side (1 right, -1 left) for a moment, then back (a flourish of the Showcase pose). */
  glance(dir: 1 | -1, ms = 700): void {
    this.glanceTimer?.remove();
    const eyes = this.canvasToWorld(this.anchors.anchors.eyes);
    this.lookAt({ x: eyes.x + dir * 300, y: eyes.y });
    this.glanceTimer = this.scene.time.delayedCall(ms, () => this.lookAt(null));
  }

  private scheduleBlink(): void {
    this.blinkTimer = this.scene.time.delayedCall(nextBlinkDelay(Math.random()), () => {
      this.blink(blinkCount(Math.random()));
      this.scheduleBlink();
    });
  }

  private blink(times: number): void {
    if (this.expression !== 'normal' || this.held) return;
    this.face.setTexture(faceKey('parpadeo'));
    this.scene.time.delayedCall(120, () => {
      if (this.expression === 'normal' && !this.held) this.face.setTexture(faceKey('normal'));
      if (times > 1) this.scene.time.delayedCall(140, () => this.blink(times - 1));
    });
  }

  // ---- Expressions ---------------------------------------------------------

  /** Swaps the face layer with a micro-tween (scaleY 0.9 to 1 in 80 ms), never abruptly. */
  setExpression(expression: Expression): void {
    this.expression = expression;
    this.face.setTexture(faceKey(expression));
    const base = this.face.scaleX;
    this.faceTween?.remove();
    this.face.setScale(base, base * (1 - 0.1 * profileOf(this.scene).squash));
    this.faceTween = this.scene.tweens.add({ targets: this.face, scaleY: base, duration: 80, ease: 'Sine.easeOut' });
  }

  /** Holds an expression until `release()` (for example surprise while an item is dragged). */
  hold(expression: Expression): void {
    this.revertTimer?.remove();
    this.held = true;
    this.setExpression(expression);
  }

  release(): void {
    this.held = false;
    this.setExpression('normal');
  }

  /** Shows the expression of a game event for a while and then goes back to normal. */
  react(event: ReactionEvent): void {
    const { expression, ms } = reactionFor(event, Math.random());
    this.revertTimer?.remove();
    this.held = false;
    this.setExpression(expression);
    if (ms > 0) this.revertTimer = this.scene.time.delayedCall(ms, () => this.setExpression('normal'));
  }

  /** A combo face: an optional lead expression, then the main one for `ms`, then back to normal. */
  playFaces(plan: { lead?: Expression; expression: Expression; ms: number }, leadMs = 450): void {
    this.revertTimer?.remove();
    this.held = false;
    const main = () => {
      this.setExpression(plan.expression);
      this.revertTimer = this.scene.time.delayedCall(plan.ms, () => this.setExpression('normal'));
    };
    if (!plan.lead) return main();
    this.setExpression(plan.lead);
    this.revertTimer = this.scene.time.delayedCall(leadMs, main);
  }

  /** The face drifts 4 to 6 px toward a point (the dragged item); `null` brings it back. */
  lookAt(target: Point | null): void {
    this.watching = target !== null;
    const off = target ? lookOffset(this.canvasToWorld(this.anchors.anchors.eyes), target, FACE_LOOK_PX.x, FACE_LOOK_PX.y, 300) : { x: 0, y: 0 };
    this.idleLookBack?.remove();
    this.moveFace(off, 120);
  }

  private canvasImagePosition(): Point {
    return { x: 0, y: this.anchors.canvas.height / 2 - FEET_Y };
  }

  // ---- Reactions of the body ---------------------------------------------

  /** Squash and stretch in 300 ms. */
  squash(amount = 1): void {
    const p = profileOf(this.scene);
    const k = p.squash * amount;
    this.scene.tweens.killTweensOf(this.rig);
    this.scene.tweens.chain({
      targets: this.rig,
      tweens: [
        { scaleX: 1 + 0.14 * k, scaleY: 1 - 0.16 * k, duration: 90, ease: 'Quad.easeOut' },
        { scaleX: 1 - 0.05 * k, scaleY: 1 + 0.08 * k, duration: 110, ease: 'Quad.easeInOut' },
        { scaleX: 1, scaleY: 1, duration: 100, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  /** A hop that stretches upward and lands squashed: the pompom of the hat bounces (snow combo). */
  stretchUp(): void {
    const p = profileOf(this.scene);
    const k = p.squash;
    this.scene.tweens.killTweensOf(this.rig);
    this.scene.tweens.chain({
      targets: this.rig,
      tweens: [
        { scaleX: 1 - 0.04 * k, scaleY: 1 + 0.12 * k, y: -22 * k, duration: 130, ease: 'Quad.easeOut' },
        { scaleX: 1 + 0.06 * k, scaleY: 1 - 0.07 * k, y: 0, duration: 120, ease: 'Quad.easeIn' },
        { scaleX: 1, scaleY: 1, duration: 170, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  /** Two quick sniffs: the whole body shrinks a hair in height and comes back, twice (petals combo). */
  sniff(): void {
    const p = profileOf(this.scene);
    const down = 1 - 0.04 * p.squash;
    this.scene.tweens.killTweensOf(this.rig);
    this.scene.tweens.chain({
      targets: this.rig,
      tweens: [
        { scaleY: down, duration: 110, ease: 'Sine.easeOut' }, { scaleY: 1, duration: 110, ease: 'Sine.easeIn' },
        { scaleY: down, duration: 110, ease: 'Sine.easeOut' }, { scaleY: 1, duration: 130, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  /** A little jump (the sneeze). */
  hop(): void {
    this.scene.tweens.add({ targets: this.rig, y: -26 * profileOf(this.scene).squash, duration: 120, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Chin up: tilts -7 degrees and grows 4 % taller in 400 ms, holds, then settles (royal combo). */
  raiseChin(holdMs: number): void {
    const p = profileOf(this.scene);
    const angle = -7 * p.shake;
    this.scene.tweens.killTweensOf(this.rig);
    this.scene.tweens.chain({
      targets: this.rig,
      tweens: [
        { angle, scaleY: 1 + 0.04 * p.squash, duration: 400, ease: p.ease('Back.easeOut') },
        { angle, duration: holdMs },
        { angle: 0, scaleY: 1, duration: 300, ease: 'Sine.easeInOut' },
      ],
    });
  }

  /** Rocks from side to side (rainbow combo). */
  sway(): void {
    this.scene.tweens.killTweensOf(this.rig);
    this.rig.setAngle(0);
    if (profileOf(this.scene).shake === 0) return;
    this.scene.tweens.add({ targets: this.rig, angle: { from: -5, to: 5 }, duration: 330, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => this.rig.setAngle(0) });
  }

  /** Two heartbeats: scale 1, 1.06, 1, twice (in-love combo). */
  heartbeat(): void {
    const p = profileOf(this.scene);
    const big = 1 + 0.06 * p.squash;
    this.scene.tweens.killTweensOf(this.rig);
    this.scene.tweens.chain({
      targets: this.rig,
      tweens: [
        { scaleX: big, scaleY: big, duration: 130, ease: 'Sine.easeOut' }, { scaleX: 1, scaleY: 1, duration: 170, ease: 'Sine.easeIn' },
        { scaleX: big, scaleY: big, duration: 130, ease: 'Sine.easeOut' }, { scaleX: 1, scaleY: 1, duration: 220, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  /** Quick side to side shake (when an item is taken off). With reduced motion there is no shake: a soft tint says it instead. */
  shake(): void {
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this.rig);
    this.rig.setAngle(0);
    if (p.shake === 0) {
      this.tintPulse(0xffc2d9);
      return;
    }
    this.scene.tweens.add({ targets: this.rig, angle: { from: -4 * p.shake, to: 4 * p.shake }, duration: 55, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: () => this.rig.setAngle(0) });
  }

  /** The fur takes a tint for a moment and goes back: the calm way to say "no" or "oh" (no movement). */
  tintPulse(color: number, ms = 260): void {
    this.tintTimer?.remove();
    this.fur.setTint(color);
    this.tail.setTint(color);
    this.tintTimer = this.scene.time.delayedCall(ms, () => {
      this.fur.clearTint();
      this.tail.clearTint();
    });
  }

  /** Tail whip when an item is dropped: snaps to ±8° and settles with Back.easeOut, then sways again. */
  tailFlick(angle: number = TAIL_FLICK.angle): void {
    this.tailTween?.stop();
    const p = profileOf(this.scene);
    this.tailTween = this.scene.tweens.chain({
      targets: this.tail,
      tweens: flickSteps(angle, p.tailSwing).map((step) => ({ ...step, ease: p.ease(step.ease) })),
      // The chain is finishing: forget it before swaying again so it is not removed twice.
      onComplete: () => {
        this.tailTween = undefined;
        this.swayTail(true);
      },
    });
  }

  /** The whip of the tail when an item is dropped (12 degrees, bigger than the base flick). */
  wiggle(): void {
    this.tailFlick(TAIL_FLICK_DROP);
  }

  // ---- Petting ---------------------------------------------------------------

  /**
   * Lets the player pet the cat: a click on its body (the fur, where no garment is) or on a worn item that is not dragged
   * answers with a happy face, a small squash and a `CatPet` event (the scene adds the purr). It has a cooldown of 400 ms.
   */
  makePettable(): void {
    if (this.pettable) return;
    this.pettable = true;
    const alpha = alphaMapOf(this.scene, this.def.texture);
    const k = alpha.width / this.fur.width;
    this.fur.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, this.fur.width, this.fur.height),
      hitAreaCallback: (_area: Phaser.Geom.Rectangle, x: number, y: number) => hitsAlpha(alpha, x * k, y * k),
      useHandCursor: true,
    });
    this.fur.on('pointerdown', () => this.pet());
  }

  /** The reaction itself (also what a click on a worn item triggers). False when the cooldown has not passed. */
  pet(): boolean {
    if (!this.pettable || !this.petCooldown.try(this.scene.time.now)) return false;
    this.react('drop');
    this.squash(0.5);
    this.emit(ObjectEvents.CatPet);
    return true;
  }

  /**
   * For the souvenir photo: holds `expression`, stops the body tweens (so the cat is not caught mid-squash) and puts the
   * body, the face and the look at rest. Returns the function that lets go and brings back what was there.
   */
  freezeForPhoto(expression: Expression): () => void {
    const prev = { expression: this.expression, held: this.held };
    this.revertTimer?.remove();
    this.scene.tweens.killTweensOf([this.rig, this.face]);
    this.lookTween?.remove();
    this.faceTween?.remove();
    this.rig.setScale(1).setAngle(0).setY(0);
    this.held = true;
    this.expression = expression;
    this.face.setTexture(faceKey(expression));
    const base = this.canvasImagePosition();
    this.face.setPosition(base.x, base.y).setScale(this.canvasScale());
    return () => {
      this.held = prev.held;
      this.setExpression(prev.expression);
    };
  }

  /** Scale of a full 512 canvas image inside the cat (the display size over the texture size). */
  private canvasScale(): number {
    return this.anchors.canvas.width / this.face.width;
  }

  /** Pop-in when the cat appears: 0.8 to 1.05 to 1 in 250 ms. */
  appear(): void {
    const p = profileOf(this.scene);
    const s = this.scaleX;
    this.setScale(s * (1 - 0.2 * p.squash)).setAlpha(0);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { scaleX: s * (1 + 0.05 * p.squash), scaleY: s * (1 + 0.05 * p.squash), alpha: 1, duration: 150, ease: 'Sine.easeOut' },
        { scaleX: s, scaleY: s, duration: 100, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  // ---- Clothes -------------------------------------------------------------

  /** Worn item ids in the order they are really drawn, back to front (position in the display list, for tests). */
  getDrawOrder(): string[] {
    const at = (l: Layer) => this.breath.list.indexOf(l.image);
    return [...this.layers.values()].sort((a, b) => at(a) - at(b)).map((l) => l.item.id);
  }

  /** Worn item ids by slot (the visible layers). */
  get wornIds(): string[] {
    return [...this.layers.values()].map((l) => l.item.id);
  }

  /**
   * Renders `items` (already ordered by `getLayers`). New ones pop in; the ones that leave (or are
   * replaced in their slot) animate out before being destroyed. Nothing appears or vanishes abruptly.
   */
  setOutfit(items: readonly ClothingDef[], { stagger = false }: { stagger?: boolean } = {}): void {
    const next = new Map(items.map((i) => [i.slot, i]));
    for (const [slot, layer] of [...this.layers]) {
      if (next.get(slot as ClothingDef['slot'])?.id === layer.item.id) continue;
      this.layers.delete(slot);
      this.dismiss(layer);
    }
    // `stagger`: the new layers pop one after another (80 ms apart), back to front, as when the look arrives on another cat.
    const fresh = items.filter((item) => !this.layers.has(item.slot));
    const delays = stagger ? staggerDelays(fresh.length) : [];
    fresh.forEach((item, i) => this.layers.set(item.slot, { item, image: this.createLayer(item, delays[i] ?? 0) }));
    this.breath.sort('depth');
  }

  /** True while a layer is still popping in (for the scene's `settled`). */
  get settling(): boolean {
    return this.popping.size > 0;
  }

  private createLayer(item: ClothingDef, delay = 0): Phaser.GameObjects.Image {
    const img = this.canvasImage(item.texture).setDepth(slotZIndex(item.slot));
    const finalScale = { x: img.scaleX, y: img.scaleY };
    const p = profileOf(this.scene);
    img.setAlpha(0).setScale(finalScale.x * (1 - 0.1 * p.squash), finalScale.y * (1 - 0.1 * p.squash));
    this.breath.add(img);
    this.rockLayer(img, item);
    this.popping.add(img);
    this.scene.tweens.add({
      targets: img, alpha: 1, scaleX: finalScale.x, scaleY: finalScale.y, duration: 250, delay, ease: p.ease('Back.easeOut'),
      onComplete: () => this.popping.delete(img),
    });
    // Hit area: the visible pixels of the item (plus a small reach), so the topmost item under the pointer is the one
    // that is dragged: an accessory never hides the sweater and items outside the torso box can be grabbed.
    const alpha = alphaMapOf(this.scene, item.texture);
    const k = alpha.width / img.width;
    img.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, img.width, img.height),
      hitAreaCallback: (_area: Phaser.Geom.Rectangle, x: number, y: number) => hitsAlpha(alpha, x * k, y * k, undefined, HIT_REACH),
      draggable: true,
      useHandCursor: true,
    });
    // Hover (it teaches that worn items can be dragged off): a soft rosa-200 halo around the garment and a sparkle is asked for.
    // The fill is never tinted (the outline must stay dark and the colors flat), and the scale does not change: the hit test of
    // a thin garment must stay exactly where its pixels are. A garment that just appeared under a still pointer waits for it to move.
    this.holdHoverAt(this.scene.input?.activePointer);
    const tryHover = (pointer: Phaser.Input.Pointer) => this.tryHover(img, item, pointer);
    img.on('pointerover', tryHover);
    img.on('pointermove', tryHover);
    img.on('pointerout', () => this.clearHover(img));
    // A click that is not a drag pets the cat (the garment covers most of its body).
    let dragged = false;
    img.on('pointerdown', () => { dragged = false; });
    img.on('pointerup', () => { if (!dragged) this.pet(); });
    img.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      dragged = true;
      this.dragging = true;
      this.clearHover(img);
      this.emit(ObjectEvents.ItemDragStart, item, pointer);
    });
    img.on('drag', (pointer: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDrag, item, pointer));
    img.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.holdHoverAt(pointer);
      this.emit(ObjectEvents.ItemDragEnd, item, pointer);
    });
    return img;
  }

  /**
   * Items tagged `mece` (the balloon) rock around the point where they are tied (the paw) in idle: ±3 degrees, 1.6 s.
   * Off with reduced motion, and off in test mode: a swaying layer would move the grab points that the e2e computes from its pixels.
   */
  private rockLayer(img: Phaser.GameObjects.Image, item: ClothingDef): void {
    if (!item.tags.includes('mece') || !profileOf(this.scene).loops || isE2EEnabled()) return;
    const { width, height } = this.anchors.canvas;
    const pivot = this.anchors.anchors.paws;
    img.setOrigin(pivot.x / width, pivot.y / height).setPosition(pivot.x - width / 2, pivot.y - FEET_Y);
    this.scene.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** No hover until the pointer moves away from where it is now (a drop leaves it over the garment that just landed). */
  private holdHoverAt(pointer?: { x: number; y: number }): void {
    this.hoverHold = pointer ? { x: pointer.x, y: pointer.y } : null;
  }

  private tryHover(img: Phaser.GameObjects.Image, item: ClothingDef, pointer: Phaser.Input.Pointer): void {
    if (this.dragging || this.halos.has(img)) return;
    if (this.hoverHold) {
      if (Math.hypot(pointer.x - this.hoverHold.x, pointer.y - this.hoverHold.y) <= HOVER_MOVE_PX) return;
      this.hoverHold = null;
    }
    this.halos.set(img, item.tags.includes('mece') ? [] : this.createHalo(img, item));
    this.emit(ObjectEvents.LayerHover, item, { x: pointer.x, y: pointer.y });
  }

  /**
   * The halo of a hovered garment: eight copies of its own pixels, flat rosa-200, nudged 5 px around it and put right behind it,
   * so a soft border shows around the garment without touching its fill. They fade in. (Not for the balloon, which rocks.)
   */
  private createHalo(img: Phaser.GameObjects.Image, item: ClothingDef): Phaser.GameObjects.Image[] {
    const copies = Array.from({ length: HALO_COPIES }, (_, i) => {
      const a = (i * Math.PI * 2) / HALO_COPIES;
      return this.canvasImage(item.texture)
        .setPosition(img.x + Math.cos(a) * HALO_PX, img.y + Math.sin(a) * HALO_PX)
        .setScale(img.scaleX, img.scaleY)
        .setTint(hex('rosa200')).setTintMode(Phaser.TintModes.FILL)
        .setDepth(img.depth - 0.01).setAlpha(0);
    });
    this.breath.add(copies);
    this.breath.sort('depth');
    this.scene.tweens.add({ targets: copies, alpha: 0.9, duration: 140, ease: 'Sine.easeOut' });
    return copies;
  }

  private clearHover(img: Phaser.GameObjects.Image): void {
    const copies = this.halos.get(img);
    if (!copies) return;
    this.halos.delete(img);
    this.scene.tweens.killTweensOf(copies);
    this.scene.tweens.add({ targets: copies, alpha: 0, duration: 120, onComplete: () => copies.forEach((c) => c.destroy()) });
  }

  private dismiss(layer: Layer): void {
    const { image } = layer;
    this.clearHover(image);
    image.disableInteractive();
    this.popping.delete(image);
    this.scene.tweens.killTweensOf(image);
    this.scene.tweens.add({
      targets: image, alpha: 0, y: image.y + 24, scaleX: image.scaleX * 0.94, scaleY: image.scaleY * 0.94, duration: 220, ease: 'Quad.easeIn',
      onComplete: () => image.destroy(),
    });
  }

  /** Dims the layer of an item while it is being dragged off. */
  setLayerLifted(item: ClothingDef, lifted: boolean): void {
    const layer = this.layers.get(item.slot);
    if (!layer || layer.item.id !== item.id) return;
    this.scene.tweens.add({ targets: layer.image, alpha: lifted ? 0.3 : 1, duration: 120 });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.registry?.events.off(`changedata-${RegistryKeys.ReducedMotion}`, this.startIdle, this);
    this.blinkTimer?.remove();
    this.idleLookTimer?.remove();
    this.idleLookBack?.remove();
    this.wagTimer?.remove();
    this.glanceTimer?.remove();
    this.revertTimer?.remove();
    this.tintTimer?.remove();
    this.breathTween?.remove();
    this.tailTween?.stop();
    this.scene?.tweens.killTweensOf([this, this.rig, this.breath, this.face, this.tail, ...[...this.layers.values()].map((l) => l.image)]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
