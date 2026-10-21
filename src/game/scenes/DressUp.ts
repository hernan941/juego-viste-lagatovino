import Phaser from 'phaser';
import {
  CATEGORY_LABELS, GAME_HEIGHT, GAME_WIDTH, ObjectEvents, RegistryKeys, SceneKeys, TextureKeys,
} from '../constants';
import type { Catalog } from '../data/schema';
import { itemsInCategory, visibleCategories } from '../domain/catalog';
import { newlyCompleted } from '../domain/combos';
import { magnetSnap, resolveDrop, isInsideDropZone } from '../domain/dropZone';
import { ghostFit, alphaBounds } from '../domain/imageBounds';
import { equip, getLayers, unequip } from '../domain/outfit';
import { anchorForSlot } from '../domain/slots';
import type { AnchorsDef, Category, ClothingDef, Outfit, Point, Rect } from '../domain/types';
import type { DressUpE2EState, E2EScene } from '../e2eHook';
import { Cat } from '../objects/Cat';
import type { ClothingItem } from '../objects/ClothingItem';
import { ItemGrid } from '../objects/ItemGrid';
import { LayersPanel } from '../objects/LayersPanel';
import { Tabs } from '../objects/Tabs';
import { tabIconKey } from '../objects/tabIcons';
import { drawPanel, hex, makeText } from '../objects/ui';
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
const ROOM_TEXTURE = 'room-bg';

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
  overZone: boolean;
  lastLook: number;
}

/** The fitting room (F2 vertical slice): one cat, two tabs, a grid, the mirror and the layers panel. */
export class DressUp extends Phaser.Scene implements E2EScene {
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
  private baseCatScale = 1;

  constructor() {
    super(SceneKeys.DressUp);
  }

  init(data?: { catId?: string }) {
    this.catalog = this.registry.get(RegistryKeys.Catalog) as Catalog;
    this.anchors = this.registry.get(RegistryKeys.Anchors) as AnchorsDef;
    this.outfit = {};
    this.drag = null;
    const wanted = (this.registry.get(RegistryKeys.CatId) as string | undefined) ?? data?.catId;
    this.catId = this.catalog.cats.find((c) => c.id === wanted)?.id ?? this.catalog.cats[0].id;
  }

