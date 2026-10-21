import Phaser from 'phaser';
import {
  CATEGORY_LABELS, GAME_HEIGHT, GAME_WIDTH, ObjectEvents, RegistryKeys, SceneKeys, TextureKeys,
} from '../constants';
import type { Catalog } from '../data/schema';
import { itemsInCategory, visibleCategories } from '../domain/catalog';
import { newlyCompleted } from '../domain/combos';
import { magnetSnap, resolveDrop, isInsideDropZone } from '../domain/dropZone';
import { equip, getLayers, unequip } from '../domain/outfit';
import { anchorForSlot } from '../domain/slots';
import type { AnchorsDef, Category, ClothingDef, Outfit, Point, Rect } from '../domain/types';
import type { DressUpE2EState, E2EScene } from '../e2eHook';
import { Cat } from '../objects/Cat';
import type { ClothingItem } from '../objects/ClothingItem';
import { ItemGrid } from '../objects/ItemGrid';
import { LayersPanel } from '../objects/LayersPanel';
import { Tabs } from '../objects/Tabs';
import { drawPanel, hex, makeText } from '../objects/ui';
import { enterKind, transitionIn } from '../systems/transitions';

const CAT_X = 700;
const CAT_FEET_Y = 612;
const CAT_SIZE = 540;
/** Forgiving margin around the cat's drop zone and magnet radius, in game px (ADR 0008). */
const DROP_MARGIN = 36;
const MAGNET_RADIUS = 110;
const GHOST_SIZE = 104;
const ROOM_TEXTURE = 'room-bg';

interface DragState {
  item: ClothingDef;
  fromEquipped: boolean;
  cell?: ClothingItem;
  ghost: Phaser.GameObjects.Image;
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
    this.input.dragDistanceThreshold = 4;
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
    const panel = this.add.graphics().setPosition(36, 36);
    drawPanel(panel, 404, 648);
    const categories = visibleCategories(this.catalog.clothes);
    this.tabs = new Tabs(this, 62, 62, categories.map((id) => ({ id, label: CATEGORY_LABELS[id] })), 168);
    this.grid = new ItemGrid(this, 74, 150);
    this.add.existing(this.grid);
    this.grid.on(ObjectEvents.ItemDragStart, (c: ClothingItem, p: Phaser.Input.Pointer) => this.beginDrag(c.item, p, false, c));
    this.grid.on(ObjectEvents.ItemDrag, (_c: ClothingItem, p: Phaser.Input.Pointer) => this.moveDrag(p));
    this.grid.on(ObjectEvents.ItemDragEnd, (_c: ClothingItem, p: Phaser.Input.Pointer) => this.endDrag(p));
    this.tabs.on(ObjectEvents.TabSelect, (id: Category) => this.showCategory(id));
    makeText(this, 238, 640, 'Arrastra la ropa al gatito', 20).setAlpha(0.7);

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

  private beginDrag(item: ClothingDef, pointer: Phaser.Input.Pointer, fromEquipped: boolean, cell?: ClothingItem) {
    if (this.drag) return;
    const base = GHOST_SIZE / this.textures.get(item.icon).getSourceImage().width;
    const ghost = this.add.image(pointer.x, pointer.y, item.icon).setScale(base).setDepth(5000);
    // Taking an item: it grows and tilts.
    this.tweens.add({ targets: ghost, scale: base * 1.25, angle: 8, duration: 150, ease: 'Back.easeOut' });
    this.drag = { item, fromEquipped, cell, ghost, target: { x: pointer.x, y: pointer.y }, overZone: false, lastLook: 0 };
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
    if (over !== d.overZone) {
      d.overZone = over;
      this.setZoneHighlight(over);
    }
    if (this.time.now - d.lastLook > 90) {
      d.lastLook = this.time.now;
      this.cat.lookAt(point);
    }
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

  private dropOnCat({ item, ghost, cell, fromEquipped }: DragState) {
    const anchor = this.cat.getAnchorWorld(anchorForSlot(item.slot));
    this.tweens.killTweensOf(ghost);
    this.tweens.add({ targets: ghost, x: anchor.x, y: anchor.y, scale: ghost.scale * 0.5, alpha: 0, angle: 0, duration: 160, ease: 'Quad.easeIn', onComplete: () => ghost.destroy() });
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

  private takeOff({ item, ghost, cell }: DragState) {
    this.applyOutfit(unequip(this.outfit, item.slot));
    this.cat.react('remove');
    this.cat.shake();
    this.returnGhost(ghost, item, cell);
  }

  private sendBack({ item, ghost, cell }: DragState) {
    this.cat.release();
    this.returnGhost(ghost, item, cell);
  }

  /** Item that was let go outside the cat: back to its cell with a bounce (250 ms, Back.easeOut). */
  private returnGhost(ghost: Phaser.GameObjects.Image, item: ClothingDef, cell?: ClothingItem) {
    const home = this.grid.getCellPositions()[item.id];
    this.tweens.killTweensOf(ghost);
    const done = () => {
      ghost.destroy();
      (cell ?? this.grid.getCell(item.id))?.setLifted(false);
    };
    if (home) {
      const base = 104 / this.textures.get(item.icon).getSourceImage().width;
      this.tweens.add({ targets: ghost, x: home.x, y: home.y, scale: base, angle: 0, duration: 250, ease: 'Back.easeOut', onComplete: done });
    } else {
      this.tweens.add({ targets: ghost, alpha: 0, scale: ghost.scale * 0.6, duration: 200, onComplete: done });
    }
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
    return {
      catId: this.catId,
      catIds: this.catalog.cats.map((c) => c.id),
      outfit: { ...this.outfit },
      layers: layers.map((l) => l.id),
      cells,
      tabs: this.tabs.getTabPositions(),
      dropZone: { x: z.x - DROP_MARGIN, y: z.y - DROP_MARGIN, width: z.width + 2 * DROP_MARGIN, height: z.height + 2 * DROP_MARGIN },
      layerGrab: Object.fromEntries(layers.map((l) => [l.id, this.cat.getLayerGrabPoint(l)])),
      layerRows: this.layersPanel.getRows(),
      dragging: this.drag !== null,
      settled: this.drag === null && cellsSettled && this.cat.alpha > 0.99 && Math.abs(this.cat.scaleX - this.baseCatScale) < 0.001,
    };
  }
}
