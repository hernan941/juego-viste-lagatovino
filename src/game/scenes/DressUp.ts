import Phaser from 'phaser';
import {
  CATEGORY_LABELS, DressUpEvents, GAME_HEIGHT, GAME_WIDTH, MEOW_KEYS, ObjectEvents, RegistryKeys, SceneKeys, SfxKeys,
} from '../constants';
import type { Catalog } from '../data/schema';
import { dressUpRestore, type DressUpRestore } from '../domain/flow';
import { petHeartSpots } from '../domain/petHearts';
import { itemsInCategory, visibleCategories } from '../domain/catalog';
import { newlyCompleted, secretRewards } from '../domain/combos';
import { tiltToward } from '../domain/tilt';
import { magnetSnap, resolveDrop, isInsideDropZone } from '../domain/dropZone';
import { ghostFit } from '../domain/imageBounds';
import { equip, getLayers, unequip } from '../domain/outfit';
import { anchorForSlot, SLOT_ORDER } from '../domain/slots';
import type { AnchorsDef, Category, ClothingDef, Outfit, Point, Rect } from '../domain/types';
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
import { NameSign } from '../objects/NameSign';
import type { ClothingItem } from '../objects/ClothingItem';
import { ItemGrid } from '../objects/ItemGrid';
import { LayersPanel } from '../objects/LayersPanel';
import { Tabs } from '../objects/Tabs';
import { controllerFactories } from '../objects/dressup/controllers';
import { ControllerHost, mergeControllerState } from '../objects/dressup/runtime';
import type { OutfitCause } from '../objects/dressup/DressUpController';
import { DragFx, type DragState } from '../objects/dressup/DragFx';
import { celebrate, createBursts, pulse } from '../objects/dressup/dropFx';
import { ItemBounds } from '../objects/dressup/itemBounds';
import { GHOST_HOME_SIZE, GHOST_SIZE } from '../objects/dressup/layout';
import { tabIconKey } from '../objects/tabIcons';
import { drawRoom } from '../objects/room';
import { drawPanel, liftFor, makeText, touchEnv } from '../objects/ui';
import { profileOf } from '../systems/motion';
import { applyLift, dragThreshold, isDragPointer } from '../systems/touch';
import { enterKind, transitionIn } from '../systems/transitions';

const CAT_X = 700;
const CAT_FEET_Y = 612;
const CAT_SIZE = 540;
/** Forgiving margin around the cat's drop zone and magnet radius, in game px (ADR 0008). */
const DROP_MARGIN = 36;
const MAGNET_RADIUS = 110;
/** Left panel: tabs, then the scrollable grid, then the hint (game px). */
const PANEL = { x: 36, y: 36, width: 404, height: 648 };
const GRID = { x: 62, y: 164, width: 368 - 12, height: 464 };

/** The fitting room (F2 vertical slice): one cat, two tabs, a grid, the mirror and the layers panel. */
export class DressUp extends Phaser.Scene implements E2EScene, E2EUi {
  private catalog!: Catalog;
  private anchors!: AnchorsDef;
  private outfit: Outfit = {};
  private cat!: Cat;
  private grid!: ItemGrid;
  private tabs!: Tabs;
  private layersPanel!: LayersPanel;
  private fx!: DragFx;
  private hint!: Phaser.GameObjects.Text;
  private bounds!: ItemBounds;
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
  private rainbow!: Phaser.GameObjects.Graphics;
  private sign!: NameSign;
  private pets = 0;
  /** Sum of the frame deltas (what timers and tweens count), for the e2e hook. */
  private deltaTotal = 0;
  /** Feature controllers (ADR 0019) and the layer they draw their HUD on. */
  private controllers = new ControllerHost(controllerFactories);
  private leaveData: Record<string, unknown> = {};
  /** The tab and the scroll the album hands back (F17.6): applied once the controllers have added their tabs. */
  private restore: DressUpRestore = { tab: null, scroll: 0 };
  private hud!: Phaser.GameObjects.Container;
  private categories: Category[] = [];

