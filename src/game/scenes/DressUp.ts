import Phaser from 'phaser';
import {
  CATEGORY_LABELS, GAME_HEIGHT, GAME_WIDTH, MEOW_KEYS, ObjectEvents, RegistryKeys, SceneKeys, SfxKeys, TextureKeys,
} from '../constants';
import type { Catalog } from '../data/schema';
import { DROP_BURST, petHeartSpots } from '../domain/petHearts';
import { itemsInCategory, visibleCategories } from '../domain/catalog';
import { almostCombos, almostHint, newlyCompleted, secretRewards } from '../domain/combos';
import { HintPlanner } from '../domain/hint';
import { tiltToward } from '../domain/tilt';
import { magnetSnap, resolveDrop, isInsideDropZone } from '../domain/dropZone';
import { ghostFit, alphaBounds } from '../domain/imageBounds';
import { equip, getLayers, unequip } from '../domain/outfit';
import { anchorForSlot, SLOT_ORDER } from '../domain/slots';
import type { AnchorsDef, Category, ClothingDef, ComboDef, Outfit, Point, Rect } from '../domain/types';
import type { DressUpE2EState, E2EScene, E2EUi, UiState } from '../e2eHook';
import { Button } from '../objects/Button';
import { MuteButton } from '../objects/MuteButton';
import { MotionButton } from '../objects/MotionButton';
import { FullscreenButton } from '../objects/FullscreenButton';
import { getAudio } from '../plugins/AudioPlugin';
import { getSave } from '../plugins/SavePlugin';
import { go } from '../systems/navigate';
import { readSession } from '../systems/sessionStore';
import { Cat } from '../objects/Cat';
import { opaqueBounds } from '../objects/alphaMap';
import { playComboReaction, playShortReaction, showBubble, type ComboFxContext } from '../objects/comboFx';
import { NameSign } from '../objects/NameSign';
import { GiftReveal } from '../domain/giftReveal';
import { GiftBox } from '../objects/GiftBox';
import { SecretCounter } from '../objects/SecretCounter';
import type { ClothingItem } from '../objects/ClothingItem';
import { ItemGrid } from '../objects/ItemGrid';
import { LayersPanel } from '../objects/LayersPanel';
import { Tabs } from '../objects/Tabs';
import { tabIconKey } from '../objects/tabIcons';
import { drawRoom } from '../objects/room';
import { drawPanel, hex, liftFor, makeText, touchEnv } from '../objects/ui';
import { profileOf } from '../systems/motion';
import { applyLift, dragThreshold, isDragPointer } from '../systems/touch';
import { enterKind, transitionIn } from '../systems/transitions';

const CAT_X = 700;
const CAT_FEET_Y = 612;
const CAT_SIZE = 540;
/** Forgiving margin around the cat's drop zone and magnet radius, in game px (ADR 0008). */
const DROP_MARGIN = 36;
const MAGNET_RADIUS = 110;
/** Longest side of the dragged item, and of the one that flies back to its cell, in game px. */
const GHOST_SIZE = 150;
const GHOST_HOME_SIZE = 90;
/** Left panel: tabs, then the scrollable grid, then the hint (game px). */
const PANEL = { x: 36, y: 36, width: 404, height: 648 };
const GRID = { x: 62, y: 164, width: 368 - 12, height: 464 };

interface DragState {
  item: ClothingDef;
  fromEquipped: boolean;
  cell?: ClothingItem;
  ghost: Phaser.GameObjects.Image;
  /** Scale of the ghost in the hand, and scale it has when it flies back home. */
  ghostScale: number;
  homeScale: number;
  /** Half transparent preview of the item worn by the cat while the magnet holds it. */
  preview?: Phaser.GameObjects.Image;
  target: Point;
  /** The pointer that grabbed the item (a second finger is ignored) and how far above it the item is held (touch only). */
  pointerId: number;
  lift: Point;
  /** Where the item is held now (the pointer plus the lift): what the drop zone and the magnet look at. */
  held: Point;
  overZone: boolean;
  lastLook: number;
  /** True during the first 150 ms (the grab tween owns the angle); afterwards the tilt follows the speed. */
  grabbing: boolean;
}

