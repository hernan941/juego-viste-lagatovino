import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, colorToNumber } from '../../constants';
import type { Point } from '../../domain/types';
import { staggerDelays } from '../../domain/stagger';
import { profileOf } from '../../systems/motion';
import { killTweensDeep } from '../kit/appear';
import { hoverSfx } from '../hoverSfx';
import { addKitFeedback, kitHitRect } from '../ui';

export type TrayKind = 'backgrounds' | 'frames' | 'poses' | 'stickers';

/** One piece of a tray. `texture` is its art (poses have none: they show their name). */
export interface TrayEntry {
  id: string;
  name: string;
  texture?: string;
  open: boolean;
}

/** Cell sizes and the number of columns of each tray. Every cell is at least 80 x 80 (the touch minimum of the kit). */
const LAYOUT: Record<TrayKind, { w: number; h: number; cols: number }> = {
  backgrounds: { w: 88, h: 104, cols: 3 },
  frames: { w: 88, h: 104, cols: 3 },
  poses: { w: 138, h: 84, cols: 2 },
  stickers: { w: 88, h: 88, cols: 3 },
};
const GAP = 12;
const INK = colorToNumber(Ink.tinta);
const BORDER = colorToNumber(Ink.borde);
const CARD = colorToNumber(Ink.tarjeta);

/** Where each cell goes, relative to the tray origin (the top left of the first cell). */
export function trayCellPositions(kind: TrayKind, count: number): Point[] {
  const { w, h, cols } = LAYOUT[kind];
  return Array.from({ length: count }, (_, i) => ({ x: (i % cols) * (w + GAP) + w / 2, y: Math.floor(i / cols) * (h + GAP) + h / 2 }));
}

class TrayCell extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Container;
  private readonly ring: Phaser.GameObjects.Graphics;
  private moved = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly kind: TrayKind, readonly entry: TrayEntry, selected: boolean) {
    super(scene, x, y);
    const { w, h } = LAYOUT[kind];
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w, h, 14);
    g.fillStyle(entry.open ? CARD : colorToNumber(Ink.cremaPapel), 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (entry.open) g.lineStyle(3, BORDER, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    else this.dashed(g, w, h);
    this.ring = scene.add.graphics();
    this.ring.lineStyle(5, colorToNumber(Ink.sol), 1).strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 16);
    this.ring.setVisible(selected);
    this.face = scene.add.container(0, 0, [g, ...this.content(scene, w, h), this.ring]);
    this.add(this.face);
    this.setSize(w, h);
    this.setInteractive({ hitArea: kitHitRect(w, h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true, draggable: kind === 'stickers' && entry.open });
    addKitFeedback(this, this.face);
    this.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.4));
    this.on('pointerdown', () => { this.moved = false; });
    this.on('dragstart', (p: Phaser.Input.Pointer) => {
      this.moved = true;
      this.emit(ObjectEvents.TrayStickerGrab, entry.id, p);
    });
    this.on('pointerup', () => {
      if (this.moved) return;
      if (!entry.open) this.emit(ObjectEvents.TrayLocked, kind, entry.id);
      else if (kind === 'stickers') this.wiggle();
      else this.emit(ObjectEvents.TrayPick, kind, entry.id);
    });
  }

  private content(scene: Phaser.Scene, w: number, h: number): Phaser.GameObjects.GameObject[] {
    const { open, texture, name } = this.entry;
    const out: Phaser.GameObjects.GameObject[] = [];
    if (texture) {
      const img = scene.add.image(0, 0, texture);
      img.setScale(Math.min((w - 16) / img.width, (h - 16) / img.height));
      // A locked piece is only a sketch of itself.
      img.setAlpha(open ? 1 : 0.22);
      out.push(img);
    } else {
      out.push(scene.add.text(0, 0, name, { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '30px', color: open ? Ink.tinta : Ink.mutedTexto, padding: { x: 4, y: 6 } }).setOrigin(0.5).setAlpha(open ? 1 : 0.5));
    }
    if (!open) out.push(this.lock(scene, w / 2 - 18, h / 2 - 18));
    return out;
  }

  /** A little padlock in tinta, in the corner of a locked cell. */
  private lock(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics({ x, y });
    g.lineStyle(3, INK, 1).beginPath().arc(0, -3, 6, Math.PI, 0).strokePath();
    g.fillStyle(colorToNumber(Ink.sol), 1).fillRoundedRect(-9, -3, 18, 14, 4);
    g.lineStyle(3, INK, 1).strokeRoundedRect(-9, -3, 18, 14, 4);
    return g;
  }

  /** The hand-drawn dashed border of a sketch. */
  private dashed(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    g.lineStyle(3, colorToNumber(Ink.lineaLapiz), 1);
    const dash = (x1: number, y1: number, x2: number, y2: number) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      for (let d = 0; d < len - 6; d += 14) {
        g.lineBetween(x1 + ((x2 - x1) * d) / len, y1 + ((y2 - y1) * d) / len, x1 + ((x2 - x1) * (d + 7)) / len, y1 + ((y2 - y1) * (d + 7)) / len);
      }
    };
    dash(-w / 2 + 8, -h / 2, w / 2 - 8, -h / 2);
    dash(-w / 2 + 8, h / 2, w / 2 - 8, h / 2);
    dash(-w / 2, -h / 2 + 8, -w / 2, h / 2 - 8);
    dash(w / 2, -h / 2 + 8, w / 2, h / 2 - 8);
  }

  setSelected(on: boolean): void {
    this.ring.setVisible(on);
    if (!on) return;
    const p = profileOf(this.scene);
    this.scene.tweens.add({ targets: this.face, scale: { from: 1 + 0.12 * p.squash, to: 1 }, duration: 220, ease: p.ease('Back.easeOut') });
  }

  /** A short shake (a pulse with reduced motion): "not yet" for a locked piece and "grab me" for a sticker. */
  wiggle(): void {
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this.face);
    this.face.setAngle(0).setScale(1);
    if (p.shake === 0) {
      this.scene.tweens.add({ targets: this.face, scale: 1.06, duration: 90, yoyo: true, ease: 'Sine.easeOut' });
      return;
    }
    this.scene.tweens.add({ targets: this.face, angle: { from: -5, to: 5 }, duration: 60, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => this.face.setAngle(0) });
  }

  destroy(fromScene?: boolean): void {
    killTweensDeep(this.scene, this);
    this.scene?.tweens.killTweensOf(this.face);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}

