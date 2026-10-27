// The kraft packaging card of the keychain on the screen (S8): the same operations that make the PNG, drawn once (without the
// keychain, which hangs from its hole live and keeps swinging) into a texture. It rises from below the screen, can be tapped to put
// away, and sinks again. Its texture is freed on `destroy`.
import Phaser from 'phaser';
import { ObjectEvents } from '../../constants';
import { CARD_SIZE } from '../../domain/keychainPackage';
import { packagingLayout } from '../../domain/keychain';
import type { SheetOp } from '../../domain/photoSheet';
import type { Point } from '../../domain/types';
import { profileOf } from '../../systems/motion';
import { drawSheetOps } from '../photo';
import { hitRect } from '../ui';

const RISE_MS = 480;
const SINK_MS = 320;
let counter = 0;

export class PackageCard extends Phaser.GameObjects.Container {
  private readonly key: string;
  private readonly picture: Phaser.GameObjects.Image;
  private readonly rest: Point;
  private moving: Phaser.Tweens.Tween | null = null;
  private thumb: Phaser.GameObjects.Image | null = null;
  private gone = false;

  constructor(scene: Phaser.Scene, x: number, y: number, ops: readonly SheetOp[]) {
    super(scene, x, y);
    this.rest = { x, y };
    this.key = `package-card~${counter++}`;
    const texture = scene.textures.addDynamicTexture(this.key, CARD_SIZE.width, CARD_SIZE.height);
    if (!texture) throw new Error('PackageCard: no dynamic texture');
    const temp: Phaser.GameObjects.GameObject[] = [];
    try {
      drawSheetOps(scene, texture, ops, { x: CARD_SIZE.width / 2, y: CARD_SIZE.height / 2, scale: 1 }, {}, temp);
      texture.render();
    } finally {
      for (const o of temp) o.destroy();
    }
    this.picture = scene.add.image(0, 0, this.key);
    this.add(this.picture);
    this.setSize(CARD_SIZE.width, CARD_SIZE.height);
    this.setPosition(x, scene.scale.height + CARD_SIZE.height);
    this.setVisible(false);
    scene.add.existing(this);
  }

  /** Where the keychain hangs on the screen: the hole of the card. */
  get hangPoint(): Point {
    const layout = packagingLayout({ x: -CARD_SIZE.width / 2, y: -CARD_SIZE.height / 2, width: CARD_SIZE.width, height: CARD_SIZE.height });
    return { x: this.rest.x + layout.hang.x, y: this.rest.y + layout.hang.y };
  }

  /** Comes up from under the screen and settles (a short fade with reduced motion). */
  rise(): Promise<void> {
    const p = profileOf(this.scene);
    this.setVisible(true);
    this.stopMoving();
    if (p.reduced) {
      this.setPosition(this.rest.x, this.rest.y).setAlpha(0);
      return this.run({ alpha: 1, duration: 300 });
    }
    return this.run({ y: this.rest.y, duration: RISE_MS, ease: p.ease('Back.easeOut') });
  }

  /**
   * The saved picture as a small print that drops tilted next to the card and flies "to the pocket" (a point of the screen), shrinking
   * (F9's reveal). Nothing with reduced motion. Resolves when it is gone.
   */
  flyThumb(to: Point): Promise<void> {
    const p = profileOf(this.scene);
    if (p.reduced || this.gone) return Promise.resolve();
    const { scene } = this;
    const thumb = scene.add.image(this.rest.x, this.rest.y, this.key).setScale(0.3).setAngle(-9).setDepth(this.depth + 1).setAlpha(0);
    this.thumb = thumb;
    return new Promise((resolve) => {
      const done = () => { thumb.destroy(); if (this.thumb === thumb) this.thumb = null; resolve(); };
      scene.tweens.chain({
        targets: thumb,
        tweens: [
          { alpha: 1, y: this.rest.y - 30, scale: 0.34, angle: 8, duration: 260, ease: 'Back.easeOut' },
          { x: to.x, y: to.y, scale: 0.08, angle: 30, alpha: 0.2, duration: 460, delay: 120, ease: 'Sine.easeIn', onComplete: done },
        ],
      });
    });
  }

  /** Goes back down (or fades away with reduced motion) and asks to be destroyed by whoever holds it. */
  sink(): Promise<void> {
    const p = profileOf(this.scene);
    this.stopMoving();
    this.disableInteractive();
    if (p.reduced) return this.run({ alpha: 0, duration: 250 });
    return this.run({ y: this.scene.scale.height + CARD_SIZE.height, duration: SINK_MS, ease: 'Back.easeIn' });
  }

  /** A tap on the card (to put it away): it emits `PackageTap`. */
  enableTap(): void {
    if (this.input) return;
    this.setInteractive({ hitArea: hitRect(CARD_SIZE.width, CARD_SIZE.height), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.on('pointerdown', () => this.emit(ObjectEvents.PackageTap));
  }

  private run(config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>): Promise<void> {
    return new Promise((resolve) => {
      this.moving = this.scene.tweens.add({ targets: this, ...config, onComplete: () => resolve() });
    });
  }

  private stopMoving(): void {
    this.moving?.remove();
    this.moving = null;
  }

  destroy(fromScene?: boolean): void {
    if (this.gone) return;
    this.gone = true;
    this.stopMoving();
    const { scene } = this;
    if (scene?.tweens) {
      scene.tweens.killTweensOf(this);
      if (this.thumb) scene.tweens.killTweensOf(this.thumb);
    }
    this.thumb?.destroy();
    this.thumb = null;
    if (scene?.textures?.exists(this.key)) scene.textures.remove(this.key);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