/** The fitting room (F2 vertical slice): one cat, two tabs, a grid, the mirror and the layers panel. */
export class DressUp extends Phaser.Scene implements E2EScene, E2EUi {
  private catalog!: Catalog;
  private anchors!: AnchorsDef;
  private outfit: Outfit = {};
  private cat!: Cat;
  private grid!: ItemGrid;
  private tabs!: Tabs;
  private layersPanel!: LayersPanel;
  private zoneGlow!: Phaser.GameObjects.Graphics;
  private hint!: Phaser.GameObjects.Text;
  private readonly itemBounds = new Map<string, Rect | null>();
  private hearts!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private drag: DragState | null = null;
  private catId = '';
  private catName = '';
  private baseCatScale = 1;
  private doneButton!: Button;
  private changeButton!: Button;
  private mute!: MuteButton;
  private motion!: MotionButton;
  private fullscreen: FullscreenButton | null = null;
  private leaving = false;
  private lastDragSound = 0;
  // F8: secrets and gifts.
  private unlocked: string[] = [];
  private gifts: ComboDef[] = [];
  private gift: GiftBox | null = null;
  /** Gift boxes whose arrival is already scheduled (after the reaction). */
  private giftsComing = 0;
  private counter!: SecretCounter;
  private rainbow!: Phaser.GameObjects.Graphics;
  private almost = new Set<string>();
  private reveal = new GiftReveal();
  private sign!: NameSign;
  // F9: first-use hint (a ghost garment travels to the cat) and the little dot where the magnet holds the item.
  private hintPlanner = new HintPlanner();
  private hintGhost: Phaser.GameObjects.Image | null = null;
  private hintsShown = 0;
  private pets = 0;
  private anchorDot: Phaser.GameObjects.Graphics | null = null;
  private lookTimer?: Phaser.Time.TimerEvent;
  /** Reactions played in this visit, newest last (for the e2e hook). */
  private reactionLog: string[] = [];
  /** Sum of the frame deltas (what timers and tweens count), for the e2e hook. */
  private deltaTotal = 0;
  /** Test hook: the prize and counter state at each step of the gift sequence. */
  private secretTrace: { revealing: string[]; count: number; text: string }[] = [];

  constructor() {
    super(SceneKeys.DressUp);
  }

  init(data?: { catId?: string }) {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    this.anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const session = readSession(this.registry);
    // The outfit comes back from the Showcase, and it also follows the player to another cat (chooseCat keeps it).
    this.outfit = session.outfit;
    this.drag = null;
    this.leaving = false;
    this.hintPlanner = new HintPlanner();
    // Already dressed (a look that came along): the player knows what to do.
    if (Object.keys(this.outfit).length > 0) this.hintPlanner.dropped();
    this.hintGhost = null;
    this.hintsShown = 0;
    this.pets = 0;
    this.anchorDot = null;
    this.unlocked = getSave(this).secrets;
    this.gifts = [];
    this.reveal = new GiftReveal();
    this.giftsComing = 0;
    this.gift = null;
    this.almost = new Set();
    this.reactionLog = [];
    this.secretTrace = [];
    const wanted = session.catId ?? data?.catId;
    const cat = this.catalog.cats.find((c) => c.id === wanted) ?? this.catalog.cats[0];
    this.catId = cat.id;
    this.catName = session.catName || cat.name;
  }

  create(data?: unknown) {
    // A finger jitters more than a mouse (ADR 0014): the press becomes a drag after ~10 CSS px.
    const env = touchEnv();
    this.input.dragDistanceThreshold = dragThreshold(env.touch, env.scale);
    drawRoom(this, CAT_X, CAT_FEET_Y);
    this.zoneGlow = this.add.graphics().setAlpha(0);
    this.rainbow = this.add.graphics();

    const def = this.catalog.cats.find((c) => c.id === this.catId)!;
    this.cat = new Cat(this, CAT_X, CAT_FEET_Y, def, this.anchors, CAT_SIZE);
    this.baseCatScale = this.cat.scaleX;
    this.cat.appear();
    this.cat.on(ObjectEvents.ItemDragStart, (item: ClothingDef, p: Phaser.Input.Pointer) => this.beginDrag(item, p, true));
    this.cat.makePettable();
    this.cat.on(ObjectEvents.CatPet, () => this.onPet());
    this.cat.on(ObjectEvents.LayerHover, (_item: ClothingDef, at: Point) => this.sparkles.explode(profileOf(this).count(1), at.x, at.y));
    this.cat.on(ObjectEvents.ItemDrag, (_item: ClothingDef, p: Phaser.Input.Pointer) => this.moveDrag(p));
    this.cat.on(ObjectEvents.ItemDragEnd, (_item: ClothingDef, p: Phaser.Input.Pointer) => this.endDrag(p));

    // Left panel: tabs and grid.
    const panel = this.add.graphics().setPosition(PANEL.x, PANEL.y);
    drawPanel(panel, PANEL.width, PANEL.height);
    const categories = visibleCategories(this.catalog.clothes);
    const tabsWidth = categories.length * 54 + (categories.length - 1) * 10;
    this.tabs = new Tabs(this, PANEL.x + (PANEL.width - tabsWidth) / 2, 58, categories.map((id) => ({ id, label: CATEGORY_LABELS[id], icon: tabIconKey(id) })));
    this.grid = new ItemGrid(this, GRID.x, GRID.y, GRID.width, GRID.height);
    this.grid.on(ObjectEvents.ItemDragStart, (c: ClothingItem, p: Phaser.Input.Pointer) => this.beginDrag(c.item, p, false, c));
    this.grid.on(ObjectEvents.ItemDrag, (_c: ClothingItem, p: Phaser.Input.Pointer) => this.moveDrag(p));
    this.grid.on(ObjectEvents.ItemDragEnd, (_c: ClothingItem, p: Phaser.Input.Pointer) => this.endDrag(p));
    this.grid.on(ObjectEvents.ItemClick, () => this.pulseHint());
    this.tabs.on(ObjectEvents.TabSelect, (id: Category) => this.showCategory(id));
    this.hint = makeText(this, PANEL.x + PANEL.width / 2, 658, 'Arrastra la ropa al gatito', 20).setAlpha(0.7);

    // Right panel: layers.
    this.layersPanel = new LayersPanel(this, 968, 60);
    this.layersPanel.on(ObjectEvents.LayerRemove, (item: ClothingDef) => this.removeItem(item));

    this.hearts = this.add
      .particles(0, 0, TextureKeys.Heart, {
        emitting: false, speed: { min: 80, max: 200 }, angle: { min: -120, max: -60 }, gravityY: -40,
        lifespan: { min: 900, max: 1400 }, scale: { start: 1.4, end: 0.3 }, alpha: { start: 1, end: 0 }, rotate: { min: -40 * profileOf(this).spin, max: 40 * profileOf(this).spin },
      })
      .setDepth(4000);
    this.sparkles = this.add
      .particles(0, 0, TextureKeys.Sparkle, {
        emitting: false, speed: { min: 60, max: 240 }, angle: { min: 0, max: 360 }, gravityY: 80,
        lifespan: { min: 500, max: 900 }, scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 },
      })
      .setDepth(4000);

