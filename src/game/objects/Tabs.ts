import Phaser from 'phaser';
import { ObjectEvents, Palette } from '../constants';
import type { Point } from '../domain/types';
import { addHover, hex, makeText } from './ui';

export interface TabDef {
  id: string;
  label: string;
}

const TAB_H = 52;
const TAB_GAP = 12;

class Tab extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, readonly def: TabDef, readonly width: number) {
    super(scene, x + width / 2, TAB_H / 2);
    this.bg = scene.add.graphics();
    this.text = makeText(scene, 0, 0, def.label, 24);
    this.add([this.bg, this.text]);
    this.setSize(width, TAB_H);
    this.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, width, TAB_H), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    addHover(this);
    this.setSelected(false);
  }

  setSelected(active: boolean): void {
    this.bg.clear();
    this.bg.fillStyle(hex('rosa600'), 0.18);
    this.bg.fillRoundedRect(-this.width / 2, -TAB_H / 2 + 5, this.width, TAB_H, 22);
    this.bg.fillStyle(active ? hex('rosa400') : hex('rosa200'), 1);
    this.bg.fillRoundedRect(-this.width / 2, -TAB_H / 2, this.width, TAB_H, 22);
    this.text.setColor(active ? '#FFFFFF' : Palette.texto);
    if (active) {
      this.scene.tweens.chain({ targets: this, tweens: [{ scale: 1.1, duration: 90, ease: 'Sine.easeOut' }, { scale: 1, duration: 120, ease: 'Back.easeOut' }] });
    }
  }
}

/** Category tabs. Emits TabSelect with the tab id. */
export class Tabs extends Phaser.GameObjects.Container {
  private readonly tabs: Tab[] = [];
  private current: string | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, defs: readonly TabDef[], tabWidth = 150) {
    super(scene, x, y);
    defs.forEach((def, i) => {
      const tab = new Tab(scene, i * (tabWidth + TAB_GAP), def, tabWidth);
      tab.on('pointerdown', () => this.select(def.id));
      this.add(tab);
      this.tabs.push(tab);
    });
    scene.add.existing(this);
  }

  get selectedId(): string | null {
    return this.current;
  }

  select(id: string, silent = false): void {
    if (id === this.current) return;
    this.current = id;
    for (const t of this.tabs) t.setSelected(t.def.id === id);
    if (!silent) this.emit(ObjectEvents.TabSelect, id);
  }

  /** Tab centers in game coordinates, by id. */
  getTabPositions(): Record<string, Point> {
    const out: Record<string, Point> = {};
    for (const t of this.tabs) {
      const m = t.getWorldTransformMatrix();
      out[t.def.id] = { x: m.tx, y: m.ty };
    }
    return out;
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
