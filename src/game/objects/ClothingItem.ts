import Phaser from 'phaser';
import { ObjectEvents, SfxKeys, TextureKeys } from '../constants';
import type { ClothingDef, Rect } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { addHover, hex, type ScaleTo } from './ui';

export const CELL_SIZE = 104;

/**
 * A wardrobe cell: the item icon, draggable. Emits ItemDragStart / ItemDrag / ItemDragEnd, and ItemClick
 * when it is pressed and released without dragging (equipping is only by dragging, ADR 0008, so the
 * cell answers with a wiggle and the scene points to the cat).
 *
 * The pop-in animates the Container itself; hover, press and wiggle animate the `view` child, so
 * none of them cancels the others.
 */
export class ClothingItem extends Phaser.GameObjects.Container {
  readonly item: ClothingDef;
  private readonly view: Phaser.GameObjects.Container;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly wornRing: Phaser.GameObjects.Graphics;
  /** Twinkling star on the secret items won from a combo (F8). */
  private readonly badge?: Phaser.GameObjects.Image;
  private readonly scaleView: ScaleTo;
  private wiggleTween?: Phaser.Tweens.Tween;
  private dragged = false;
  private ringFactor = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, item: ClothingDef) {
    super(scene, x, y);
    this.item = item;
    this.icon = scene.add.image(0, 0, item.icon).setDisplaySize(CELL_SIZE, CELL_SIZE);
    this.wornRing = scene.add.graphics().setAlpha(0);
    this.wornRing.lineStyle(5, hex('menta'), 1).strokeRoundedRect(-CELL_SIZE / 2 - 2, -CELL_SIZE / 2 - 2, CELL_SIZE + 4, CELL_SIZE + 4, 16);
    this.view = scene.add.container(0, 0, [this.icon, this.wornRing]);
    if (item.secret) {
      this.badge = scene.add.image(CELL_SIZE / 2 - 12, -CELL_SIZE / 2 + 12, TextureKeys.Sparkle).setScale(0.78);
      this.view.add(this.badge);
      if (profileOf(scene).loops) scene.tweens.add({ targets: this.badge, angle: 90, scale: { from: 0.6, to: 0.95 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add(this.view);

    this.setSize(CELL_SIZE, CELL_SIZE);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, CELL_SIZE, CELL_SIZE),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      draggable: true,
      useHandCursor: true,
    });
    this.scaleView = addHover(this, 1.05, this.view);
    this.on('pointerover', () => getAudio(scene).play(SfxKeys.Hover, { volume: 0.35 }));
    this.on('pointerdown', () => {
      this.dragged = false;
      this.scaleView(0.92, 60);
    });
    this.on('pointerup', () => {
      this.scaleView(1.05, 100);
      if (!this.dragged) {
        this.wiggle();
        this.emit(ObjectEvents.ItemClick, this);
      }
    });
    this.on('dragstart', (p: Phaser.Input.Pointer) => {
      this.dragged = true;
      this.emit(ObjectEvents.ItemDragStart, this, p);
    });
    this.on('drag', (p: Phaser.Input.Pointer) => this.emit(ObjectEvents.ItemDrag, this, p));
    this.on('dragend', (p: Phaser.Input.Pointer) => {
      this.scaleView(1, 100);
      this.emit(ObjectEvents.ItemDragEnd, this, p);
    });
  }

  /** Limits the part of the cell that answers to the pointer (the visible part, in cell-local px), or none. */
  setHitRect(rect: Rect | null): void {
    const hit = this.input?.hitArea as Phaser.Geom.Rectangle | undefined;
    hit?.setTo(rect?.x ?? 0, rect?.y ?? 0, rect?.width ?? 0, rect?.height ?? 0);
  }

  /**
   * Draws only the part of the cell inside `visible` (cell-local px, 0..104), or nothing when null:
   * this is how the grid clips its cells to the viewport. The ring fades with the visible fraction.
   */
  setClip(visible: Rect | null): void {
    const full = !!visible && visible.y <= 0 && visible.height >= CELL_SIZE;
    if (full || !visible) {
      this.icon.setCrop();
      this.icon.setVisible(full);
      this.ringFactor = full ? 1 : 0;
    } else {
      const k = this.icon.frame.realHeight / CELL_SIZE;
      this.icon.setVisible(true);
      this.icon.setCrop(0, visible.y * k, this.icon.frame.realWidth, visible.height * k);
      this.ringFactor = visible.height / CELL_SIZE;
    }
    this.wornRing.setVisible(this.ringFactor >= 1);
    this.badge?.setVisible(this.ringFactor >= 1);
  }

  /** A short side to side shake: angle -6 to 6, yoyo, 2 repeats, 60 ms. */
  wiggle(): void {
    const p = profileOf(this.scene);
    this.wiggleTween?.remove();
    this.view.setAngle(0);
    if (p.shake === 0) {
      // Reduced motion: no shake, a soft pulse answers the click instead.
      this.wiggleTween = this.scene.tweens.add({ targets: this.view, scale: 1.06, duration: 90, yoyo: true, ease: 'Sine.easeOut' });
      return;
    }
    this.wiggleTween = this.scene.tweens.add({
      targets: this.view, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 2, ease: 'Sine.easeInOut',
      onComplete: () => this.view.setAngle(0),
    });
  }

  /** A happy pop when a secret lands in its cell (the sparkles come from the scene). */
  celebrate(): void {
    const p = profileOf(this.scene);
    this.scene.tweens.chain({
      targets: this.view,
      tweens: [
        { scale: 1 + 0.3 * p.squash, duration: 140, ease: 'Sine.easeOut' },
        { scale: 1, duration: 260, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  /** The cell looks empty while its item is in the player's hand. */
  setLifted(lifted: boolean): void {
    this.scene.tweens.add({ targets: this.icon, alpha: lifted ? 0.3 : 1, duration: 120 });
  }

  /** A mint ring marks the items that are being worn. */
  setWorn(worn: boolean): void {
    this.scene.tweens.add({ targets: this.wornRing, alpha: worn ? 1 : 0, duration: 150 });
  }

  /** Pop-in used when the grid fills (0.8 to 1.05 to 1, 250 ms). */
  popIn(delay: number): void {
    const p = profileOf(this.scene);
    this.setScale(1 - 0.2 * p.squash).setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 120, delay });
    this.scene.tweens.chain({
      targets: this,
      delay,
      tweens: [{ scale: 1 + 0.05 * p.squash, duration: 150, ease: 'Sine.easeOut' }, { scale: 1, duration: 100, ease: p.ease('Back.easeOut') }],
    });
  }

  /** A prize cell that was kept invisible appears with a pop (0.2 to 1.15 to 1) right when the prize lands. */
  revealPop(): void {
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this);
    this.setVisible(true).setAlpha(p.reduced ? 0 : 1).setScale(p.reduced ? 0.9 : 0.2);
    if (p.reduced) this.scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
    this.scene.tweens.chain({
      targets: this,
      tweens: [{ scale: 1 + 0.15 * p.squash, duration: 160, ease: 'Sine.easeOut' }, { scale: 1, duration: 220, ease: p.ease('Back.easeOut') }],
    });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf([this, this.view, this.icon, this.wornRing, ...(this.badge ? [this.badge] : [])]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