    this.createNameSign();
    this.counter = new SecretCounter(this, 1093, 34).setDepth(31);
    this.counter.setCount(this.unlocked.length, this.catalog.combos.length);
    this.doneButton = new Button(this, 1093, 568, '¡Listo!', { width: 250, height: 88, fontSize: 42 });
    this.doneButton.on(ObjectEvents.ButtonClick, () => this.leave('finish'));
    this.changeButton = new Button(this, 1093, 652, 'Cambiar de gato', { width: 220, height: 62, fontSize: 24, tone: 'lavanda' });
    this.changeButton.on(ObjectEvents.ButtonClick, () => this.leave('change'));
    this.mute = new MuteButton(this, 1240, 686).setScale(0.8);
    this.motion = new MotionButton(this, 1240, 636).setScale(0.8);
    this.fullscreen = FullscreenButton.create(this, 1244, 36);
    this.fullscreen?.setScale(0.8);

    // The prizes shine: every 2.5 s, a golden twinkle on each secret garment that is worn.
    this.time.addEvent({ delay: 2500, loop: true, callback: () => this.twinkleSecrets() });
    this.tabs.select(categories[0], true);
    this.showCategory(categories[0]);
    if (Object.keys(this.outfit).length > 0) {
      // The look arrives with a pop, one layer after another, and the cat is happy about it.
      this.applyOutfit(this.outfit, true);
      this.cat.react('drop');
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    transitionIn(this, enterKind(data));
  }

  update(_time: number, delta: number) {
    this.deltaTotal += delta;
    const d = this.drag;
    if (d) {
      // The dragged item eases toward the pointer (or the magnet anchor), so it feels soft.
      const before = d.ghost.x;
      d.ghost.x += (d.target.x - d.ghost.x) * 0.4;
      d.ghost.y += (d.target.y - d.ghost.y) * 0.4;
      // ... and leans with its speed, like cloth (a lerp that does not depend on the fps; reduced motion keeps it straight).
      if (!d.grabbing) d.ghost.angle = tiltToward(d.ghost.angle, d.ghost.x - before, delta, profileOf(this).shake);
    }
    // First-use hint: after 4 s without a drop (and every 5 s) a ghost garment travels from the grid to the cat.
    const busy = this.drag !== null || this.leaving || this.gift !== null || this.giftsComing > 0 || this.gifts.length > 0 || this.hintGhost !== null;
    if (this.hintPlanner.update(delta, busy)) this.playHint();
  }