  constructor() {
    super(SceneKeys.DressUp);
  }

  init(data?: { catId?: string; tab?: unknown; scroll?: unknown }) {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    this.anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    const session = readSession(this.registry);
    // The outfit comes back from the Showcase, and it also follows the player to another cat (chooseCat keeps it).
    this.outfit = session.outfit;
    this.drag = null;
    this.leaving = false;
    this.pets = 0;
    this.leaveData = {};
    this.restore = dressUpRestore(data);
    this.controllers = new ControllerHost(controllerFactories);
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
    this.bounds = new ItemBounds(this);
    this.fx = new DragFx({
      scene: this, cat: () => this.cat, anchors: this.anchors, baseCatScale: () => this.baseCatScale,
      dropZone: () => this.dropZone(), isOverZone: () => this.drag?.overZone === true,
    });
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
    this.categories = categories;
    const tabsWidth = categories.length * 54 + (categories.length - 1) * 10;
    this.tabs = new Tabs(this, PANEL.x + (PANEL.width - tabsWidth) / 2, 58, categories.map((id) => ({ id, label: CATEGORY_LABELS[id], icon: tabIconKey(id) })));
    this.grid = new ItemGrid(this, GRID.x, GRID.y, GRID.width, GRID.height);
    this.grid.on(ObjectEvents.ItemDragStart, (c: ClothingItem, p: Phaser.Input.Pointer) => this.beginDrag(c.item, p, false, c));
    this.grid.on(ObjectEvents.ItemDrag, (_c: ClothingItem, p: Phaser.Input.Pointer) => this.moveDrag(p));
    this.grid.on(ObjectEvents.ItemDragEnd, (_c: ClothingItem, p: Phaser.Input.Pointer) => this.endDrag(p));
    this.grid.on(ObjectEvents.ItemClick, () => this.pulseHint());
    // A tab that a controller added has its own listener: only the wardrobe categories fill the grid.
    this.tabs.on(ObjectEvents.TabSelect, (id: string) => this.categories.includes(id as Category) && this.showCategory(id as Category));
    this.hint = makeText(this, PANEL.x + PANEL.width / 2, 658, 'Arrastra la ropa al gatito', 20).setAlpha(0.7);

    // Right panel: layers.
    this.layersPanel = new LayersPanel(this, 968, 60);
    this.layersPanel.on(ObjectEvents.LayerRemove, (item: ClothingDef) => this.removeItem(item));

    ({ hearts: this.hearts, sparkles: this.sparkles } = createBursts(this));

    this.createNameSign();
    this.doneButton = new Button(this, 1093, 568, '¡Listo!', { width: 250, height: 88, fontSize: 42 });
    this.doneButton.on(ObjectEvents.ButtonClick, () => this.leave('finish'));
    this.changeButton = new Button(this, 1093, 652, 'Cambiar de gato', { width: 220, height: 62, fontSize: 24, tone: 'lavanda' });
    this.changeButton.on(ObjectEvents.ButtonClick, () => this.leave('change'));
    this.mute = new MuteButton(this, 1240, 686).setScale(0.8);
    this.motion = new MotionButton(this, 1240, 636).setScale(0.8);
    this.fullscreen = FullscreenButton.create(this, 1244, 36);
    this.fullscreen?.setScale(0.8);

    this.tabs.select(categories[0], true);
    this.showCategory(categories[0]);
    if (Object.keys(this.outfit).length > 0) {
      // The look arrives with a pop, one layer after another, and the cat is happy about it.
      this.applyOutfit(this.outfit, 'restore', true);
      this.cat.react('drop');
    }
    this.hud = this.add.container(0, 0).setDepth(32);
    this.controllers.attach({
      scene: this, catalog: this.catalog, anchors: this.anchors, cat: this.cat, grid: this.grid, tabs: this.tabs, layersPanel: this.layersPanel,
      hud: this.hud, hearts: this.hearts, sparkles: this.sparkles, sign: this.sign, rainbow: this.rainbow, catId: this.catId, catName: this.catName,
      getOutfit: () => this.outfit, isDragging: () => this.drag !== null, isLeaving: () => this.leaving, boundsOf: (item) => this.bounds.of(item),
      removeItem: (item) => this.removeItem(item),
      showCategory: (category) => { this.tabs.select(category, true); this.showCategory(category); }, leaveData: this.leaveData,
    });
    this.restoreView();
    this.events.emit(DressUpEvents.CatChanged, this.catId);
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
  }

