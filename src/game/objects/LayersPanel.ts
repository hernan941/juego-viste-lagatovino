import Phaser from 'phaser';
import { ObjectEvents, Palette } from '../constants';
import type { ClothingDef, Point } from '../domain/types';
import { addHover, addPress, drawPanel, hex, makeText } from './ui';

const WIDTH = 250;
/** Room for the 6 slots: header (70) + 6 rows of 56 + bottom margin. */
const HEIGHT = 450;
const ROW_H = 56;
const TOP = 70;

class Row extends Phaser.GameObjects.Container {
  readonly closeButton: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, readonly item: ClothingDef) {
    super(scene, 0, 0);
    const bg = scene.add.graphics();
    bg.fillStyle(hex('crema'), 1).fillRoundedRect(-WIDTH / 2 + 18, -26, WIDTH - 36, 52, 18);
    bg.lineStyle(3, hex('rosa200'), 1).strokeRoundedRect(-WIDTH / 2 + 18, -26, WIDTH - 36, 52, 18);
    const icon = scene.add.image(-WIDTH / 2 + 52, 0, item.icon).setDisplaySize(40, 40);
    const label = scene.add.text(-WIDTH / 2 + 80, 0, item.name, { fontFamily: 'Fredoka', fontSize: '15px', color: Palette.texto, fontStyle: '500', wordWrap: { width: 90 } }).setOrigin(0, 0.5);

    // The cross button: rosa-400 circle with a rounded x.
    const cross = scene.add.graphics();
    cross.fillStyle(hex('rosa600'), 0.3).fillCircle(0, 3, 15);
    cross.fillStyle(hex('rosa400'), 1).fillCircle(0, 0, 15);
    cross.lineStyle(4, 0xffffff, 1).beginPath().moveTo(-6, -6).lineTo(6, 6).moveTo(6, -6).lineTo(-6, 6).strokePath();
    this.closeButton = scene.add.container(WIDTH / 2 - 40, 0, [cross]);
    this.closeButton.setSize(34, 34);
    this.closeButton.setInteractive({ hitArea: new Phaser.Geom.Circle(17, 17, 20), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    addHover(this.closeButton, 1.15);
    addPress(this.closeButton);
    this.closeButton.on('pointerdown', () => this.emit(ObjectEvents.LayerRemove, item));

    this.add([bg, icon, label, this.closeButton]);
  }
}

/** Panel with the worn layers, front to back, each with its ✕. Emits LayerRemove with the item. */
export class LayersPanel extends Phaser.GameObjects.Container {
  private rows = new Map<string, Row>();
  private readonly empty: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const bg = scene.add.graphics();
    drawPanel(bg, WIDTH, HEIGHT);
    const title = makeText(scene, WIDTH / 2, 38, 'Capas', 28, Palette.rosa600);
    this.empty = makeText(scene, WIDTH / 2, HEIGHT / 2 + 10, 'Arrastra una prenda\nal gatito', 20);
    this.empty.setAlpha(0.6).setAlign('center');
    this.add([bg, title, this.empty]);
    scene.add.existing(this);
  }

  private rowY(index: number): number {
    return TOP + ROW_H / 2 + index * ROW_H;
  }

  /** `items` ordered back to front (as `getLayers` returns); the panel shows the front layer first. */
  setLayers(items: readonly ClothingDef[]): void {
    const ordered = [...items].reverse();
    const keep = new Set(ordered.map((i) => i.id));
    for (const [id, row] of [...this.rows]) {
      if (keep.has(id)) continue;
      this.rows.delete(id);
      row.closeButton.disableInteractive();
      this.scene.tweens.add({ targets: row, alpha: 0, x: row.x + 40, duration: 200, ease: 'Quad.easeIn', onComplete: () => row.destroy() });
    }
    ordered.forEach((item, i) => {
      const y = this.rowY(i);
      const existing = this.rows.get(item.id);
      if (existing) {
        this.scene.tweens.add({ targets: existing, y, duration: 200, ease: 'Back.easeOut' });
        return;
      }
      const row = new Row(this.scene, item);
      row.on(ObjectEvents.LayerRemove, (it: ClothingDef) => this.emit(ObjectEvents.LayerRemove, it));
      row.setPosition(WIDTH / 2 + 40, y).setAlpha(0);
      this.add(row);
      this.rows.set(item.id, row);
      this.scene.tweens.add({ targets: row, x: WIDTH / 2, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    });
    this.scene.tweens.add({ targets: this.empty, alpha: ordered.length === 0 ? 0.6 : 0, duration: 200 });
  }

  /** Item ids in panel order (front first) and the game position of each ✕, for tests. */
  getRows(): { itemId: string; close: Point }[] {
    return [...this.rows.values()]
      .sort((a, b) => a.y - b.y)
      .map((r) => {
        const m = r.closeButton.getWorldTransformMatrix();
        return { itemId: r.item.id, close: { x: m.tx, y: m.ty } };
      });
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
