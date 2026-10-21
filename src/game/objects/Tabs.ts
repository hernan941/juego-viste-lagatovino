import Phaser from 'phaser';
import { ObjectEvents, Palette, SfxKeys } from '../constants';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { addHover, addPress, hex, makeText, type ScaleTo } from './ui';

export interface TabDef {
  id: string;
  /** Spanish name, shown under the tabs when the tab is hovered or selected. */
  label: string;
  /** Texture key of the silhouette icon. */
  icon: string;
}

export const TAB_SIZE = 54;
const TAB_GAP = 10;
const ICON_SIZE = 44;

class Tab extends Phaser.GameObjects.Container {
  private readonly view: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly scaleView: ScaleTo;

  constructor(scene: Phaser.Scene, x: number, readonly def: TabDef) {
    super(scene, x + TAB_SIZE / 2, TAB_SIZE / 2);
    this.bg = scene.add.graphics();
    const icon = scene.add.image(0, 0, def.icon).setDisplaySize(ICON_SIZE, ICON_SIZE);
    this.view = scene.add.container(0, 0, [this.bg, icon]);
    this.add(this.view);
    this.setSize(TAB_SIZE, TAB_SIZE);
    this.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, TAB_SIZE, TAB_SIZE), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.scaleView = addHover(this, 1.1, this.view);
    addPress(this, this.view);
    this.setSelected(false, true);
  }

  setSelected(active: boolean, silent = false): void {
    this.bg.clear();
    this.bg.fillStyle(hex('rosa600'), 0.18);
    this.bg.fillRoundedRect(-TAB_SIZE / 2, -TAB_SIZE / 2 + 5, TAB_SIZE, TAB_SIZE, 20);
    this.bg.fillStyle(active ? hex('rosa400') : hex('rosa200'), 1);
    this.bg.fillRoundedRect(-TAB_SIZE / 2, -TAB_SIZE / 2, TAB_SIZE, TAB_SIZE, 20);
    if (active && !silent) {
      const p = profileOf(this.scene);
      this.scaleView(1 + 0.18 * p.squash, 90);
      this.scene.time.delayedCall(90, () => this.scene && this.scaleView(1, 160, p.ease('Back.easeOut')));
    }
  }
}

/**
 * Category tabs: round icons with the name of the hovered (or selected) one underneath.
 * Emits TabSelect with the tab id.
 */
export class Tabs extends Phaser.GameObjects.Container {
  private readonly tabs: Tab[] = [];
  private readonly caption: Phaser.GameObjects.Text;
  private current: string | null = null;
  private hovered: string | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, defs: readonly TabDef[]) {
    super(scene, x, y);
    defs.forEach((def, i) => {
      const tab = new Tab(scene, i * (TAB_SIZE + TAB_GAP), def);
      tab.on('pointerdown', () => this.select(def.id));
      tab.on('pointerover', () => {
        this.showCaption(def.id);
        getAudio(scene).play(SfxKeys.Hover, { volume: 0.5 });
      });
      tab.on('pointerout', () => this.showCaption(null));
      this.add(tab);
      this.tabs.push(tab);
    });
    const width = defs.length * TAB_SIZE + (defs.length - 1) * TAB_GAP;
    this.caption = makeText(scene, width / 2, TAB_SIZE + 30, '', 26, Palette.rosa600);
    this.add(this.caption);
    scene.add.existing(this);
  }

  get selectedId(): string | null {
    return this.current;
  }

  select(id: string, silent = false): void {
    if (id === this.current) return;
    this.current = id;
    if (!silent) getAudio(this.scene).play(SfxKeys.Click);
    for (const t of this.tabs) t.setSelected(t.def.id === id, silent);
    this.showCaption(this.hovered, true);
    if (!silent) this.emit(ObjectEvents.TabSelect, id);
  }

  /** Writes the name of the hovered tab (or the selected one when nothing is hovered), fading it in. */
  private showCaption(hoveredId: string | null, force = false): void {
    if (hoveredId === this.hovered && !force) return;
    this.hovered = hoveredId;
    const id = hoveredId ?? this.current;
    const label = this.tabs.find((t) => t.def.id === id)?.def.label ?? '';
    if (this.caption.text === label) return;
    this.caption.setText(label);
    this.scene.tweens.killTweensOf(this.caption);
    this.caption.setAlpha(0).setY(TAB_SIZE + 36);
    this.scene.tweens.add({ targets: this.caption, alpha: 1, y: TAB_SIZE + 30, duration: 160, ease: profileOf(this.scene).ease('Back.easeOut') });
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