  /** Hanging sign with the name of the cat, over the mirror (it flips to announce looks and prizes). */
  private createNameSign() {
    this.sign = new NameSign(this, CAT_X, -60, this.catName).setDepth(30);
    this.sign.hang(92);
  }

  private leave(action: 'finish' | 'change') {
    if (this.leaving) return;
    this.leaving = true;
    if (action === 'finish') this.events.emit(DressUpEvents.ReadyPressed);
    // A controller may stop the player (to show a box first) or ask for time (ADR 0019).
    const verdict = this.controllers.beforeLeave(action);
    if (verdict === true) this.depart(action);
    else if (verdict instanceof Promise) {
      void verdict.then((ok) => {
        if (!this.scene.isActive()) return;
        if (ok) this.depart(action);
        else this.leaving = false;
      });
    } else this.leaving = false;
  }

  private depart(action: 'finish' | 'change') {
    // Lets go of an item that is still in the hand.
    this.drag?.ghost.destroy();
    this.drag?.preview?.destroy();
    this.drag = null;
    // The controllers add what the next scene needs to know (the Showcase tells the player about the prizes delivered quietly).
    go(this, action, { gifted: [], ...this.leaveData });
  }

  private cleanup() {
    this.controllers.destroy();
    this.hud?.destroy();
    this.drag = null;
    this.fx?.destroy();
    this.tweens.killAll();
    for (const o of [this.doneButton, this.changeButton, this.mute, this.motion, this.fullscreen, this.sign, this.cat, this.grid, this.tabs, this.layersPanel]) o?.destroy();
  }

  /** Back from the album: the tab it was on and how far the grid was scrolled (a tab of a controller answers to its own listener). */
  private restoreView() {
    const { tab, scroll } = this.restore;
    if (!tab) return;
    if (this.categories.includes(tab as Category)) {
      this.tabs.select(tab, true);
      this.showCategory(tab as Category);
      if (scroll > 0) this.grid.setScroll(scroll);
    } else if (tab in this.tabs.getTabPositions()) this.tabs.select(tab);
  }

  private showCategory(category: Category) {
    this.grid.setItems(itemsInCategory(this.catalog.clothes, category, secretRewards(getSave(this).secrets, this.catalog.combos)));
  }

  // ---- Drag and drop (ADR 0008) --------------------------------------------

  private dropZone(): Rect {
    const z = this.cat.getDropZoneRect();
    return { x: z.x, y: z.y, width: z.width, height: z.height };
  }

  private beginDrag(item: ClothingDef, pointer: Phaser.Input.Pointer, fromEquipped: boolean, cell?: ClothingItem) {
    if (this.drag) return;
    // The ghost is the item itself (no cell card), centered on its own visible bounds, so it never hides the cat's face.
    const src = this.textures.get(item.texture).getSourceImage();
    const bounds = this.bounds.of(item);
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
    this.fx.setPreview(d, snap.snapped && !d.fromEquipped);
    if (over !== d.overZone) {
      d.overZone = over;
      this.fx.setZoneHighlight(over);
      // "She is going to get it!": surprise only over the zone (a micro tween comes with the face swap).
      if (over) this.cat.hold('sorpresa');
      else this.cat.release();
    }
    if (this.time.now - d.lastLook > 90) {
      d.lastLook = this.time.now;
      this.cat.lookAt(point);
    }
  }

