import Phaser from 'phaser';
import { ObjectEvents } from '../constants';
import {
  classifyGesture, clampScroll, contentHeight, scrollbarThumb, smoothStep, wheelTarget,
} from '../domain/scroll';
import type { ClothingDef, Point, Rect } from '../domain/types';
import { CELL_SIZE, ClothingItem } from './ClothingItem';
import { hex } from './ui';

export const GRID_COLUMNS = 3;
const GAP = 22;
/** Space above the first row and below the last one, so hovered cells are never cut. */
const PADDING = 8;
const SCROLLBAR_W = 6;
const SCROLLBAR_MIN = 44;

/**
 * Scrollable grid of draggable wardrobe cells. Re-emits the drag events of its cells.
 *
 * The viewport is `width` x `height` px with its origin at the grid position; the cells live in a
 * `content` container that moves with the scroll. Phaser 4 containers cannot take a mask filter, so each
 * cell crops its own picture to the viewport (`ClothingItem.setClip`): the part outside is simply not
 * drawn, and nothing leaves the panel. Scrolling: mouse wheel over the viewport (eased), or
 * dragging vertically in an empty zone of the grid or from a cell. A press on a cell that moves mostly
 * sideways drags the item instead (`classifyGesture`), so both gestures coexist.
 */
export class ItemGrid extends Phaser.GameObjects.Container {
  private cells = new Map<string, ClothingItem>();
  private worn = new Set<string>();
  private readonly content: Phaser.GameObjects.Container;
  private readonly scrollbar: Phaser.GameObjects.Graphics;
  private readonly zone: Phaser.GameObjects.Zone;
  private scrollbarTween?: Phaser.Tweens.Tween;
  private contentH = 0;
  private offset = 0;
  private target = 0;
  /** Set while a vertical drag scrolls the grid: the offset when it started. */
  private scrollDrag: { start: number } | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly viewWidth: number, readonly viewHeight: number) {
    super(scene, x, y);
    this.zone = scene.add.zone(0, 0, viewWidth, viewHeight).setOrigin(0);
    this.zone.setInteractive({ draggable: true });
    this.zone.on('dragstart', () => this.beginScrollDrag());
    this.zone.on('drag', (p: Phaser.Input.Pointer) => this.dragScroll(p));
    this.zone.on('dragend', () => this.endScrollDrag());

    this.content = scene.add.container(0, 0);
    this.scrollbar = scene.add.graphics().setPosition(viewWidth + 4, 0);
    this.add([this.zone, this.content, this.scrollbar]);
    scene.add.existing(this);

    scene.input.on('wheel', this.onWheel, this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
  }

  /** Replaces the cells with `items`: the old ones fade out, the new ones pop in one after another. */
  setItems(items: readonly ClothingDef[]): void {
    for (const cell of this.cells.values()) this.retire(cell);
    this.cells = new Map();
    this.offset = 0;
    this.target = 0;
    this.scrollDrag = null;
    this.contentH = contentHeight(items.length, GRID_COLUMNS, CELL_SIZE, GAP, PADDING);
    const step = CELL_SIZE + GAP;
    const left = (this.viewWidth - (GRID_COLUMNS * CELL_SIZE + (GRID_COLUMNS - 1) * GAP)) / 2;
    items.forEach((item, i) => {
      const x = left + (i % GRID_COLUMNS) * step + CELL_SIZE / 2;
      const y = PADDING + Math.floor(i / GRID_COLUMNS) * step + CELL_SIZE / 2;
      const cell = new ClothingItem(this.scene, x, y, item);
      cell.on(ObjectEvents.ItemDragStart, (c: ClothingItem, p: Phaser.Input.Pointer) => this.onCellDragStart(c, p));
      cell.on(ObjectEvents.ItemDrag, (c: ClothingItem, p: Phaser.Input.Pointer) => {
        if (this.scrollDrag) this.dragScroll(p);
        else this.emit(ObjectEvents.ItemDrag, c, p);
      });
      cell.on(ObjectEvents.ItemDragEnd, (c: ClothingItem, p: Phaser.Input.Pointer) => {
        if (this.scrollDrag) this.endScrollDrag();
        else this.emit(ObjectEvents.ItemDragEnd, c, p);
      });
      cell.on(ObjectEvents.ItemClick, (c: ClothingItem) => this.emit(ObjectEvents.ItemClick, c));
      this.content.add(cell);
      cell.popIn(120 + Math.min(i, 11) * 45);
      if (this.worn.has(item.id)) cell.setWorn(true);
      this.cells.set(item.id, cell);
    });
    this.applyScroll();
  }

  private retire(cell: ClothingItem): void {
    cell.disableInteractive();
    this.scene.tweens.add({ targets: cell, alpha: 0, scale: 0.85, duration: 140, onComplete: () => cell.destroy() });
  }

  // ---- Scrolling -----------------------------------------------------------

  private get canScroll(): boolean {
    return this.contentH > this.viewHeight;
  }

  private worldOrigin(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  private onWheel(pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void {
    const o = this.worldOrigin();
    const inside = pointer.x >= o.x && pointer.x <= o.x + this.viewWidth && pointer.y >= o.y && pointer.y <= o.y + this.viewHeight;
    if (!inside || !this.canScroll) return;
    this.target = wheelTarget(this.target, dy, this.contentH, this.viewHeight);
  }

  private onUpdate(_time: number, delta: number): void {
    if (this.scrollDrag || this.offset === this.target) return;
    this.offset = smoothStep(this.offset, this.target, delta);
    this.applyScroll();
  }

  private onCellDragStart(cell: ClothingItem, pointer: Phaser.Input.Pointer): void {
    const gesture = classifyGesture(pointer.x - pointer.downX, pointer.y - pointer.downY, 1);
    if (gesture === 'scroll' && this.canScroll) this.beginScrollDrag();
    else this.emit(ObjectEvents.ItemDragStart, cell, pointer);
  }

  private beginScrollDrag(): void {
    this.scrollDrag = { start: this.offset };
  }

  private dragScroll(pointer: Phaser.Input.Pointer): void {
    if (!this.scrollDrag) return;
    this.offset = clampScroll(this.scrollDrag.start - (pointer.y - pointer.downY), this.contentH, this.viewHeight);
    this.target = this.offset;
    this.applyScroll();
  }

  private endScrollDrag(): void {
    this.scrollDrag = null;
  }

  /** Moves the content, the scrollbar and the hit areas to the current offset. */
  private applyScroll(): void {
    this.content.y = -this.offset;
    this.drawScrollbar();
    const view: Rect = { x: 0, y: this.offset, width: this.viewWidth, height: this.viewHeight };
    for (const cell of this.cells.values()) {
      // The part of the cell inside the viewport, in cell-local coordinates (the cell is centered on x, y).
      const left = Math.max(cell.x - CELL_SIZE / 2, view.x);
      const top = Math.max(cell.y - CELL_SIZE / 2, view.y);
      const right = Math.min(cell.x + CELL_SIZE / 2, view.x + view.width);
      const bottom = Math.min(cell.y + CELL_SIZE / 2, view.y + view.height);
      const visible = right > left && bottom > top;
      const local = visible ? { x: left - (cell.x - CELL_SIZE / 2), y: top - (cell.y - CELL_SIZE / 2), width: right - left, height: bottom - top } : null;
      cell.setHitRect(local);
      cell.setClip(local);
    }
  }

  private drawScrollbar(): void {
    const g = this.scrollbar;
    g.clear();
    const thumb = scrollbarThumb(this.offset, this.contentH, this.viewHeight, this.viewHeight, SCROLLBAR_MIN);
    if (!thumb) return;
    g.fillStyle(hex('rosa200'), 1).fillRoundedRect(0, 0, SCROLLBAR_W, this.viewHeight, SCROLLBAR_W / 2);
    g.fillStyle(hex('rosa400'), 1).fillRoundedRect(0, thumb.y, SCROLLBAR_W, thumb.height, SCROLLBAR_W / 2);
    // Brighter while it moves, calmer when it rests.
    this.scrollbarTween?.remove();
    this.scrollbar.setAlpha(1);
    this.scrollbarTween = this.scene.tweens.add({ targets: this.scrollbar, alpha: 0.45, delay: 600, duration: 300 });
  }

  // ---- Queries (hook and scene) ----------------------------------------------

  getCell(itemId: string): ClothingItem | undefined {
    return this.cells.get(itemId);
  }

  /** Cell centers in game coordinates, by item id (the scroll is included). */
  getCellPositions(): Record<string, Point> {
    const out: Record<string, Point> = {};
    for (const [id, cell] of this.cells) {
      const m = cell.getWorldTransformMatrix();
      out[id] = { x: m.tx, y: m.ty };
    }
    return out;
  }

  /** Ids of the cells that are completely inside the viewport (safe to grab). */
  getVisibleIds(): string[] {
    return [...this.cells].filter(([, c]) => {
      const top = c.y - CELL_SIZE / 2 - this.offset;
      return top >= 0 && top + CELL_SIZE <= this.viewHeight;
    }).map(([id]) => id);
  }

  /** Viewport in game coordinates plus the scroll state. */
  getViewport(): Rect & { scroll: number; targetScroll: number; maxScroll: number } {
    const o = this.worldOrigin();
    return {
      x: o.x, y: o.y, width: this.viewWidth, height: this.viewHeight,
      scroll: this.offset, targetScroll: this.target, maxScroll: Math.max(0, this.contentH - this.viewHeight),
    };
  }

  /** Marks the worn items with the mint ring. */
  setWorn(ids: ReadonlySet<string>): void {
    this.worn = new Set(ids);
    for (const [id, cell] of this.cells) cell.setWorn(this.worn.has(id));
  }

  destroy(fromScene?: boolean): void {
    this.scene?.input.off('wheel', this.onWheel, this);
    this.scene?.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate, this);
    this.scrollbarTween?.remove();
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
