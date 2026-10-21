import Phaser from 'phaser';
import { FONT_FAMILY, ObjectEvents, Palette, SfxKeys, TextureKeys } from '../constants';
import type { ClothingDef, Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { addHover, hex } from './ui';

/** How far the bow has to be pulled from its knot to open the box (game px). */
export const BOW_PULL = 70;
/** How long the prize floats above the box before flying to its tab (ms). */
export const FLOAT_MS = 600;

/**
 * The gift box of a combo (F8). It drops in from above; the player opens it by DRAGGING the bow away
 * (only dragging, ADR 0008). Letting go too early springs the bow back. When it opens, the prize
 * rises out of the box with a burst of sparkles and `GiftOpened` is emitted with the prize image,
 * which the scene then flies to the wardrobe.
 */
export class GiftBox extends Phaser.GameObjects.Container {
  readonly comboId: string;
  readonly item: ClothingDef;
  private readonly lid: Phaser.GameObjects.Container;
  private readonly bow: Phaser.GameObjects.Container;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly bowRest = { x: 0, y: -64 };
  private landed = false;
  private open = false;

  constructor(scene: Phaser.Scene, x: number, y: number, comboId: string, item: ClothingDef) {
    super(scene, x, -120);
    this.comboId = comboId;
    this.item = item;
    const body = scene.add.graphics();
    body.fillStyle(hex('rosa600'), 0.2).fillRoundedRect(-58, -6 + 10, 120, 92, 14);
    body.fillStyle(hex('rosa400'), 1).fillRoundedRect(-60, -10, 120, 92, 14);
    body.lineStyle(4, hex('contorno'), 1).strokeRoundedRect(-60, -10, 120, 92, 14);
    body.fillStyle(hex('mantequilla'), 1).fillRect(-12, -10, 24, 92);
    body.lineStyle(3, hex('contorno'), 1).strokeRect(-12, -10, 24, 92);
    body.fillStyle(0xffffff, 0.55).fillRoundedRect(-48, 6, 20, 6, 3);

    const lid = scene.add.graphics();
    lid.fillStyle(hex('rosa600'), 1).fillRoundedRect(-70, -44, 140, 38, 12);
    lid.lineStyle(4, hex('contorno'), 1).strokeRoundedRect(-70, -44, 140, 38, 12);
    lid.fillStyle(hex('mantequilla'), 1).fillRect(-12, -44, 24, 38);
    lid.lineStyle(3, hex('contorno'), 1).strokeRect(-12, -44, 24, 38);
    this.lid = scene.add.container(0, 0, [lid]);

    const bowArt = scene.add.graphics();
    bowArt.fillStyle(hex('mantequilla'), 1).lineStyle(4, hex('contorno'), 1);
    bowArt.fillEllipse(-22, 0, 40, 30).strokeEllipse(-22, 0, 40, 30);
    bowArt.fillEllipse(22, 0, 40, 30).strokeEllipse(22, 0, 40, 30);
    bowArt.fillStyle(hex('rosa200'), 1).fillCircle(0, 4, 11).strokeCircle(0, 4, 11);
    this.bow = scene.add.container(this.bowRest.x, this.bowRest.y, [bowArt]);
    this.bow.setSize(90, 56);
    this.bow.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, 90, 56), hitAreaCallback: Phaser.Geom.Rectangle.Contains, draggable: true, useHandCursor: true });
    addHover(this.bow, 1.12);
    this.bow.on('pointerover', () => getAudio(scene).play(SfxKeys.Hover, { volume: 0.4 }));
    this.bow.on('dragstart', () => this.onBowGrab());
    this.bow.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => this.onBowDrag(dragX, dragY));
    this.bow.on('dragend', () => this.onBowRelease());

    this.hint = scene.add
      .text(0, 108, '¡Arrastra el moño!', { fontFamily: FONT_FAMILY, fontSize: '22px', color: Palette.texto, fontStyle: '600', padding: { x: 4, y: 6 } })
      .setOrigin(0.5)
      .setAlpha(0);

    this.add([body, this.lid, this.bow, this.hint]);
    this.setDepth(3000);
    scene.add.existing(this);
    this.drop(y);
  }

  /** True once it has landed and waits for the bow to be pulled. */
  get ready(): boolean {
    return this.landed && !this.open;
  }

  get opened(): boolean {
    return this.open;
  }

  /** Where to grab the bow, in game coordinates. */
  getBowPoint(): Point {
    const m = this.bow.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  getCenter(): Point {
    return { x: this.x, y: this.y + 36 };
  }

  private drop(y: number): void {
    this.scene.tweens.add({
      targets: this, y, duration: 650, ease: profileOf(this.scene).ease('Bounce.easeOut'),
      onComplete: () => {
        this.landed = true;
        getAudio(this.scene).play(SfxKeys.Drop, { volume: 0.9 });
        this.scene.tweens.add({ targets: this.hint, alpha: 1, duration: 300 });
        this.wobbleBow();
        if (profileOf(this.scene).loops) this.scene.tweens.add({ targets: this.hint, y: 116, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
  }

  /** The bow calls for a pull by wiggling; with reduced motion it breathes in scale instead (no angle swing). */
  private wobbleBow(): void {
    const p = profileOf(this.scene);
    if (p.shake > 0) this.scene.tweens.add({ targets: this.bow, angle: { from: -9 * p.shake, to: 9 * p.shake }, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    else this.scene.tweens.add({ targets: this.bow, scale: { from: 1, to: 1.08 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private onBowGrab(): void {
    if (!this.ready) return;
    this.scene.tweens.killTweensOf(this.bow);
    this.bow.setAngle(0).setScale(1);
    getAudio(this.scene).play(SfxKeys.Grab);
  }

  private onBowDrag(dragX: number, dragY: number): void {
    if (!this.ready) return;
    this.bow.setPosition(dragX, dragY);
    const pull = Math.hypot(dragX - this.bowRest.x, dragY - this.bowRest.y);
    // The lid shivers more the closer the bow is to coming off.
    this.lid.setAngle(Math.sin(this.scene.time.now / 35) * Math.min(4, pull / 18) * profileOf(this.scene).shake);
    if (pull >= BOW_PULL) this.openBox();
  }

  private onBowRelease(): void {
    if (!this.ready) return;
    getAudio(this.scene).play(SfxKeys.Return, { volume: 0.5 });
    this.lid.setAngle(0);
    this.scene.tweens.add({ targets: this.bow, x: this.bowRest.x, y: this.bowRest.y, duration: 260, ease: profileOf(this.scene).ease('Back.easeOut') });
    this.scene.time.delayedCall(300, () => this.scene && this.ready && this.wobbleBow());
  }

  private openBox(): void {
    if (this.open) return;
    this.open = true;
    this.bow.disableInteractive();
    const scene = this.scene;
    const audio = getAudio(scene);
    audio.play(SfxKeys.Gift);
    audio.play(SfxKeys.Remove, { rate: 1.3, volume: 0.7 });
    scene.tweens.killTweensOf([this.hint, this.bow, this.lid]);
    scene.tweens.add({ targets: this.hint, alpha: 0, duration: 150 });
    scene.tweens.add({ targets: this.bow, y: this.bow.y - 120, x: this.bow.x + 60, angle: 200 * profileOf(scene).spin, alpha: 0, duration: 450, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: this.lid, y: -110, angle: -24 * profileOf(scene).shake, alpha: 0, duration: 500, ease: profileOf(scene).ease('Back.easeOut') });

    const at = this.getCenter();
    const burst = scene.add
      .particles(0, 0, TextureKeys.Sparkle, {
        emitting: false, speed: { min: 120, max: 380 }, angle: { min: 200, max: 340 }, gravityY: 300,
        lifespan: { min: 600, max: 1000 }, scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 },
      })
      .setDepth(3600);
    burst.explode(profileOf(scene).count(28), at.x, at.y - 20);
    scene.time.delayedCall(1200, () => burst.destroy());

    // The prize rises out of the box, growing and glowing.
    const glow = scene.add.graphics().setDepth(3590).setAlpha(0);
    glow.fillStyle(hex('mantequilla'), 0.9).fillCircle(0, 0, 90);
    glow.setPosition(at.x, at.y - 120);
    // Only the garment (its texture), not the cream tile of the wardrobe icon.
    const prize = scene.add.image(at.x, at.y - 10, this.item.texture).setDisplaySize(30, 30).setDepth(3610);
    const grow = { size: 30 };
    scene.tweens.add({ targets: glow, alpha: 0.5, scale: { from: 0.3, to: 1.2 }, duration: 500, ease: 'Sine.easeOut' });
    scene.tweens.add({
      targets: grow, size: 260, duration: 650, ease: profileOf(scene).ease('Back.easeOut'), onUpdate: () => prize.setDisplaySize(grow.size, grow.size),
    });
    scene.tweens.add({
      targets: prize, y: at.y - 190, duration: 650, ease: profileOf(scene).ease('Back.easeOut'),
      onComplete: () => {
        // It floats for a moment above the box, shining, so the player sees what it is.
        glow.setPosition(prize.x, prize.y);
        scene.tweens.add({ targets: glow, scale: { from: 1.2, to: 1.4 }, duration: 300, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
        scene.tweens.add({ targets: prize, y: prize.y - 12, duration: 300, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
        const shine = scene.add
          .particles(0, 0, TextureKeys.Sparkle, {
            x: prize.x, y: prize.y, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 90), quantity: 1 },
            speed: { min: 10, max: 40 }, lifespan: 500, frequency: 70, scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 },
          })
          .setDepth(3620);
        scene.time.delayedCall(FLOAT_MS, () => {
          shine.destroy();
          scene.tweens.add({ targets: glow, alpha: 0, duration: 300, onComplete: () => glow.destroy() });
          this.emit(ObjectEvents.GiftOpened, this, prize);
          scene.tweens.add({ targets: this, alpha: 0, duration: 300, onComplete: () => this.destroy() });
        });
      },
    });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf([this, this.bow, this.lid, this.hint]);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
