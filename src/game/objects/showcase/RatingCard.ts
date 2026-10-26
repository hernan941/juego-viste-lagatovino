import Phaser from 'phaser';
import { Fonts, Ink, SfxKeys, TextureKeys } from '../../constants';
import { formatPoints, ratingLineText } from '../../domain/copy';
import type { BreakdownLine } from '../../domain/types';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import { TweenBag } from './TweenBag';

export interface RatingCardOptions {
  /** Turns a combo id into its name for the line "Combo ...". */
  comboName?: (id: string) => string;
  /** Pops in when created (default). */
  animate?: boolean;
}

export const CARD_ROWS_TOP = -140;
export const CARD_ROW_GAP = 52;
const LABEL_X = -150;
const POINTS_X = 176;
/** Each tic is a little higher than the last (a tune that climbs toward the stars). */
const TIC_RATE_STEP = 0.07;

/**
 * The judge's lined paper card (art-direction v2, ruled paper). `showLine` writes one line of the breakdown: a tic that climbs
 * in pitch and a jumping sparkle. A negative line is written in `mutedTexto` with a pencil scribble, never in alarm red.
 * Centered on (x, y); the stars are stamped below the lines by `StarStamps`.
 */
export class RatingCard extends Phaser.GameObjects.Container {
  private readonly bag: TweenBag;
  private readonly comboName?: (id: string) => string;

  constructor(scene: Phaser.Scene, x: number, y: number, { comboName, animate = true }: RatingCardOptions = {}) {
    super(scene, x, y);
    this.bag = new TweenBag(scene);
    this.comboName = comboName;
    this.add(scene.add.image(0, 0, TextureKeys.PaperCard));
    this.setSize(420, 392);
    this.setAngle(1.5);
    scene.add.existing(this);
    if (animate) {
      this.setAlpha(0);
      const p = profileOf(scene);
      if (p.reduced) {
        this.bag.add({ targets: this, alpha: 1, duration: 200 });
      } else {
        this.setScale(0.8);
        this.bag.add({ targets: this, alpha: 1, scale: 1, duration: 250, ease: 'Back.easeOut' });
      }
    }
  }

  /** Writes line `index` of the card. `ms` is how long it takes to come in. */
  showLine(index: number, line: BreakdownLine, ms: number): void {
    const scene = this.scene;
    const p = profileOf(scene);
    const negative = line.points < 0;
    const color = negative ? Ink.mutedTexto : Ink.tinta;
    const row = scene.add.container(0, CARD_ROWS_TOP + index * CARD_ROW_GAP);
    const spark = scene.add.text(-182, 0, '✦', { fontFamily: Fonts.Title, fontSize: '26px', color: negative ? Ink.mutedTexto : Ink.sol }).setOrigin(0.5);
    const label = scene.add.text(LABEL_X, 0, ratingLineText(line, this.comboName), { fontFamily: Fonts.Voice, fontSize: '26px', color }).setOrigin(0, 0.5);
    const points = scene.add.text(POINTS_X, 0, formatPoints(line.points), { fontFamily: Fonts.Title, fontSize: '34px', color }).setOrigin(1, 0.5);
    row.add([spark, label]);
    if (negative) {
      // The pencil scribble over the points: a "tachoncito", soft and not an alarm.
      row.add(scene.add.image(POINTS_X - 24, 2, TextureKeys.PencilMark).setScale(0.55).setAlpha(0.85));
    }
    row.add(points);
    this.add(row);

    row.setAlpha(0);
    if (p.reduced) {
      this.bag.add({ targets: row, alpha: 1, duration: ms });
    } else {
      row.x = -24;
      this.bag.add({ targets: row, alpha: 1, x: 0, duration: ms, ease: 'Back.easeOut' });
      this.bag.add({ targets: spark, y: -14, duration: ms * 0.5, yoyo: true, ease: 'Sine.easeOut' });
    }
    getAudio(scene).play(SfxKeys.Click, { rate: 1 + index * TIC_RATE_STEP, volume: 0.55 });
  }

  speedUp(factor: number): void {
    this.bag.speedUp(factor);
  }

  destroy(fromScene?: boolean): void {
    this.bag.clear();
    this.scene?.tweens?.killTweensOf(this);
    super.destroy(fromScene);
  }
}
