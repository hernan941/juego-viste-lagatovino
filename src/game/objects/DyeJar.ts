import Phaser from 'phaser';
import { Fonts, Ink, ObjectEvents } from '../constants';
import { dyeKey } from '../data/assets';
import type { DyeDef, Point } from '../domain/types';
import { profileOf } from '../systems/motion';
import { hoverSfx } from './hoverSfx';
import { addHover, hitRect, type ScaleTo } from './ui';

/** The bottle in its cell: the art is 128 x 176, drawn at the height of a wardrobe cell (104). */
export const JAR_W = 76;
export const JAR_H = 104;
const LABEL_Y = JAR_H / 2 + 20;

/**
 * A dye bottle in the dye tab: draggable, with its name under it. Emits JarDragStart / JarDrag / JarDragEnd (jar, pointer)
 * and JarClick when it is pressed and released without dragging (a dye goes on by dragging, ADR 0008: the cell wiggles).
 * The container is the cell (pop-in, lifted); hover, press and wiggle animate the `view`, so none cancels another.
 */
export class DyeJar extends Phaser.GameObjects.Container {
  readonly dye: DyeDef;
  private readonly view: Phaser.GameObjects.Container;
  private readonly bottle: Phaser.GameObjects.Image;
  private readonly scaleView: ScaleTo;
  private wiggleTween?: Phaser.Tweens.Tween;
  private dragged = false;

  constructor(scene: Phaser.Scene, x: number, y: number, dye: DyeDef) {
    super(scene, x, y);
    this.dye = dye;
    this.bottle = scene.add.image(0, 0, dyeKey(dye.id)).setDisplaySize(JAR_W, JAR_H);
    const label = scene.add.text(0, LABEL_Y, dye.name, { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '22px', color: Ink.tinta }).setOrigin(0.5);
    this.view = scene.add.container(0, 0, [this.bottle, label]);
    this.add(this.view);

    this.setSize(JAR_W, JAR_H + 36);
    this.setInteractive({ hitArea: hitRect(JAR_W, JAR_H + 36, { width: JAR_W + 14, height: JAR_H + 44 }), hitAreaCallback: Phaser.Geom.Rectangle.Contains, draggable: true, useHandCursor: true });
    this.scaleView = addHover(this, 1.06, this.view);
    this.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.35));
    this.on('pointerdown', () => {
      this.dragged = false;
      this.scaleView(0.94, 60);
    });
    this.on('pointerup', () => {
      this.scaleView(1.06, 100);
      if (!this.dragged) {
        this.wiggle();
        this.emit(ObjectEvents.JarClick, this);
      }
    });
    this.on('dragstart', (p: Phaser.Input.Pointer) => {
      this.dragged = true;
      this.emit(ObjectEvents.JarDragStart, this, p);
    });
    this.on('drag', (p: Phaser.Input.Pointer) => this.emit(ObjectEvents.JarDrag, this, p));
    this.on('dragend', (p: Phaser.Input.Pointer) => {
      this.scaleView(1, 100);
      this.emit(ObjectEvents.JarDragEnd, this, p);
    });
  }

  /** Center of the bottle in game coordinates (where the dragged one flies back to). */
  getCenter(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  /** Pop-in used when the tab opens (0.8 to 1.05 to 1), one bottle after another. */
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

  /** The bottle in the hand leaves a ghost behind: the cell looks empty while it is held. */
  setLifted(lifted: boolean): void {
    this.scene.tweens.add({ targets: this.bottle, alpha: lifted ? 0.3 : 1, duration: 120 });
  }

  /** The cell pops (1.1 to 1) when its bottle comes back to it. */
  receivePop(): void {
    const p = profileOf(this.scene);
    this.scene.tweens.chain({
      targets: this.view,
      tweens: [
        { scale: 1 + 0.1 * Math.max(p.squash, 0.3), duration: 90, ease: 'Sine.easeOut' },
        { scale: 1, duration: 160, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  /** A short side to side shake (a soft pulse with reduced motion). */
  wiggle(): void {
    const p = profileOf(this.scene);
    this.wiggleTween?.remove();
    this.view.setAngle(0);
    if (p.shake === 0) {
      this.wiggleTween = this.scene.tweens.add({ targets: this.view, scale: 1.06, duration: 90, yoyo: true, ease: 'Sine.easeOut' });
      return;
    }
    this.wiggleTween = this.scene.tweens.add({
      targets: this.view, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 2, ease: 'Sine.easeInOut',
      onComplete: () => this.view.setAngle(0),
    });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf([this, this.view, this.bottle]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
