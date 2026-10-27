import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, SfxKeys, colorToNumber, type InkToken } from '../constants';
import type { Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { TAB_RISE, tabLayout } from '../systems/kit';
import { profileOf } from '../systems/motion';
import { addHover, addKitFeedback, addPress, hitRect, kitHitRect, type ScaleTo } from './ui';
import { hoverSfx } from './hoverSfx';

export interface TabDef {
  id: string;
  /** Spanish name, shown under the tabs when the tab is hovered or selected. */
  label: string;
  /** Texture key of the silhouette icon. */
  icon: string;
  /** Color of the index tab (a brand token of `Ink`); only the index style reads it. */
  color?: InkToken;
}

/** 'chip': the round pink tabs of the first stage. 'index': notebook index tabs of the brand colors (opt-in, F12.2). */
export type TabsStyle = 'chip' | 'index';
export interface TabsOptions {
  style?: TabsStyle;
}

export const TAB_SIZE = 54;
const TAB_GAP = 10;
const ICON_SIZE = 44;

class Tab extends Phaser.GameObjects.Container {
  private readonly view: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly scaleView: ScaleTo;
  private readonly index: boolean;
  private drawn = false;

  constructor(scene: Phaser.Scene, x: number, readonly def: TabDef, style: TabsStyle = 'chip') {
    super(scene, x + TAB_SIZE / 2, TAB_SIZE / 2);
    this.index = style === 'index';
    this.bg = scene.add.graphics();
    const icon = scene.add.image(0, 0, def.icon).setDisplaySize(ICON_SIZE, ICON_SIZE);
    this.view = scene.add.container(0, 0, [this.bg, icon]);
    this.add(this.view);
    this.setSize(TAB_SIZE, TAB_SIZE);
    const cap = { width: TAB_SIZE + TAB_GAP, height: TAB_SIZE + 16 };
    this.setInteractive({ hitArea: this.index ? kitHitRect(TAB_SIZE, TAB_SIZE, cap) : hitRect(TAB_SIZE, TAB_SIZE, cap), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    if (this.index) {
      addKitFeedback(this, this.view);
      this.scaleView = () => undefined;
    } else {
      this.scaleView = addHover(this, 1.1, this.view);
      addPress(this, this.view);
    }
    this.setSelected(false, true);
  }

  setSelected(active: boolean, silent = false): void {
    if (this.index) return this.setSelectedIndex(active, silent);
    this.bg.clear();
    this.bg.fillStyle(colorToNumber(Ink.sombraTarjeta), 1);
    this.bg.fillRoundedRect(-TAB_SIZE / 2, -TAB_SIZE / 2 + 5, TAB_SIZE, TAB_SIZE, 20);
    this.bg.fillStyle(colorToNumber(active ? Ink.rosa : Ink.tarjeta), 1);
    this.bg.fillRoundedRect(-TAB_SIZE / 2, -TAB_SIZE / 2, TAB_SIZE, TAB_SIZE, 20);
    if (active && !silent) {
      const p = profileOf(this.scene);
      this.scaleView(1 + 0.18 * p.squash, 90);
      this.scene.time.delayedCall(90, () => this.scene && this.scaleView(1, 160, p.ease('Back.easeOut')));
    }
  }

  /** Index tab: a flat card-colored tab with an ink border, rounded on top; the selected one sticks out TAB_RISE px. */
  private setSelectedIndex(active: boolean, silent: boolean): void {
    if (!this.drawn) {
      this.drawn = true;
      const color = colorToNumber(Ink[this.def.color ?? 'cielo']);
      const w = TAB_SIZE;
      const h = TAB_SIZE + TAB_RISE;
      this.bg.fillStyle(color, 1).fillRoundedRect(-w / 2, -TAB_SIZE / 2, w, h, { tl: 14, tr: 14, bl: 0, br: 0 });
      this.bg.lineStyle(3, colorToNumber(Ink.tinta), 1).strokeRoundedRect(-w / 2, -TAB_SIZE / 2, w, h, { tl: 14, tr: 14, bl: 0, br: 0 });
    }
    const y = active ? -TAB_RISE : 0;
    this.scene.tweens.killTweensOf(this.view);
    if (silent) {
      this.view.y = y;
      return;
    }
    this.scene.tweens.add({ targets: this.view, y, duration: 160, ease: profileOf(this.scene).ease('Back.easeOut') });
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
  private readonly scn: Phaser.Scene;
  private readonly style: TabsOptions['style'];

  constructor(scene: Phaser.Scene, x: number, y: number, defs: readonly TabDef[], options: TabsOptions = {}) {
    super(scene, x, y);
    this.scn = scene;
    this.style = options.style;
    // The name of the tab is handwriting in ink, under the row.
    this.caption = scene.add.text(0, TAB_SIZE + 30, '', { fontFamily: Fonts.Voice, fontStyle: '700', fontSize: '30px', color: Ink.tinta, padding: { x: 4, y: 8 } }).setOrigin(0.5);
    this.add(this.caption);
    for (const def of defs) this.append(def);
    scene.add.existing(this);
  }

  private append(def: TabDef): void {
    const tab = new Tab(this.scn, tabLayout(this.tabs.length + 1, -1, TAB_SIZE, TAB_GAP)[this.tabs.length]!.x, def, this.style);
    tab.on('pointerdown', () => this.select(def.id));
    tab.on('pointerover', (p: Phaser.Input.Pointer) => {
      this.showCaption(def.id);
      hoverSfx(this.scn, p, 0.5);
    });
    tab.on('pointerout', () => this.showCaption(null));
    this.add(tab);
    this.tabs.push(tab);
    this.caption.x = (this.tabs.length * TAB_SIZE + (this.tabs.length - 1) * TAB_GAP) / 2;
  }

  /**
   * Extension point (ADR 0019): adds a tab at the end of the row (a feature's own tab). The row stays centered on the same
   * middle point. The tab emits TabSelect with its id like any other; the scene ignores the ids it does not know.
   */
  addTab(def: TabDef): void {
    this.append(def);
    this.x -= (TAB_SIZE + TAB_GAP) / 2;
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
