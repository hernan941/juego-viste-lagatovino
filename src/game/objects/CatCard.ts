import Phaser from 'phaser';
import { Fonts, Ink, MEOW_KEYS, ObjectEvents, TextureKeys, colorToNumber } from '../constants';
import type { CatTally } from '../domain/catProgress';
import type { AnchorsDef, CatDef, Point } from '../domain/types';
import { stableTilt } from '../domain/stableTilt';
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
/** The gallery leans at most this much, so the level name does not look unstuck from its card (F12.R M5). */
const MAX_LEAN = 4;
/** The picked polaroid rises this many px. */
const LIFT = 6;

/**
 * A cat of the gallery on its polaroid with washi (art-direction sections 6 and 7): idles, hops with a happy face and a meow
 * when picked, shows it is the chosen one (straightens, rises and gets a hand-drawn ink circle with a `sol` sparkle on its washi), and has its best star and "♥ 2/5" under the name.
 */
export class CatCard extends Phaser.GameObjects.Container {
  readonly cat: Cat;
  private readonly polaroid: Polaroid;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly mark: Phaser.GameObjects.Graphics;
  private readonly lean: number;
  private readonly label: Phaser.GameObjects.Text;
  private readonly sparkles: Phaser.GameObjects.Particles.ParticleEmitter;
  private tallyLabel: Phaser.GameObjects.Container;
  private selected = false;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly def: CatDef, anchors: AnchorsDef, tally?: CatTally) {
    super(scene, x, y);
    this.ring = scene.add.graphics().setAlpha(0);
    // Circled by hand in the notebook: two ink strokes a little off from each other (like the speech bubble).
    this.ring.lineStyle(4, colorToNumber(Ink.tinta), 1);
    this.ring.strokeRoundedRect(-CARD_W / 2 - 9, -CARD_H / 2 - 9, CARD_W + 18, CARD_H + 18, 24);
    this.ring.lineStyle(3, colorToNumber(Ink.tinta), 0.8);
    this.ring.strokeRoundedRect(-CARD_W / 2 - 13, -CARD_H / 2 - 5, CARD_W + 24, CARD_H + 12, 28);
    this.mark = scene.add.graphics().setAlpha(0);
    const star = [[0, -13], [4, -4], [13, 0], [4, 4], [0, 13], [-4, 4], [-13, 0], [-4, -4]].map(([x, y]) => new Phaser.Math.Vector2(x!, y!));
    this.mark.fillStyle(colorToNumber(Ink.sol), 1).fillPoints(star, true).lineStyle(2, colorToNumber(Ink.tinta), 1).strokePoints(star, true);
    this.mark.setPosition(CARD_W / 2 - 22, -CARD_H / 2 + 2);
    // The polaroid keeps its own lean (seeded by the cat) and the cat rides inside it. The texts stay level, outside of it: Phaser 4 renders rotated Text objects with bands cut out of the glyphs.
    this.polaroid = new Polaroid(scene, 0, 0, { id: def.id, width: CARD_W, height: CARD_H, captionHeight: CAPTION_H, animate: false });
    this.lean = stableTilt(def.id, MAX_LEAN);
    this.polaroid.setAngle(this.lean);
    this.cat = new Cat(scene, 0, CARD_H / 2 - CAPTION_H - 24, def, anchors, CAT_SIZE);
    this.label = scene.add
      .text(0, CARD_H / 2 - 46, def.name, { fontFamily: Fonts.Voice, fontSize: '30px', fontStyle: '700', color: Ink.tinta })
      .setOrigin(0.5);
    this.tallyLabel = createTallyLabel(scene, 0, CARD_H / 2 - 20, tally ?? { stars: null, tastes: null });
    this.sparkles = scene.add.particles(0, 0, TextureKeys.InkSparkle, {
      emitting: false, speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 }, lifespan: { min: 400, max: 800 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 },
    });
    this.polaroid.add(this.cat);
    this.add([this.ring, this.polaroid, this.label, this.tallyLabel, this.mark, this.sparkles]);
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
    this.tallyLabel = createTallyLabel(this.scene, 0, CARD_H / 2 - 20 - (this.selected ? LIFT : 0), tally);
    // Level, like the constructor: inside the tilted polaroid the glyphs would be cut (see the note there).
    this.add(this.tallyLabel);
    old.destroy();
    const p = profileOf(this.scene);
    this.tallyLabel.setAlpha(0);
    if (!p.reduced) this.tallyLabel.setScale(0.8);
    this.scene.tweens.add({ targets: this.tallyLabel, alpha: 1, scale: 1, duration: 200, ease: p.ease('Back.easeOut') });
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
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf([this.ring, this.mark]);
    // Straightens to 0 degrees and rises (the texts under the photo go with it); back to its lean when dropped.
    this.scene.tweens.add({ targets: this.polaroid, angle: selected ? 0 : this.lean, y: selected ? -LIFT : 0, duration: 180, ease: p.ease('Back.easeOut') });
    this.scene.tweens.add({ targets: [this.label, this.tallyLabel], y: (_t: unknown, _k: unknown, _v: number, i: number) => (i === 0 ? CARD_H / 2 - 46 : CARD_H / 2 - 20) - (selected ? LIFT : 0), duration: 180, ease: p.ease('Back.easeOut') });
    this.scene.tweens.add({ targets: this.ring, alpha: selected ? 1 : 0, duration: selected ? 200 : 150 });
    this.scene.tweens.add({ targets: this.mark, alpha: selected ? 1 : 0, scale: 1, duration: 200 });
    if (selected && p.loops) {
      this.scene.tweens.add({ targets: this.mark, scale: { from: 1, to: 1.25 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 200 });
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