  private endDrag(pointer: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d || !isDragPointer(d.pointerId, pointer.id)) return;
    this.drag = null;
    this.fx.setZoneHighlight(false);
    this.fx.hideAnchorDot();
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
    this.fx.settlePreview(d);
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
    this.applyOutfit(equip(previous, item).outfit, 'drop');
    // A completed combo has its own reaction (SecretsController), so the plain happy one is skipped.
    const combo = newlyCompleted(previous, this.outfit, this.catalog.combos, this.catalog.clothes).length > 0;
    if (!combo) this.cat.react('drop');
    this.time.delayedCall(90, () => getAudio(this).play(SfxKeys.Purr));
    if (combo || Math.random() < 0.25) this.time.delayedCall(250, () => getAudio(this).playRandom(MEOW_KEYS));
    this.cat.squash();
    this.cat.wiggle();
    celebrate(this, this.hearts, this.sparkles, anchor, combo ? 2 : 1);
    this.events.emit(DressUpEvents.ItemDropped, item);
  }

  /** The cat was petted: a purr, and a couple of hearts floating up from its head. */
  private onPet() {
    this.pets++;
    getAudio(this).play(SfxKeys.Purr, { volume: 0.7 });
    const head = this.cat.getAnchorWorld('head');
    // To the sides of the head: straight up they climbed to the name sign and covered it.
    for (const spot of petHeartSpots(head, profileOf(this).count(4))) this.hearts.explode(1, spot.x, spot.y);
  }

  private takeOff(d: DragState) {
    this.applyOutfit(unequip(this.outfit, d.item.slot), 'remove');
    getAudio(this).play(SfxKeys.Remove);
    this.cat.react('remove');
    this.cat.shake();
    this.fx.returnGhost(d, this.grid);
    this.events.emit(DressUpEvents.ItemRemoved, d.item);
  }

  private sendBack(d: DragState) {
    this.fx.fadePreview(d);
    this.cat.release();
    this.fx.returnGhost(d, this.grid);
  }

  /** A click on a cell answers with a pulse of the hint: dragging is the only way to wear things (ADR 0008). */
  private pulseHint() {
    getAudio(this).play(SfxKeys.Click, { volume: 0.7 });
    pulse(this, this.hint);
  }

  private removeItem(item: ClothingDef) {
    if (this.outfit[item.slot] !== item.id) return;
    this.applyOutfit(unequip(this.outfit, item.slot), 'remove');
    getAudio(this).play(SfxKeys.Remove);
    this.cat.react('remove');
    this.cat.shake();
    this.events.emit(DressUpEvents.ItemRemoved, item);
  }

  private applyOutfit(next: Outfit, cause: OutfitCause, stagger = false) {
    this.outfit = next;
    this.registry.set(RegistryKeys.Outfit, next);
    const layers = getLayers(next, this.catalog.clothes);
    this.cat.setOutfit(layers, { stagger });
    this.layersPanel.setLayers(layers);
    this.grid.setWorn(new Set(Object.values(next)));
    this.events.emit(DressUpEvents.OutfitChanged, next, cause);
  }

  // ---- Test hook (ADR 0012) --------------------------------------------------

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
    this.applyOutfit(next, 'test');
  }

  getE2EState(): DressUpE2EState {
    const z = this.dropZone();
    const layers = getLayers(this.outfit, this.catalog.clothes);
    const cells = this.grid.getCellPositions();
    const viewport = this.grid.getViewport();
    return mergeControllerState({
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
      pets: this.pets,
      clockMs: this.deltaTotal,
      fxEmitters: this.children.list.filter((o) => o instanceof Phaser.GameObjects.Particles.ParticleEmitter && o !== this.hearts && o !== this.sparkles).length,
      settled: !this.cat.settling && this.drag === null && this.controllers.settled() && this.grid.cellsSettled() && Math.abs(viewport.scroll - viewport.targetScroll) < 0.5 && this.cat.alpha > 0.99 && Math.abs(this.cat.scaleX - this.baseCatScale) < 0.001,
    }, this.controllers.e2eState()) as unknown as DressUpE2EState; // cast:  the controllers add secrets, gift, pendingGifts, almost, hint and reactions
  }
}
