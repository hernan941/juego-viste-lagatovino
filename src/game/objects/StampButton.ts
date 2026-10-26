import Phaser from 'phaser';
import { Ink, colorToNumber } from '../constants';
import type { Point } from '../domain/types';
import { pressTarget, stampColors, stampHover } from '../systems/kit';
import { profileOf } from '../systems/motion';
import { hitCircle } from './ui';

export const STAMP_SIZE = 60;
const INK = colorToNumber(Ink.tinta);
const SUN = colorToNumber(Ink.sol);

/**
 * Round "notebook stamp" button of the Lagatovino kit (art-direction section 6, F12.R A3): a white disc with a 3 px ink border,
 * a flat 4 px shadow, an ink line icon, a little tilt at rest, and a `sol` sparkle in the corner while it is "on". Hover
 * inverts it (ink disc, paper icon); press shrinks it and drops it 2 px (also on a finger). The hit area is a circle of 80.
 * Subclasses draw their icon in `paintIcon` and set the behavior.
 */
export abstract class StampButton extends Phaser.GameObjects.Container {
  protected readonly stamp: Phaser.GameObjects.Container;
  protected readonly face: Phaser.GameObjects.Container;
  private readonly disc: Phaser.GameObjects.Graphics;
  private readonly spark: Phaser.GameObjects.Graphics;
  private hovering = false;

  protected constructor(scene: Phaser.Scene, x: number, y: number, private readonly restAngle: number) {
    super(scene, x, y);
    const shadow = scene.add.graphics();
    shadow.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillCircle(0, 4, STAMP_SIZE / 2);
    this.disc = scene.add.graphics();
    this.face = scene.add.container(0, 0, [this.disc]);
    this.spark = scene.add.graphics();
    this.spark.fillStyle(SUN, 1).fillPoints(sparklePoints(20, -20, 10), true);
    this.spark.lineStyle(2, INK, 1).strokePoints(sparklePoints(20, -20, 10), true);
    this.stamp = scene.add.container(0, 0, [shadow, this.face, this.spark]).setAngle(restAngle);
    this.add(this.stamp);
    scene.add.existing(this);
    this.setSize(STAMP_SIZE, STAMP_SIZE);
    this.setInteractive({ hitArea: hitCircle(STAMP_SIZE, 4, 80), hitAreaCallback: Phaser.Geom.Circle.Contains, useHandCursor: true });
    this.on('pointerover', () => this.hover(true));
    this.on('pointerout', () => { this.hover(false); this.press(false); });
    this.on('pointerdown', () => this.press(true));
    this.on('pointerup', () => this.press(false));
  }

  /** Subclasses call this once their icon objects exist (and `face` holds them): paints the resting look. */
  protected init(): void {
    this.repaint();
    this.setActiveMark(false, true);
  }

  /** Draws the icon with `ink` over a disc of `fill` (the halo of a "crossed out" line uses `fill`). */
  protected abstract paintIcon(ink: number, fill: number): void;

  private repaint(): void {
    const c = stampColors(this.hovering);
    const fill = colorToNumber(Ink[c.fill]);
    this.disc.clear();
    this.disc.fillStyle(fill, 1).fillCircle(0, 0, STAMP_SIZE / 2 - 1.5);
    this.disc.lineStyle(3, INK, 1).strokeCircle(0, 0, STAMP_SIZE / 2 - 1.5);
    this.paintIcon(colorToNumber(Ink[c.icon]), fill);
  }

  /** The `sol` sparkle of the corner: shown while the thing is on. */
  protected setActiveMark(on: boolean, instant = false): void {
    this.scene.tweens.killTweensOf(this.spark);
    if (instant) { this.spark.setAlpha(on ? 1 : 0); return; }
    this.scene.tweens.add({ targets: this.spark, alpha: on ? 1 : 0, duration: 150 });
  }

  private hover(on: boolean): void {
    this.hovering = on;
    this.repaint();
    const h = stampHover(this.restAngle, profileOf(this.scene).reduced);
    this.scene.tweens.add({ targets: this.stamp, scale: on ? h.scale : 1, angle: on ? h.angle : this.restAngle, duration: 100, ease: 'Sine.easeOut' });
  }

  private press(down: boolean): void {
    const p = pressTarget();
    this.scene.tweens.add({
      targets: this.face, scale: down ? p.scale : 1, y: down ? p.dy : 0, duration: down ? p.duration : 150,
      ease: down ? 'Sine.easeOut' : profileOf(this.scene).ease('Back.easeOut'),
    });
  }

  getCenter(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf([this.stamp, this.face, this.spark]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}

/** Four-pointed sparkle (the ✦ of the brand) around (cx, cy). */
function sparklePoints(cx: number, cy: number, r: number): Phaser.Math.Vector2[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const radius = i % 2 === 0 ? r : r * 0.35;
    return new Phaser.Math.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  });
}