  /** The hint: the first visible cell's garment, at half opacity, travels along a curve to where it would be worn. */
  private playHint() {
    const visible = this.grid.getVisibleIds();
    const id = visible[0];
    const item = id ? this.catalog.clothes.find((c) => c.id === id) : undefined;
    const from = id ? this.grid.getCellPositions()[id] : undefined;
    if (!item || !from) return;
    this.hintsShown++;
    const to = this.cat.getAnchorWorld(anchorForSlot(item.slot));
    const src = this.textures.get(item.texture).getSourceImage();
    const fit = ghostFit(this.boundsOf(item), src.width, src.height, GHOST_SIZE);
    const home = ghostFit(this.boundsOf(item), src.width, src.height, GHOST_HOME_SIZE);
    const ghost = this.add.image(from.x, from.y, item.texture).setOrigin(fit.origin.x, fit.origin.y).setScale(home.scale).setDepth(4900).setAlpha(0);
    this.hintGhost = ghost;
    const p = profileOf(this);
    // A curve that bows up and away from the straight line; reduced motion goes straight and calm.
    const bend = p.reduced ? 0 : -90;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2((from.x + to.x) / 2, Math.min(from.y, to.y) + bend), new Phaser.Math.Vector2(to.x, to.y),
    );
    const t = { v: 0 };
    const gone = () => {
      ghost.destroy();
      if (this.hintGhost === ghost) this.hintGhost = null;
    };
    this.tweens.add({ targets: ghost, alpha: 0.5, duration: 250 });
    this.tweens.add({
      targets: t, v: 1, duration: 1300, delay: 150, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const pt = curve.getPoint(t.v);
        ghost.setPosition(pt.x, pt.y).setScale(home.scale + (fit.scale - home.scale) * t.v);
      },
      onComplete: () => {
        this.tweens.add({ targets: ghost, alpha: 0, duration: 250, onComplete: gone });
      },
    });
  }

  /** Hanging sign with the name of the cat, over the mirror (it flips to announce looks and prizes). */
  private createNameSign() {
    const sign = new NameSign(this, CAT_X, -60, this.catName).setDepth(30);
    this.sign = sign;
    this.tweens.add({ targets: sign, y: 92, duration: 500, delay: 250, ease: profileOf(this).ease('Back.easeOut') });
    if (profileOf(this).loops) this.tweens.add({ targets: sign, angle: { from: -1.5, to: 1.5 }, duration: 1800, delay: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private leave(action: 'finish' | 'change') {
    if (this.leaving) return;
    this.leaving = true;
    if (this.drag) this.endDragQuiet();
    // A gift that was never opened is not lost: the player earned it, so it goes to the wardrobe quietly.
    const gifted = [...(this.gift ? [this.gift.comboId] : []), ...this.gifts.map((c) => c.id)];
    for (const combo of gifted) getSave(this).unlockSecret(combo);
    // The Showcase tells the player about the prizes that were delivered quietly.
    go(this, action, { gifted });
  }

  /** Lets go of an item that is still in the hand if the player leaves. */
  private endDragQuiet() {
    this.drag?.ghost.destroy();
    this.drag?.preview?.destroy();
    this.drag = null;
  }

  private cleanup() {
    this.drag = null;
    this.hintGhost?.destroy();
    this.hintGhost = null;
    this.anchorDot?.destroy();
    this.anchorDot = null;
    this.lookTimer?.remove();
    this.doneButton?.destroy();
    this.changeButton?.destroy();
    this.mute?.destroy();
    this.motion?.destroy();
    this.fullscreen?.destroy();
    this.tweens.killAll();
    this.gift?.destroy();
    this.gift = null;
    this.counter?.destroy();
    this.sign?.destroy();
    this.cat?.destroy();
    this.grid?.destroy();
    this.tabs?.destroy();
    this.layersPanel?.destroy();
  }

  private showCategory(category: Category) {
    this.grid.setItems(itemsInCategory(this.catalog.clothes, category, secretRewards(this.unlocked, this.catalog.combos)));
    // A prize still on its way is not in its cell yet: the cell appears (with a pop) when the prize lands.
    for (const id of this.reveal.hiddenItems()) this.grid.getCell(id)?.setVisible(false);
  }

  // ---- Drag and drop (ADR 0008) --------------------------------------------

  private dropZone(): Rect {
    const z = this.cat.getDropZoneRect();
    return { x: z.x, y: z.y, width: z.width, height: z.height };
  }

  /** Bounding box of the visible pixels of an item texture (cached), in texture px. */
  private boundsOf(item: ClothingDef): Rect | null {
    if (this.itemBounds.has(item.id)) return this.itemBounds.get(item.id)!;
    const src = this.textures.get(item.texture).getSourceImage() as HTMLImageElement;
    const side = 192;
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let bounds: Rect | null = null;
    if (ctx) {
      ctx.drawImage(src, 0, 0, side, side);
      const found = alphaBounds(ctx.getImageData(0, 0, side, side).data, side, side);
      const k = src.width / side;
      bounds = found && { x: found.x * k, y: found.y * k, width: found.width * k, height: found.height * k };
    }
    this.itemBounds.set(item.id, bounds);
    return bounds;
  }

  private beginDrag(item: ClothingDef, pointer: Phaser.Input.Pointer, fromEquipped: boolean, cell?: ClothingItem) {
    if (this.drag) return;
    // The ghost is the item itself (no cell card), centered on its own visible bounds, so it never hides the cat's face.
    const src = this.textures.get(item.texture).getSourceImage();
    const bounds = this.boundsOf(item);
    const fit = ghostFit(bounds, src.width, src.height, GHOST_SIZE);
    const home = ghostFit(bounds, src.width, src.height, GHOST_HOME_SIZE);
    // With a finger the item is held above it so the finger does not cover it (ADR 0014); it starts under the finger and floats up.
    const lift = liftFor(pointer);
    const held = applyLift(pointer, lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    const ghost = this.add.image(pointer.x, pointer.y, item.texture).setOrigin(fit.origin.x, fit.origin.y).setScale(fit.scale).setDepth(5000);
    // Taking an item: it grows and tilts.
    const p = profileOf(this);
    this.tweens.add({
      targets: ghost, scale: fit.scale * (1 + 0.15 * p.squash), angle: 8 * p.shake, duration: 150, ease: p.ease('Back.easeOut'),
      onComplete: () => { if (this.drag?.ghost === ghost) this.drag.grabbing = false; },
    });
    this.drag = { item, fromEquipped, cell, ghost, ghostScale: fit.scale * (1 + 0.15 * p.squash), homeScale: home.scale, target: held, pointerId: pointer.id, lift, held, overZone: false, lastLook: 0, grabbing: true };
    getAudio(this).play(SfxKeys.Grab);
    cell?.setLifted(true);
    if (fromEquipped) this.cat.setLayerLifted(item, true);
    // The cat only looks at the item (normal eyes that follow it); it is surprised once the item is over the drop zone.
    this.cat.lookAt(held);
  }

  private moveDrag(pointer: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d || !isDragPointer(d.pointerId, pointer.id)) return;
    const point = applyLift(pointer, d.lift, { width: GAME_WIDTH, height: GAME_HEIGHT });
    d.held = point;
    const over = isInsideDropZone(point, this.dropZone(), DROP_MARGIN);
    // Magnet: near the slot anchor the item settles onto it.
    const snap = over ? magnetSnap(point, this.cat.getAnchorWorld(anchorForSlot(d.item.slot)), MAGNET_RADIUS) : { point, snapped: false };
    d.target = snap.point;
    // A barely-there whisper while it moves, at most every 160 ms.
    if (this.time.now - this.lastDragSound > 160) {
      this.lastDragSound = this.time.now;
      getAudio(this).play(SfxKeys.Drag, { volume: 0.4 });
    }
    this.setPreview(d, snap.snapped && !d.fromEquipped);
    if (over !== d.overZone) {
      d.overZone = over;
      this.setZoneHighlight(over);
      // "She is going to get it!": surprise only over the zone (a micro tween comes with the face swap).
      if (over) this.cat.hold('sorpresa');
      else this.cat.release();
    }
    if (this.time.now - d.lastLook > 90) {
      d.lastLook = this.time.now;
      this.cat.lookAt(point);
    }
  }

  /**
   * While the magnet holds the item: only the half transparent preview on the cat is seen (the ghost steps aside, so there is
   * no double image) and it breathes; a small ring marks the anchor. Letting go of the magnet brings the ghost back.
   */
  private setPreview(d: DragState, on: boolean) {
    if (on === (d.preview !== undefined)) return;
    const p = profileOf(this);
    this.tweens.killTweensOf(d.ghost);
    if (on) {
      this.tweens.add({ targets: d.ghost, alpha: 0, scale: d.ghostScale * 0.8, duration: 100 });
      const c = this.cat.canvasToWorld({ x: this.anchors.canvas.width / 2, y: this.anchors.canvas.height / 2 });
      const size = this.anchors.canvas.width * this.baseCatScale;
      const preview = this.add.image(c.x, c.y, d.item.texture).setDisplaySize(size, size).setDepth(4500).setAlpha(0);
      d.preview = preview;
      this.tweens.add({
        targets: preview, alpha: 0.5, duration: 100,
        onComplete: () => {
          // The preview breathes (0.45 to 0.6); reduced motion keeps it still.
          if (p.loops && d.preview === preview) this.tweens.add({ targets: preview, alpha: { from: 0.45, to: 0.6 }, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
      this.showAnchorDot(this.cat.getAnchorWorld(anchorForSlot(d.item.slot)));
    } else {
      this.tweens.add({ targets: d.ghost, alpha: 1, scale: d.ghostScale, duration: 200, ease: p.ease('Back.easeOut') });
      this.fadePreview(d);
      this.hideAnchorDot();
    }
  }

  /** A small ring where the magnet holds the item (the slot anchor). */
  private showAnchorDot(at: Point) {
    this.hideAnchorDot();
    const dot = this.add.graphics().setDepth(4600).setPosition(at.x, at.y);
    dot.lineStyle(5, hex('rosa400'), 1).strokeCircle(0, 0, 16);
    dot.fillStyle(hex('rosa400'), 0.35).fillCircle(0, 0, 16);
    dot.setScale(profileOf(this).reduced ? 1 : 0.2).setAlpha(0);
    this.anchorDot = dot;
    this.tweens.add({ targets: dot, scale: 1, alpha: 1, duration: 140, ease: profileOf(this).ease('Back.easeOut') });
  }

  private hideAnchorDot() {
    const dot = this.anchorDot;
    this.anchorDot = null;
    if (!dot) return;
    this.tweens.killTweensOf(dot);
    this.tweens.add({ targets: dot, alpha: 0, duration: 100, onComplete: () => dot.destroy() });
  }

  private fadePreview(d: DragState) {
    const preview = d.preview;
    d.preview = undefined;
    if (!preview) return;
    this.tweens.killTweensOf(preview);
    this.tweens.add({ targets: preview, alpha: 0, duration: 100, onComplete: () => preview.destroy() });
  }

  /** On drop the preview becomes solid with a little pop, and leaves once the real layer has popped in. */
  private settlePreview(d: DragState) {
    const preview = d.preview;
    d.preview = undefined;
    if (!preview) return;
    this.tweens.killTweensOf(preview);
    const s = preview.scaleX;
    this.tweens.chain({
      targets: preview,
      tweens: [
        { alpha: 1, scaleX: s * 1.04, scaleY: s * 1.04, duration: 100, ease: 'Sine.easeOut' },
        { scaleX: s, scaleY: s, duration: 160, ease: profileOf(this).ease('Back.easeOut') },
      ],
      onComplete: () => preview.destroy(),
    });
  }

  private setZoneHighlight(on: boolean) {
    const z = this.dropZone();
    this.zoneGlow.clear();
    this.zoneGlow.fillStyle(hex('rosa400'), 0.14).fillRoundedRect(z.x - 8, z.y - 8, z.width + 16, z.height + 16, 48);
    this.zoneGlow.lineStyle(6, hex('rosa400'), 0.9).strokeRoundedRect(z.x - 8, z.y - 8, z.width + 16, z.height + 16, 48);
    this.tweens.killTweensOf(this.zoneGlow);
    this.tweens.add({
      targets: this.zoneGlow, alpha: on ? 1 : 0, duration: 140,
      // The zone that waits for the item beats softly (0.7 to 1, 600 ms); reduced motion keeps it still.
      onComplete: () => {
        if (on && profileOf(this).loops && this.drag?.overZone) this.tweens.add({ targets: this.zoneGlow, alpha: { from: 1, to: 0.7 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
  }

  private endDrag(pointer: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d || !isDragPointer(d.pointerId, pointer.id)) return;
    this.drag = null;
    this.setZoneHighlight(false);
    this.hideAnchorDot();
    this.cat.lookAt(null);
    const action = resolveDrop(applyLift(pointer, d.lift, { width: GAME_WIDTH, height: GAME_HEIGHT }), this.dropZone(), DROP_MARGIN, d.fromEquipped);
    if (action === 'equip') this.dropOnCat(d);
    else if (action === 'unequip') this.takeOff(d);
    else this.sendBack(d);
  }

  private dropOnCat(d: DragState) {
    const { item, ghost, cell, fromEquipped } = d;
    const anchor = this.cat.getAnchorWorld(anchorForSlot(item.slot));
    this.tweens.killTweensOf(ghost);
    this.tweens.add({ targets: ghost, x: anchor.x, y: anchor.y, scale: ghost.scale * 0.5, alpha: 0, angle: 0, duration: 160, ease: 'Quad.easeIn', onComplete: () => ghost.destroy() });
    this.settlePreview(d);
    cell?.setLifted(false);
    getAudio(this).play(SfxKeys.Drop);
    if (fromEquipped) {
      // Dropped back on the cat: nothing changes, the item just settles again.
      this.cat.setLayerLifted(item, false);
      this.cat.release();
      this.cat.squash();
      return;
    }
    const previous = this.outfit;
    this.hintPlanner.dropped();
    this.applyOutfit(equip(previous, item).outfit);
    const done = newlyCompleted(previous, this.outfit, this.catalog.combos, this.catalog.clothes);
    const combo = done.length > 0;
    if (!combo) this.cat.react('drop');
    this.time.delayedCall(90, () => getAudio(this).play(SfxKeys.Purr));
    if (combo || Math.random() < 0.25) this.time.delayedCall(250, () => getAudio(this).playRandom(MEOW_KEYS));
    this.cat.squash();
    this.cat.wiggle();
    this.celebrate(anchor, combo ? 2 : 1);
    for (const c of done) this.onCombo(c);
    this.updateAlmost();
  }

  /** A `mantequilla` sparkle at a random point of every worn secret item (the six prizes should feel special). */
  private twinkleSecrets() {
    if (this.leaving) return;
    for (const layer of getLayers(this.outfit, this.catalog.clothes)) {
      if (!layer.secret) continue;
      const b = opaqueBounds(this, layer.texture);
      if (!b) continue;
      const { width, height } = this.anchors.canvas;
      const at = this.cat.canvasToWorld({ x: (b.x + Math.random() * b.width) * width, y: (b.y + Math.random() * b.height) * height });
      this.sparkles.explode(profileOf(this).count(1), at.x, at.y);
    }
  }

  /** The cat was petted: a purr, and a couple of hearts floating up from its head. */
  private onPet() {
    this.pets++;
    getAudio(this).play(SfxKeys.Purr, { volume: 0.7 });
    const head = this.cat.getAnchorWorld('head');
    // To the sides of the head: straight up they climbed to the name sign and covered it.
    for (const spot of petHeartSpots(head, profileOf(this).count(4))) this.hearts.explode(1, spot.x, spot.y);
  }

  // ---- Combos, gifts and secrets (F8) ---------------------------------------

  private fx(): ComboFxContext {
    return { scene: this, cat: this.cat, rainbow: this.rainbow, hearts: this.hearts, sign: this.sign };
  }

  /** A combo was completed: its own reaction, and a gift if the prize is still locked. */
  private onCombo(combo: ComboDef) {
    this.reactionLog.push(combo.reaction);
    if (this.unlocked.includes(combo.id) || this.gifts.some((g) => g.id === combo.id) || this.gift?.comboId === combo.id) {
      playShortReaction(this.fx(), combo);
      return;
    }
    playComboReaction(this.fx(), combo);
    this.gifts.push(combo);
    this.giftsComing++;
    this.time.delayedCall(1300, () => {
      this.giftsComing--;
      this.nextGift();
    });
  }

  /** Brings the next gift box, one at a time. */
  private nextGift() {
    if (this.gift || this.leaving || this.gifts.length === 0) return;
    const combo = this.gifts.shift()!;
    const item = this.catalog.clothes.find((c) => c.id === combo.rewardItemId);
    if (!item) return;
    const box = new GiftBox(this, 570, 530, combo.id, item);
    this.gift = box;
    box.on(ObjectEvents.GiftOpened, (_b: GiftBox, prize: Phaser.GameObjects.Image) => this.onGiftOpened(combo, item, prize));
  }

  /** The prize is out: it is saved at once, but the cell and the counter only react when it lands. */
  private onGiftOpened(combo: ComboDef, item: ClothingDef, prize: Phaser.GameObjects.Image) {
    this.gift = null;
    getSave(this).unlockSecret(combo.id);
    this.unlocked = getSave(this).secrets;
    this.reveal.begin(combo.id, item.id);
    this.traceSecrets();
    this.sign.announce(`¡${item.name}!`);
    // Show the tab of the prize so the cell is there (invisible) when it lands.
    this.tabs.select(item.category, true);
    this.showCategory(item.category);
    this.grid.setWorn(new Set(Object.values(this.outfit)));
    const home = this.grid.getCellPositions()[item.id];
    const finish = () => {
      prize.destroy();
      this.reveal.land(combo.id);
      const cell = this.grid.getCell(item.id);
      cell?.revealPop();
      this.time.delayedCall(380, () => cell?.active && cell.celebrate());
      this.counter.setCount(this.reveal.shownCount(this.unlocked), this.catalog.combos.length, true);
      this.traceSecrets();
      if (home) this.sparkles.explode(profileOf(this).count(14), home.x, home.y);
      getAudio(this).play(SfxKeys.Return, { rate: 1.3 });
      this.time.delayedCall(250, () => this.nextGift());
    };
    this.tweens.add({
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
  private updateAlmost() {
    const now = new Set(almostCombos(this.outfit, this.catalog.combos, this.catalog.clothes, this.unlocked).map((c) => c.id));
    const fresh = [...now].some((id) => !this.almost.has(id));
    this.almost = now;
    if (!fresh) return;
    const head = this.cat.getAnchorWorld('head');
    this.sparkles.explode(profileOf(this).count(6), head.x + 90, head.y - 30);
    showBubble(this, head.x + 160, head.y + 10, '¡Casi...!', 'rosa50', { fontSize: 26, tail: 'left' });
    const hint = almostHint(this.outfit, this.catalog.combos, this.catalog.clothes, this.unlocked);
    const tab = hint && this.tabs.getTabPositions()[hint.category];
    if (tab && !this.drag) {
      this.cat.lookAt(tab);
      this.lookTimer?.remove();
      this.lookTimer = this.time.delayedCall(600, () => !this.drag && this.cat.lookAt(null));
    }
  }

  private takeOff(d: DragState) {
    this.applyOutfit(unequip(this.outfit, d.item.slot));
    getAudio(this).play(SfxKeys.Remove);
    this.cat.react('remove');
    this.cat.shake();
    this.returnGhost(d);
    this.updateAlmost();
  }

  private sendBack(d: DragState) {
    this.fadePreview(d);
    this.cat.release();
    this.returnGhost(d);
  }

  /** Item that was let go outside the cat: back to its cell with a bounce (250 ms, Back.easeOut). */
  private returnGhost({ ghost, item, cell, homeScale }: DragState) {
    const home = this.grid.getCellPositions()[item.id];
    getAudio(this).play(SfxKeys.Return);
    this.tweens.killTweensOf(ghost);
    ghost.setAlpha(1);
    const done = () => {
      ghost.destroy();
      const target = cell ?? this.grid.getCell(item.id);
      target?.setLifted(false);
      // The cell pops as it gets the garment back, and the cat watched it go ("no?").
      target?.receivePop();
      this.cat.lookAt(null);
    };
    if (home) this.cat.lookAt(home);
    if (home) {
      this.tweens.add({ targets: ghost, x: home.x, y: home.y, scale: homeScale, angle: 0, duration: 250, ease: profileOf(this).ease('Back.easeOut'), onComplete: done });
    } else {
      this.tweens.add({ targets: ghost, alpha: 0, scale: ghost.scale * 0.6, duration: 200, onComplete: done });
    }
  }

  /** A click on a cell answers with a pulse of the hint: dragging is the only way to wear things (ADR 0008). */
  private pulseHint() {
    getAudio(this).play(SfxKeys.Click, { volume: 0.7 });
    this.tweens.killTweensOf(this.hint);
    this.hint.setScale(1).setAlpha(1);
    this.tweens.chain({
      targets: this.hint,
      tweens: [
        { scale: 1 + 0.15 * profileOf(this).squash, duration: 110, ease: 'Sine.easeOut' },
        { scale: 1, duration: 220, ease: profileOf(this).ease('Back.easeOut') },
        { alpha: 0.7, duration: 500 },
      ],
    });
  }

  private removeItem(item: ClothingDef) {
    if (this.outfit[item.slot] !== item.id) return;
    this.applyOutfit(unequip(this.outfit, item.slot));
    getAudio(this).play(SfxKeys.Remove);
    this.cat.react('remove');
    this.cat.shake();
    this.updateAlmost();
  }

  private applyOutfit(next: Outfit, stagger = false) {
    this.outfit = next;
    this.registry.set(RegistryKeys.Outfit, next);
    const layers = getLayers(next, this.catalog.clothes);
    this.cat.setOutfit(layers, { stagger });
    this.layersPanel.setLayers(layers);
    this.grid.setWorn(new Set(Object.values(next)));
  }

  /** A ring that "pops" at the anchor (scale 0 to 1.4, alpha 1 to 0, 180 ms); reduced motion only fades it. */
  private popRing(at: Point, power: number) {
    const ring = this.add.graphics().setDepth(3990).setPosition(at.x, at.y);
    ring.lineStyle(7, hex('rosa400'), 1).strokeCircle(0, 0, 46 * (power > 1 ? 1.3 : 1));
    const calm = profileOf(this).reduced;
    ring.setScale(calm ? 1 : 0);
    this.tweens.add({ targets: ring, scale: calm ? 1 : 1.4, alpha: 0, duration: 180, ease: 'Sine.easeOut', onComplete: () => ring.destroy() });
  }

  /** Hearts and sparkles where the item lands; combos get a bigger burst. */
  private celebrate(at: Point, power: number) {
    const p = profileOf(this);
    this.hearts.explode(p.count(DROP_BURST.hearts * power), at.x, at.y);
    this.sparkles.explode(p.count(DROP_BURST.sparkles * power), at.x, at.y);
    this.popRing(at, power);
  }

  // ---- Test hook (ADR 0012) --------------------------------------------------

  private traceSecrets() {
    this.secretTrace.push({ revealing: this.reveal.hiddenItems(), count: this.reveal.shownCount(this.unlocked), text: this.counter.text });
  }

  getE2EUi(): UiState {
    return {
      ready: this.cat.alpha > 0.99 && !this.leaving,
      buttons: { finish: this.doneButton.getCenter(), change: this.changeButton.getCenter(), mute: this.mute.getCenter(), motion: this.motion.getCenter(), ...(this.fullscreen ? { fullscreen: this.fullscreen.getCenter() } : {}) },
      points: {},
      info: { catName: this.catName },
    };
  }

  /** Test mode only: dresses the cat with these items at once (no drag, no reaction), to save time before the real drop. */
  e2eWear(ids: string[]): void {
    let next: Outfit = {};
    for (const id of ids) {
      const item = this.catalog.clothes.find((c) => c.id === id);
      if (item) next = equip(next, item).outfit;
    }
    this.applyOutfit(next);
    this.almost = new Set(almostCombos(next, this.catalog.combos, this.catalog.clothes, this.unlocked).map((c) => c.id));
  }

  getE2EState(): DressUpE2EState {
    const z = this.dropZone();
    const layers = getLayers(this.outfit, this.catalog.clothes);
    const cells = this.grid.getCellPositions();
    const cellsSettled = Object.keys(cells).every((id) => {
      const c = this.grid.getCell(id);
      return !!c && c.alpha > 0.99 && Math.abs(c.scale - 1) < 0.01;
    });
    const viewport = this.grid.getViewport();
    return {
      catId: this.catId,
      catName: this.catName,
      tailAngle: this.cat.tailAngle,
      activeTab: this.tabs.selectedId,
      visibleCells: this.grid.getVisibleIds(),
      grid: viewport,
      catIds: this.catalog.cats.map((c) => c.id),
      outfit: { ...this.outfit },
      layers: layers.map((l) => l.id),
      cells,
      tabs: this.tabs.getTabPositions(),
      dropZone: { x: z.x - DROP_MARGIN, y: z.y - DROP_MARGIN, width: z.width + 2 * DROP_MARGIN, height: z.height + 2 * DROP_MARGIN },
      layerGrab: Object.fromEntries(layers.map((l) => [l.id, this.cat.getLayerGrabPoint(l)])),
      layerRows: this.layersPanel.getRows(),
      dragging: this.drag !== null,
      magnet: this.drag?.preview !== undefined,
      slotAnchors: Object.fromEntries(SLOT_ORDER.map((slot) => [slot, this.cat.getAnchorWorld(anchorForSlot(slot))])),
      drawOrder: this.cat.getDrawOrder(),
      secrets: { unlocked: this.reveal.shownUnlocked(this.unlocked), count: this.reveal.shownCount(this.unlocked), revealing: this.reveal.hiddenItems(), sign: this.sign.text, signLog: [...this.sign.announced], trace: this.secretTrace.map((t) => ({ ...t, revealing: [...t.revealing] })), total: this.catalog.combos.length, text: this.counter.text },
      gift: this.gift ? { comboId: this.gift.comboId, itemId: this.gift.item.id, ready: this.gift.ready, opened: this.gift.opened, bow: this.gift.getBowPoint(), box: this.gift.getCenter(), pill: this.gift.getHintPoint() } : null,
      pendingGifts: this.gifts.length,
      almost: [...this.almost],
      pets: this.pets,
      hint: { shown: this.hintsShown, done: this.hintPlanner.done, showing: this.hintGhost !== null },
      reactions: [...this.reactionLog],
      clockMs: this.deltaTotal,
      fxEmitters: this.children.list.filter((o) => o instanceof Phaser.GameObjects.Particles.ParticleEmitter && o !== this.hearts && o !== this.sparkles).length,
      settled: !this.cat.settling && this.drag === null && this.giftsComing === 0 && this.reveal.active === 0 && (this.gift === null || this.gift.ready) && cellsSettled && Math.abs(viewport.scroll - viewport.targetScroll) < 0.5 && this.cat.alpha > 0.99 && Math.abs(this.cat.scaleX - this.baseCatScale) < 0.001,
    };
  }
}