  create(data?: unknown) {
    this.input.dragDistanceThreshold = 8;
    this.drawRoom();
    this.zoneGlow = this.add.graphics().setAlpha(0);

    const def = this.catalog.cats.find((c) => c.id === this.catId)!;
    this.cat = new Cat(this, CAT_X, CAT_FEET_Y, def, this.anchors, CAT_SIZE);
    this.baseCatScale = this.cat.scaleX;
    this.cat.appear();
    this.cat.on(ObjectEvents.ItemDragStart, (item: ClothingDef, p: Phaser.Input.Pointer) => this.beginDrag(item, p, true));
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
        emitting: false, speed: { min: 120, max: 320 }, angle: { min: -160, max: -20 }, gravityY: 420,
        lifespan: { min: 700, max: 1100 }, scale: { start: 1.4, end: 0.3 }, alpha: { start: 1, end: 0 }, rotate: { min: -40, max: 40 },
      })
      .setDepth(4000);
    this.sparkles = this.add
      .particles(0, 0, TextureKeys.Sparkle, {
        emitting: false, speed: { min: 60, max: 240 }, angle: { min: 0, max: 360 }, gravityY: 80,
        lifespan: { min: 500, max: 900 }, scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 },
      })
      .setDepth(4000);

    this.tabs.select(categories[0], true);
    this.showCategory(categories[0]);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    transitionIn(this, enterKind(data));
  }

  update() {
    const d = this.drag;
    if (!d) return;
    // The dragged item eases toward the pointer (or the magnet anchor), so it feels soft.
    d.ghost.x += (d.target.x - d.ghost.x) * 0.4;
    d.ghost.y += (d.target.y - d.ghost.y) * 0.4;
  }

  private cleanup() {
    this.drag = null;
    this.tweens.killAll();
    this.cat?.destroy();
    this.grid?.destroy();
    this.tabs?.destroy();
    this.layersPanel?.destroy();
  }

  // ---- Room ----------------------------------------------------------------

  /** The whole room is static, so it is drawn once into a texture (Graphics replays every shape each frame). */
  private drawRoom() {
    if (!this.textures.exists(ROOM_TEXTURE)) {
      const g = this.make.graphics({}, false);
      g.fillStyle(hex('rosa50'), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      // Paw print wallpaper: tiny lavender huellitas on a grid.
      g.fillStyle(hex('lavanda'), 0.45);
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 17; col++) {
          const x = col * 80 + (row % 2 === 0 ? 20 : 60);
          const y = row * 84 + 30;
          g.fillEllipse(x, y + 4, 11, 9).fillCircle(x - 7, y - 4, 3).fillCircle(x - 2.5, y - 8, 3).fillCircle(x + 2.5, y - 8, 3).fillCircle(x + 7, y - 4, 3);
        }
      }
      // Big mirror with a soft golden frame.
      const mx = CAT_X - 236;
      const my = 56;
      g.fillStyle(hex('rosa600'), 0.15).fillRoundedRect(mx + 4, my + 14, 472, 600, 52);
      g.fillStyle(hex('mantequilla'), 1).fillRoundedRect(mx, my, 472, 600, 52);
      g.lineStyle(6, 0xf5d86a, 1).strokeRoundedRect(mx, my, 472, 600, 52);
      g.fillStyle(hex('crema'), 1).fillRoundedRect(mx + 22, my + 22, 428, 556, 36);
      g.fillStyle(hex('cielo'), 0.35).fillRoundedRect(mx + 22, my + 22, 428, 556, 36);
      g.fillStyle(0xffffff, 0.45).fillRoundedRect(mx + 56, my + 56, 26, 190, 13).fillRoundedRect(mx + 96, my + 56, 12, 90, 6);
      // Round rug under the cat.
      g.fillStyle(hex('rosa600'), 0.18).fillEllipse(CAT_X, CAT_FEET_Y + 14, 360, 70);
      g.fillStyle(hex('rosa200'), 1).fillEllipse(CAT_X, CAT_FEET_Y + 6, 360, 70);
      g.lineStyle(5, hex('rosa400'), 1).strokeEllipse(CAT_X, CAT_FEET_Y + 6, 360, 70).strokeEllipse(CAT_X, CAT_FEET_Y + 6, 280, 46);
      g.generateTexture(ROOM_TEXTURE, GAME_WIDTH, GAME_HEIGHT);
      g.destroy();
    }
    this.add.image(0, 0, ROOM_TEXTURE).setOrigin(0);
  }

  private showCategory(category: Category) {
    this.grid.setItems(itemsInCategory(this.catalog.clothes, category));
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
    const ghost = this.add.image(pointer.x, pointer.y, item.texture).setOrigin(fit.origin.x, fit.origin.y).setScale(fit.scale).setDepth(5000);
    // Taking an item: it grows and tilts.
    this.tweens.add({ targets: ghost, scale: fit.scale * 1.15, angle: 8, duration: 150, ease: 'Back.easeOut' });
    this.drag = { item, fromEquipped, cell, ghost, ghostScale: fit.scale * 1.15, homeScale: home.scale, target: { x: pointer.x, y: pointer.y }, overZone: false, lastLook: 0 };
    cell?.setLifted(true);
    if (fromEquipped) this.cat.setLayerLifted(item, true);
    this.cat.hold('sorpresa');
    this.cat.lookAt({ x: pointer.x, y: pointer.y });
  }

  private moveDrag(pointer: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d) return;
    const point = { x: pointer.x, y: pointer.y };
    const over = isInsideDropZone(point, this.dropZone(), DROP_MARGIN);
    // Magnet: near the slot anchor the item settles onto it.
    const snap = over ? magnetSnap(point, this.cat.getAnchorWorld(anchorForSlot(d.item.slot)), MAGNET_RADIUS) : { point, snapped: false };
    d.target = snap.point;
    this.setPreview(d, snap.snapped && !d.fromEquipped);
    if (over !== d.overZone) {
      d.overZone = over;
      this.setZoneHighlight(over);
    }
    if (this.time.now - d.lastLook > 90) {
      d.lastLook = this.time.now;
      this.cat.lookAt(point);
    }
  }

  /** While the magnet holds the item: a half transparent preview on the cat, and a fainter ghost. */
  private setPreview(d: DragState, on: boolean) {
    if (on === (d.preview !== undefined)) return;
    this.tweens.add({ targets: d.ghost, alpha: on ? 0.25 : 1, duration: 100 });
    if (on) {
      const c = this.cat.canvasToWorld({ x: this.anchors.canvas.width / 2, y: this.anchors.canvas.height / 2 });
      const size = this.anchors.canvas.width * this.baseCatScale;
      const preview = this.add.image(c.x, c.y, d.item.texture).setDisplaySize(size, size).setDepth(4500).setAlpha(0);
      d.preview = preview;
      this.tweens.add({ targets: preview, alpha: 0.5, duration: 100 });
    } else {
      this.fadePreview(d);
    }
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
        { scaleX: s, scaleY: s, duration: 160, ease: 'Back.easeOut' },
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
    this.tweens.add({ targets: this.zoneGlow, alpha: on ? 1 : 0, duration: 140 });
  }

  private endDrag(pointer: Phaser.Input.Pointer) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.setZoneHighlight(false);
    this.cat.lookAt(null);
    const action = resolveDrop({ x: pointer.x, y: pointer.y }, this.dropZone(), DROP_MARGIN, d.fromEquipped);
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
    if (fromEquipped) {
      // Dropped back on the cat: nothing changes, the item just settles again.
      this.cat.setLayerLifted(item, false);
      this.cat.release();
      this.cat.squash();
      return;
    }
    const previous = this.outfit;
    this.applyOutfit(equip(previous, item).outfit);
    const combo = newlyCompleted(previous, this.outfit, this.catalog.combos, this.catalog.clothes).length > 0;
    this.cat.react(combo ? 'combo' : 'drop');
    this.cat.squash();
    this.cat.wiggle();
    this.celebrate(anchor, combo ? 2 : 1);
  }

  private takeOff(d: DragState) {
    this.applyOutfit(unequip(this.outfit, d.item.slot));
    this.cat.react('remove');
    this.cat.shake();
    this.returnGhost(d);
  }

  private sendBack(d: DragState) {
    this.fadePreview(d);
    this.cat.release();
    this.returnGhost(d);
  }

  /** Item that was let go outside the cat: back to its cell with a bounce (250 ms, Back.easeOut). */
  private returnGhost({ ghost, item, cell, homeScale }: DragState) {
    const home = this.grid.getCellPositions()[item.id];
    this.tweens.killTweensOf(ghost);
    ghost.setAlpha(1);
    const done = () => {
      ghost.destroy();
      (cell ?? this.grid.getCell(item.id))?.setLifted(false);
    };
    if (home) {
      this.tweens.add({ targets: ghost, x: home.x, y: home.y, scale: homeScale, angle: 0, duration: 250, ease: 'Back.easeOut', onComplete: done });
    } else {
      this.tweens.add({ targets: ghost, alpha: 0, scale: ghost.scale * 0.6, duration: 200, onComplete: done });
    }
  }

  /** A click on a cell answers with a pulse of the hint: dragging is the only way to wear things (ADR 0008). */
  private pulseHint() {
    this.tweens.killTweensOf(this.hint);
    this.hint.setScale(1).setAlpha(1);
    this.tweens.chain({
      targets: this.hint,
      tweens: [
        { scale: 1.15, duration: 110, ease: 'Sine.easeOut' },
        { scale: 1, duration: 220, ease: 'Back.easeOut' },
        { alpha: 0.7, duration: 500 },
      ],
    });
  }

  private removeItem(item: ClothingDef) {
    if (this.outfit[item.slot] !== item.id) return;
    this.applyOutfit(unequip(this.outfit, item.slot));
    this.cat.react('remove');
    this.cat.shake();
  }

  private applyOutfit(next: Outfit) {
    this.outfit = next;
    this.registry.set(RegistryKeys.Outfit, next);
    const layers = getLayers(next, this.catalog.clothes);
    this.cat.setOutfit(layers);
    this.layersPanel.setLayers(layers);
    this.grid.setWorn(new Set(Object.values(next)));
  }

  /** Hearts and sparkles where the item lands; combos get a bigger burst. */
  private celebrate(at: Point, power: number) {
    this.hearts.explode(7 * power, at.x, at.y);
    this.sparkles.explode(9 * power, at.x, at.y);
  }

  // ---- Test hook (ADR 0012) --------------------------------------------------

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
      settled: this.drag === null && cellsSettled && Math.abs(viewport.scroll - viewport.targetScroll) < 0.5 && this.cat.alpha > 0.99 && Math.abs(this.cat.scaleX - this.baseCatScale) < 0.001,
    };
  }
}
