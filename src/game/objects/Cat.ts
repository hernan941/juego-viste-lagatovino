import Phaser from 'phaser';
import { ObjectEvents } from '../constants';
import { catTailKey, faceKey } from '../data/assets';
import { reactionFor, type Expression, type ReactionEvent } from '../domain/expressions';
import { blinkCount, lookOffset, nextBlinkDelay } from '../domain/idle';
import { grabPoint, hitsAlpha } from '../domain/pixelHit';
import { slotZIndex, hitBoxForSlot, anchorForSlot } from '../domain/slots';
import { TAIL_FLICK, TAIL_IDLE, tailPivot } from '../domain/tail';
import { alphaMapOf } from './alphaMap';
import type { AnchorName, AnchorsDef, CatDef, ClothingDef, Point, Rect } from '../domain/types';

/** Y of the paws' bottom edge in the 512 canvas: the pivot for breathing and squash. */
const FEET_Y = 490;
const FACE_DEPTH = slotZIndex('neck') + 0.5;
/** Pixels (of the 192 px alpha map) around the pointer that still count as touching a worn item: thin ones stay grabbable. */
const HIT_REACH = 2;
const FACE_LOOK_PX = { x: 5, y: 3 };

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
  private readonly tail: Phaser.GameObjects.Image;
  private tailTween?: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain;
  private readonly layers = new Map<string, Layer>();
  private expression: Expression = 'normal';
  private held = false;
  private blinkTimer?: Phaser.Time.TimerEvent;
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
    const body = this.canvasImage(def.texture).setDepth(-1);
    this.face = this.canvasImage(faceKey('normal')).setDepth(FACE_DEPTH);
    this.breath.add([this.tail, body, this.face]);
    this.breath.sort('depth');

    scene.add.existing(this);
    this.startIdle();
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

  // ---- Idle: breathing, sway, blinking -----------------------------------

  private startIdle(): void {
    this.scene.tweens.add({ targets: this.breath, scaleY: { from: 0.98, to: 1.02 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.swayTail();
    this.scheduleBlink();
  }

  /** Gentle endless sway of the tail from its base: ±4° with Sine.easeInOut (TAIL_IDLE). */
  private swayTail(): void {
    this.tailTween?.remove();
    this.tail.setAngle(-TAIL_IDLE.angle);
    this.tailTween = this.scene.tweens.add({
      targets: this.tail, angle: TAIL_IDLE.angle, duration: TAIL_IDLE.duration, yoyo: true, repeat: -1, ease: TAIL_IDLE.ease,
    });
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
    this.face.setScale(base, base * 0.9);
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

  /** The face drifts 4 to 6 px toward a point (the dragged item); `null` brings it back. */
  lookAt(target: Point | null): void {
    const base = this.canvasImagePosition();
    const off = target ? lookOffset(this.canvasToWorld(this.anchors.anchors.eyes), target, FACE_LOOK_PX.x, FACE_LOOK_PX.y, 300) : { x: 0, y: 0 };
    this.lookTween?.remove();
    this.lookTween = this.scene.tweens.add({ targets: this.face, x: base.x + off.x, y: base.y + off.y, duration: 120, ease: 'Sine.easeOut' });
  }

  private canvasImagePosition(): Point {
    return { x: 0, y: this.anchors.canvas.height / 2 - FEET_Y };
  }

  // ---- Reactions of the body ---------------------------------------------

  /** Squash and stretch in 300 ms. */
  squash(): void {
    this.scene.tweens.killTweensOf(this.rig);
    this.scene.tweens.chain({
      targets: this.rig,
      tweens: [
        { scaleX: 1.14, scaleY: 0.84, duration: 90, ease: 'Quad.easeOut' },
        { scaleX: 0.95, scaleY: 1.08, duration: 110, ease: 'Quad.easeInOut' },
        { scaleX: 1, scaleY: 1, duration: 100, ease: 'Back.easeOut' },
      ],
    });
  }

  /** Quick side to side shake (when an item is taken off). */
  shake(): void {
    this.scene.tweens.killTweensOf(this.rig);
    this.rig.setAngle(0);
    this.scene.tweens.add({ targets: this.rig, angle: { from: -4, to: 4 }, duration: 55, yoyo: true, repeat: 3, ease: 'Sine.easeInOut', onComplete: () => this.rig.setAngle(0) });
  }

  /** Tail whip when an item is dropped: snaps to ±8° and settles with Back.easeOut, then sways again. */
  tailFlick(): void {
    this.tailTween?.remove();
    this.tailTween = this.scene.tweens.chain({
      targets: this.tail,
      tweens: [
        { angle: -TAIL_FLICK.angle, duration: 70, ease: 'Quad.easeOut' },
        { angle: TAIL_FLICK.angle, duration: 110, ease: 'Sine.easeInOut' },
        { angle: 0, duration: TAIL_FLICK.duration, ease: TAIL_FLICK.ease },
      ],
      // The chain is finishing: forget it before swaying again so it is not removed twice.
      onComplete: () => {
        this.tailTween = undefined;
        this.swayTail();
      },
    });
  }

  /** Kept for callers from F2 (DressUp): the wiggle is now the tail flick. */
  wiggle(): void {
    this.tailFlick();
  }

  /** Pop-in when the cat appears: 0.8 to 1.05 to 1 in 250 ms. */
  appear(): void {
    const s = this.scaleX;
    this.setScale(s * 0.8).setAlpha(0);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { scaleX: s * 1.05, scaleY: s * 1.05, alpha: 1, duration: 150, ease: 'Sine.easeOut' },
        { scaleX: s, scaleY: s, duration: 100, ease: 'Back.easeOut' },
      ],
    });
  }

  // ---- Clothes -------------------------------------------------------------

  /** Worn item ids by slot (the visible layers). */
  get wornIds(): string[] {
    return [...this.layers.values()].map((l) => l.item.id);
  }

  /**
   * Renders `items` (already ordered by `getLayers`). New ones pop in; the ones that leave (or are
   * replaced in their slot) animate out before being destroyed. Nothing appears or vanishes abruptly.
   */
  setOutfit(items: readonly ClothingDef[]): void {
    const next = new Map(items.map((i) => [i.slot, i]));
    for (const [slot, layer] of [...this.layers]) {
      if (next.get(slot as ClothingDef['slot'])?.id === layer.item.id) continue;
      this.layers.delete(slot);
      this.dismiss(layer);
    }
    for (const item of items) {
      if (this.layers.has(item.slot)) continue;
      this.layers.set(item.slot, { item, image: this.createLayer(item) });
    }
    this.breath.sort('depth');
  }

  private createLayer(item: ClothingDef): Phaser.GameObjects.Image {
    const img = this.canvasImage(item.texture).setDepth(slotZIndex(item.slot));
    const finalScale = { x: img.scaleX, y: img.scaleY };
    img.setAlpha(0).setScale(finalScale.x * 0.9, finalScale.y * 0.9);
    this.breath.add(img);
    this.scene.tweens.add({ targets: img, alpha: 1, scaleX: finalScale.x, scaleY: finalScale.y, duration: 250, ease: 'Back.easeOut' });
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
    img.on('dragstart', (pointer: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDragStart, item, pointer));
    img.on('drag', (pointer: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDrag, item, pointer));
    img.on('dragend', (pointer: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDragEnd, item, pointer));
    return img;
  }

  private dismiss(layer: Layer): void {
    const { image } = layer;
    image.disableInteractive();
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
    this.blinkTimer?.remove();
    this.revertTimer?.remove();
    this.tailTween?.remove();
    this.scene?.tweens.killTweensOf([this, this.rig, this.breath, this.face, this.tail, ...[...this.layers.values()].map((l) => l.image)]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
