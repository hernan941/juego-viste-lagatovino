import Phaser from 'phaser';
import { FONT_FAMILY, MEOW_KEYS, ObjectEvents, Palette, SfxKeys, TextureKeys } from '../constants';
import type { AnchorsDef, CatDef, Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { Cat } from './Cat';
import { addHover, hex } from './ui';

export const CARD_W = 172;
export const CARD_H = 196;
const CAT_SIZE = 176;

/** A cat of the gallery on its card: idles, hops with a happy face and a meow when picked, and shows it is the chosen one. */
export class CatCard extends Phaser.GameObjects.Container {
  readonly cat: Cat;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly sparkles: Phaser.GameObjects.Particles.ParticleEmitter;
  private selected = false;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly def: CatDef, anchors: AnchorsDef) {
    super(scene, x, y);
    this.bg = scene.add.graphics();
    this.glow = scene.add.graphics().setAlpha(0);
    this.glow.lineStyle(10, hex('rosa400'), 0.35).strokeRoundedRect(-CARD_W / 2 - 6, -CARD_H / 2 - 6, CARD_W + 12, CARD_H + 12, 40);
    this.cat = new Cat(scene, 0, CARD_H / 2 - 54, def, anchors, CAT_SIZE);
    const label = scene.add
      .text(0, CARD_H / 2 - 24, def.name, { fontFamily: FONT_FAMILY, fontSize: '24px', color: Palette.texto, fontStyle: '600' })
      .setOrigin(0.5);
    this.sparkles = scene.add.particles(0, 0, TextureKeys.Sparkle, {
      emitting: false, speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 }, lifespan: { min: 400, max: 800 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 },
    });
    this.add([this.glow, this.bg, this.cat, label, this.sparkles]);
    this.drawBg();
    scene.add.existing(this);
    this.setSize(CARD_W, CARD_H);

    const audio = getAudio(scene);
    this.on('pointerover', () => audio.play(SfxKeys.Hover, { volume: 0.4 }));
    this.on('pointerdown', () => { this.pressed = true; });
    this.on('pointerout', () => { this.pressed = false; });
    this.on('pointerup', () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.emit(ObjectEvents.ButtonClick, def);
    });
  }

  private drawBg(): void {
    this.bg.clear();
    this.bg.fillStyle(hex('rosa600'), 0.15).fillRoundedRect(-CARD_W / 2 + 2, -CARD_H / 2 + 8, CARD_W, CARD_H, 34);
    this.bg.fillStyle(this.selected ? hex('rosa200') : hex('crema'), 1).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 34);
    this.bg.lineStyle(this.selected ? 7 : 4, this.selected ? hex('rosa400') : hex('rosa200'), 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 34);
    this.bg.fillStyle(0xffffff, 0.7).fillRoundedRect(-CARD_W / 2 + 24, -CARD_H / 2 + 8, 56, 6, 3);
  }

  /** Pops in after `delay` ms and starts answering to the pointer. */
  appear(delay: number): void {
    this.setScale(0.8).setAlpha(0);
    this.scene.tweens.add({
      targets: this, scale: 1, alpha: 1, delay, duration: 250, ease: 'Back.easeOut',
      onComplete: () => {
        this.setInteractive({ useHandCursor: true });
        addHover(this, 1.05);
      },
    });
  }

  setSelected(selected: boolean): void {
    if (selected === this.selected) return;
    this.selected = selected;
    this.drawBg();
    this.scene.tweens.killTweensOf(this.glow);
    if (selected) {
      this.glow.setAlpha(0.3);
      this.scene.tweens.add({ targets: this.glow, alpha: 1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      this.scene.tweens.add({ targets: this.glow, alpha: 0, duration: 150 });
    }
  }

  /** The cat jumps, makes a happy face and meows. */
  hop(): void {
    const scene = this.scene;
    const baseY = this.cat.y;
    scene.tweens.killTweensOf(this.cat);
    this.cat.y = baseY;
    scene.tweens.chain({
      targets: this.cat,
      tweens: [
        { y: baseY - 44, duration: 170, ease: 'Quad.easeOut' },
        { y: baseY, duration: 330, ease: 'Bounce.easeOut' },
      ],
    });
    this.cat.react('drop');
    scene.time.delayedCall(330, () => this.scene && this.cat.squash());
    this.sparkles.explode(10, 0, -20);
    getAudio(scene).playRandom(MEOW_KEYS);
  }

  getCenter(): Point {
    const m = this.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  destroy(fromScene?: boolean): void {
    this.removeAllListeners();
    this.cat.destroy();
    super.destroy(fromScene);
  }
}
