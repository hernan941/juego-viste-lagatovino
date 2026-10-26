import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents, SfxKeys } from '../../constants';
import type { AlbumTab, AlbumTabId } from '../../domain/albumPages';
import type { Point } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { TAB_RISE } from '../../systems/kit';
import { profileOf } from '../../systems/motion';
import { addKitFeedback, kitHitRect } from '../ui';
import { hoverSfx } from '../hoverSfx';

/** The art is 220 x 96; the five tabs fit above the page at this scale. */
const TAB_SCALE = 0.8;
const TAB_W = 220 * TAB_SCALE;
const TAB_H = 96 * TAB_SCALE;
const TAB_GAP = 8;

class AlbumTabView extends Phaser.GameObjects.Container {
  readonly view: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, readonly def: AlbumTab) {
    super(scene, x, -TAB_H / 2);
    const art = scene.add.image(0, 0, def.icon).setDisplaySize(TAB_W, TAB_H);
    // The text goes in the middle of the art (art-direction v2: "el texto lo pone Phaser").
    const label = scene.add.text(0, 2, def.label, { fontFamily: Fonts.Title, fontSize: '28px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
    this.view = scene.add.container(0, 0, [art, label]);
    this.add(this.view);
    this.setSize(TAB_W, TAB_H);
    this.setInteractive({ hitArea: kitHitRect(TAB_W, TAB_H), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    addKitFeedback(this, this.view);
    if (!def.enabled) this.setAlpha(0.5);
  }
}

/**
 * The five index tabs of the notebook (art-direction v2 section 6.3). Each one is the art of `ui/album/tab-*.svg` with its name on top;
 * the selected one rises TAB_RISE px. A disabled tab (the hanger, until F19.5) wobbles and emits TabLocked instead of selecting.
 */
export class AlbumTabs extends Phaser.GameObjects.Container {
  private readonly tabs: AlbumTabView[] = [];
  private current: AlbumTabId | null = null;

  /** `x` is the middle of the row and `y` the bottom edge of the tabs (where they touch the page). */
  constructor(scene: Phaser.Scene, x: number, y: number, defs: readonly AlbumTab[]) {
    super(scene, x, y);
    const span = defs.length * TAB_W + (defs.length - 1) * TAB_GAP;
    defs.forEach((def, i) => {
      const tab = new AlbumTabView(scene, -span / 2 + TAB_W / 2 + i * (TAB_W + TAB_GAP), def);
      tab.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.5));
      tab.on('pointerdown', () => (def.enabled ? this.select(def.id) : this.lock(tab)));
      this.add(tab);
      this.tabs.push(tab);
    });
    scene.add.existing(this);
  }

  get selectedId(): AlbumTabId | null {
    return this.current;
  }

  /** Selects a tab and says so (TabSelect), unless it is already the selected one or it is disabled. */
  select(id: AlbumTabId, silent = false): void {
    const tab = this.tabs.find((t) => t.def.id === id);
    if (!tab || !tab.def.enabled || id === this.current) return;
    this.current = id;
    for (const t of this.tabs) this.rise(t, t === tab, silent);
    if (silent) return;
    getAudio(this.scene).play(SfxKeys.Click);
    this.emit(ObjectEvents.TabSelect, id);
  }

  private rise(tab: AlbumTabView, up: boolean, silent: boolean): void {
    const y = up ? -TAB_RISE : 0;
    this.scene.tweens.killTweensOf(tab.view);
    if (silent) {
      tab.view.y = y;
      return;
    }
    this.scene.tweens.add({ targets: tab.view, y, duration: 160, ease: profileOf(this.scene).ease('Back.easeOut') });
  }

  /** The disabled tab shakes its head a little (nothing shakes with reduced motion) and tells the scene. */
  private lock(tab: AlbumTabView): void {
    const amount = 4 * profileOf(this.scene).shake;
    if (amount > 0) {
      this.scene.tweens.killTweensOf(tab.view);
      tab.view.setAngle(0);
      this.scene.tweens.add({ targets: tab.view, angle: { from: -amount, to: amount }, duration: 70, yoyo: true, repeat: 2, onComplete: () => tab.view.setAngle(0) });
    }
    this.emit(ObjectEvents.TabLocked, tab.def.id);
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
    for (const t of this.tabs) this.scene?.tweens?.killTweensOf(t.view);
    this.scene?.tweens?.killTweensOf(this);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
