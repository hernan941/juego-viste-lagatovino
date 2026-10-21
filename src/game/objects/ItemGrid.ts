import Phaser from 'phaser';
import { ObjectEvents } from '../constants';
import type { ClothingDef, Point } from '../domain/types';
import { CELL_SIZE, ClothingItem } from './ClothingItem';

const COLUMNS = 3;
const GAP = 22;

/** Grid of draggable wardrobe cells. Re-emits the drag events of its cells. */
export class ItemGrid extends Phaser.GameObjects.Container {
  private cells = new Map<string, ClothingItem>();
  private worn = new Set<string>();

  /** Replaces the cells with `items`: the old ones fade out, the new ones pop in one after another. */
  setItems(items: readonly ClothingDef[]): void {
    for (const cell of this.cells.values()) this.retire(cell);
    this.cells = new Map();
    const step = CELL_SIZE + GAP;
    items.forEach((item, i) => {
      const x = (i % COLUMNS) * step + CELL_SIZE / 2;
      const y = Math.floor(i / COLUMNS) * step + CELL_SIZE / 2;
      const cell = new ClothingItem(this.scene, x, y, item);
      for (const ev of [ObjectEvents.ItemDragStart, ObjectEvents.ItemDrag, ObjectEvents.ItemDragEnd]) {
        cell.on(ev, (c: ClothingItem, p: Phaser.Input.Pointer) => this.emit(ev, c, p));
      }
      this.add(cell);
      cell.popIn(120 + i * 45);
      if (this.worn.has(item.id)) cell.setWorn(true);
      this.cells.set(item.id, cell);
    });
  }

  private retire(cell: ClothingItem): void {
    cell.disableInteractive();
    this.scene.tweens.add({ targets: cell, alpha: 0, scale: 0.85, duration: 140, onComplete: () => cell.destroy() });
  }

  getCell(itemId: string): ClothingItem | undefined {
    return this.cells.get(itemId);
  }

  /** Cell centers in game coordinates, by item id. */
  getCellPositions(): Record<string, Point> {
    const out: Record<string, Point> = {};
    for (const [id, cell] of this.cells) {
      const m = cell.getWorldTransformMatrix();
      out[id] = { x: m.tx, y: m.ty };
    }
    return out;
  }

  /** Marks the worn items with the mint ring. */
  setWorn(ids: ReadonlySet<string>): void {
    this.worn = new Set(ids);
    for (const [id, cell] of this.cells) cell.setWorn(this.worn.has(id));
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
