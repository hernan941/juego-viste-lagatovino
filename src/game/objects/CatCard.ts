import Phaser from 'phaser';
import { Fonts, Ink, MEOW_KEYS, ObjectEvents, TextureKeys, colorToNumber } from '../constants';
import type { CatTally } from '../domain/catProgress';
import type { AnchorsDef, CatDef, Point } from '../domain/types';
import { getAudio } from '../plugins/AudioPlugin';
import { Cat } from './Cat';
import { Polaroid } from './kit/Polaroid';
import { profileOf } from '../systems/motion';
import { createTallyLabel } from './tallyLabel';
import { addHover } from './ui';
import { hoverSfx } from './hoverSfx';

export const CARD_W = 190;
export const CARD_H = 206;
const CAT_SIZE = 150;
const CAPTION_H = 66;
/** Falls in with this many extra degrees and settles (art-direction section 8). */
const FALL_DEGREES = 6;

/**
 * A cat of the gallery on its polaroid with washi (art-direction sections 6 and 7): idles, hops with a happy face and a meow
 * when picked, shows it is the chosen one with an ink ring, and has its best star and "♥ 2/5" under the name.
 */
export class CatCard extends Phaser.GameObjects.Container {
  readonly cat: Cat;
  private readonly polaroid: Polaroid;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly sparkles: Phaser.GameObjects.Particles.ParticleEmitter;
  private tallyLabel: Phaser.GameObjects.Container;
  private selected = false;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly def: CatDef, anchors: AnchorsDef, tally?: CatTally) {
    super(scene, x, y);
    this.ring = scene.add.graphics().setAlpha(0);
    this.ring.lineStyle(8, colorToNumber(Ink.frambuesa), 0.5).strokeRoundedRect(-CARD_W / 2 - 8, -CARD_H / 2 - 8, CARD_W + 16, CARD_H + 16, 22);
    // The polaroid keeps its own lean (seeded by the cat) and the cat rides inside it. The texts stay level, outside of it: Phaser 4 renders rotated Text objects with bands cut out of the glyphs.
    this.polaroid = new Polaroid(scene, 0, 0, { id: def.id, width: CARD_W, height: CARD_H, captionHeight: CAPTION_H, animate: false });
    this.cat = new Cat(scene, 0, CARD_H / 2 - CAPTION_H - 24, def, anchors, CAT_SIZE);
    const label = scene.add
      .text(0, CARD_H / 2 - 46, def.name, { fontFamily: Fonts.Voice, fontSize: '30px', color: Ink.tinta })
      .setOrigin(0.5);
    this.tallyLabel = createTallyLabel(scene, 0, CARD_H / 2 - 20, tally ?? { stars: null, tastes: null });
    this.sparkles = scene.add.particles(0, 0, TextureKeys.InkSparkle, {
      emitting: false, speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 }, lifespan: { min: 400, max: 800 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 },
    });
    this.polaroid.add(this.cat);
    this.add([this.ring, this.polaroid, label, this.tallyLabel, this.sparkles]);
    scene.add.existing(this);
    this.setSize(CARD_W, CARD_H);

    this.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(scene, p, 0.4));
    this.on('pointerdown', () => { this.pressed = true; });
    this.on('pointerout', () => { this.pressed = false; });
    this.on('pointerup', () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.emit(ObjectEvents.ButtonClick, def);
    });
  }

  /** Shows the best star and the hearts of this cat (from the progress); replaces what was there. */
  setTally(tally: CatTally): void {
    const old = this.tallyLabel;
    this.tallyLabel = createTallyLabel(this.scene, 0, CARD_H / 2 - 20, tally);
    this.polaroid.add(this.tallyLabel);
    old.destroy();
  }

  /** Falls in after `delay` ms, with its washi sticking down, and starts answering to the pointer. */
  appear(delay: number): void {
    const p = profileOf(this.scene);
    const restY = this.y;
    this.setAlpha(0);
    if (p.reduced) {
      this.scene.tweens.add({ targets: this, alpha: 1, delay, duration: 200, onComplete: () => this.becomeInteractive() });
      return;
    }
    this.setScale(0.8).setAngle(FALL_DEGREES).setY(restY - 30);
    this.scene.tweens.add({
      targets: this, scale: 1, alpha: 1, angle: 0, y: restY, delay, duration: 280, ease: p.ease('Back.easeOut'),
      onComplete: () => this.becomeInteractive(),
    });
  }

  private becomeInteractive(): void {
    this.setInteractive({ useHandCursor: true });
    addHover(this, 1.05);
  }

  setSelected(selected: boolean): void {
    if (selected === this.selected) return;
    this.selected = selected;
    this.scene.tweens.killTweensOf(this.ring);
    if (selected) {
      if (profileOf(this.scene).loops) {
        this.ring.setAlpha(0.4);
        this.scene.tweens.add({ targets: this.ring, alpha: 1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        this.scene.tweens.add({ targets: this.ring, alpha: 0.9, duration: 200 });
      }
    } else {
      this.scene.tweens.add({ targets: this.ring, alpha: 0, duration: 150 });
    }
  }

  /** The cat jumps, makes a happy face and meows. */
  hop(): void {
    const scene = this.scene;
    const p = profileOf(scene);
    const baseY = this.cat.y;
    scene.tweens.killTweensOf(this.cat);
    this.cat.y = baseY;
    // Reduced motion: no jump, the squash and the happy face say it.
    if (p.reduced) this.cat.squash();
    else {
      scene.tweens.chain({
        targets: this.cat,
        tweens: [
          { y: baseY - 44, duration: 170, ease: 'Quad.easeOut' },
          { y: baseY, duration: 330, ease: 'Bounce.easeOut' },
        ],
      });
    }
    this.cat.react('drop');
    if (!p.reduced) scene.time.delayedCall(330, () => this.scene && this.cat.squash());
    this.sparkles.explode(p.count(10), 0, -20);
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