/**
 * The strip of pieces of the photo mode: a grid of buttons (at least 80 x 80) of backgrounds, frames, poses or stickers. A
 * press on an open piece emits TrayPick (kind, id), on a locked one TrayLocked (kind, id), and a sticker pulled off the sheet
 * emits TrayStickerGrab (id, pointer). The origin is the top left of the first cell. A new page "turns in": the cells pop up one
 * after another (they only fade with reduced motion).
 */
export class PhotoTray extends Phaser.GameObjects.Container {
  private cells: TrayCell[] = [];
  private kind: TrayKind | null = null;
  private readonly chosen: Partial<Record<TrayKind, string | null>> = {};

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  /** Shows the pieces of `kind`, replacing the page that was there. */
  show(kind: TrayKind, entries: readonly TrayEntry[]): void {
    this.clearCells();
    this.kind = kind;
    const p = profileOf(this.scene);
    const spots = trayCellPositions(kind, entries.length);
    const delays = staggerDelays(entries.length, p.reduced ? 0 : 40);
    entries.forEach((entry, i) => {
      const cell = new TrayCell(this.scene, spots[i]!.x, spots[i]!.y, kind, entry, this.chosen[kind] === entry.id);
      cell.on(ObjectEvents.TrayPick, (...a: unknown[]) => this.emit(ObjectEvents.TrayPick, ...a));
      cell.on(ObjectEvents.TrayLocked, (...a: unknown[]) => {
        cell.wiggle();
        this.emit(ObjectEvents.TrayLocked, ...a);
      });
      cell.on(ObjectEvents.TrayStickerGrab, (...a: unknown[]) => this.emit(ObjectEvents.TrayStickerGrab, ...a));
      cell.setAlpha(0);
      if (!p.reduced) cell.setScale(0.8);
      this.add(cell);
      this.cells.push(cell);
      this.scene.tweens.add({ targets: cell, alpha: 1, scale: 1, duration: p.reduced ? 180 : 260, delay: delays[i], ease: p.ease('Back.easeOut') });
    });
  }

  /** Marks the chosen piece of a kind (remembered when that page is not showing). */
  select(kind: TrayKind, id: string | null): void {
    this.chosen[kind] = id;
    if (this.kind !== kind) return;
    for (const cell of this.cells) cell.setSelected(cell.entry.id === id);
  }

  /** Center of each cell of the page showing, in game coordinates, by piece id. */
  getCellCenters(): Record<string, Point> {
    const out: Record<string, Point> = {};
    for (const cell of this.cells) {
      const m = cell.getWorldTransformMatrix();
      out[cell.entry.id] = { x: m.tx, y: m.ty };
    }
    return out;
  }

  private clearCells(): void {
    for (const cell of this.cells) cell.destroy();
    this.cells = [];
  }

  destroy(fromScene?: boolean): void {
    this.clearCells();
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
