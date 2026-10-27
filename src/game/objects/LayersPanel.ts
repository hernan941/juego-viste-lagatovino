import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, colorToNumber } from '../constants';
import type { ClothingDef, Point } from '../domain/types';
import { profileOf } from '../systems/motion';
import { addHover, addPress, hitCircle } from './ui';
import { Card } from './kit/Card';
import { hoverSfx } from './hoverSfx';

const WIDTH = 250;
/** Room for the 6 slots: header (70) + 6 rows of 56 + bottom margin. */
const HEIGHT = 444;
const ROW_H = 56;
const TOP = 70;

const INK = colorToNumber(Ink.tinta);
const PAPER = colorToNumber(Ink.cremaPapel);

/** What a feature hangs on a row of the panel (F16.4). */
export type RowDecorator = (row: Phaser.GameObjects.Container, item: ClothingDef) => void;

class Row extends Phaser.GameObjects.Container {
  readonly closeButton: Phaser.GameObjects.Container;
  private readonly cross: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, readonly item: ClothingDef) {
    super(scene, 0, 0);
    // A strip of the page: paper with a `borde` edge, like a line of the notebook.
    const bg = scene.add.graphics();
    bg.fillStyle(colorToNumber(Ink.cremaPapel), 1).fillRoundedRect(-WIDTH / 2 + 18, -26, WIDTH - 36, 52, 14);
    bg.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-WIDTH / 2 + 18, -26, WIDTH - 36, 52, 14);
    const icon = scene.add.image(-WIDTH / 2 + 52, 0, item.icon).setDisplaySize(40, 40);
    const label = scene.add.text(-WIDTH / 2 + 80, 0, item.name, { fontFamily: Fonts.Body, fontSize: '15px', color: Ink.tinta, fontStyle: '700', wordWrap: { width: 90 } }).setOrigin(0, 0.5);

    // The cross button: a small ink stamp (a disc with a paper ✕) that inverts on hover.
    this.cross = scene.add.graphics();
    this.paintCross(false);
    this.closeButton = scene.add.container(WIDTH / 2 - 40, 0, [this.cross]);
    this.closeButton.setSize(34, 34);
    this.closeButton.setInteractive({ hitArea: hitCircle(34, 3, 60), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    addHover(this.closeButton, 1.15);
    this.closeButton.on('pointerover', (p: Phaser.Input.Pointer) => { this.paintCross(true); hoverSfx(scene, p, 0.5); });
    this.closeButton.on('pointerout', () => this.paintCross(false));
    addPress(this.closeButton);
    this.closeButton.on('pointerdown', () => this.emit(ObjectEvents.LayerRemove, item));

    this.add([bg, icon, label, this.closeButton]);
  }

  private paintCross(hovered: boolean): void {
    const fill = hovered ? INK : PAPER;
    const line = hovered ? PAPER : INK;
    this.cross.clear();
    this.cross.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillCircle(1.5, 3, 15);
    this.cross.fillStyle(fill, 1).fillCircle(0, 0, 15);
    this.cross.lineStyle(3, INK, 1).strokeCircle(0, 0, 15);
    this.cross.lineStyle(3.5, line, 1).beginPath().moveTo(-5.5, -5.5).lineTo(5.5, 5.5).moveTo(5.5, -5.5).lineTo(-5.5, 5.5).strokePath();
  }
}

/** Panel with the worn layers, front to back, each with its ✕. Emits LayerRemove with the item. */
export class LayersPanel extends Phaser.GameObjects.Container {
  private rows = new Map<string, Row>();
  private decorators: RowDecorator[] = [];
  private readonly empty: Phaser.GameObjects.Text;
  private readonly card: Card;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    // A card of the notebook: its header is the title in Londrina over a pencil rule, and the empty page invites in handwriting.
    this.card = new Card(scene, WIDTH / 2, HEIGHT / 2, { width: WIDTH, height: HEIGHT, animate: false });
    const title = scene.add.text(WIDTH / 2, 36, 'Capas', { fontFamily: Fonts.Title, fontSize: '34px', color: Ink.tinta, padding: { x: 4, y: 6 } }).setOrigin(0.5);
    const rule = scene.add.graphics();
    rule.lineStyle(2, colorToNumber(Ink.lineaLapiz), 0.8);
    for (let lx = 36; lx < WIDTH - 36; lx += 20) rule.lineBetween(lx, 62, lx + 10, 62);
    this.empty = scene.add
      .text(WIDTH / 2, HEIGHT / 2 + 10, 'Arrastra una prenda\nal gatito', { fontFamily: Fonts.Voice, fontStyle: '700', fontSize: '26px', color: Ink.mutedTexto, align: 'center', padding: { x: 4, y: 8 } })
      .setOrigin(0.5).setAlpha(0.8);
    this.add([this.card, rule, title, this.empty]);
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
        this.scene.tweens.add({ targets: existing, y, duration: 200, ease: profileOf(this.scene).ease('Back.easeOut') });
        return;
      }
      const row = new Row(this.scene, item);
      row.on(ObjectEvents.LayerRemove, (it: ClothingDef) => this.emit(ObjectEvents.LayerRemove, it));
      row.setPosition(WIDTH / 2 + 40, y).setAlpha(0);
      this.add(row);
      this.rows.set(item.id, row);
      for (const decorate of this.decorators) decorate(row, item);
      this.scene.tweens.add({ targets: row, x: WIDTH / 2, alpha: 1, duration: 260, ease: profileOf(this.scene).ease('Back.easeOut') });
    });
    this.scene.tweens.add({ targets: this.empty, alpha: ordered.length === 0 ? 0.8 : 0, duration: 200 });
  }

  /**
   * Extension point (F16.4, like the grid's): `decorate` runs on every row the panel builds, and now on the rows that are
   * already there. The row is a Container in panel px (centered on 0, 0; 214 wide, 52 high): hang the decoration on it, it
   * leaves with the row. Returns the function that removes the decorator.
   */
  addRowDecorator(decorate: RowDecorator): () => void {
    this.decorators.push(decorate);
    for (const row of this.rows.values()) decorate(row, row.item);
    return () => {
      this.decorators = this.decorators.filter((d) => d !== decorate);
    };
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
