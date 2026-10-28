import Phaser from 'phaser';
import { Fonts, Ink, SfxKeys, TextureKeys } from '../../constants';
import type { RewardNote } from '../../domain/rewardNotes';
import { stableTilt } from '../../domain/stableTilt';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';
import { TweenBag } from './TweenBag';

export interface EventNotesOptions {
  /** How many notes the row will hold, so each one knows its place before the others arrive. */
  count: number;
  /** Distance between two notes at most (they squeeze together when there are many). */
  gap?: number;
  /** Width the row may take. */
  maxWidth?: number;
  /** Size of every note (1 by default): a long row shrinks its notes to stay in its band. */
  scale?: number;
  /** World point the pile's sparkle flies to (the notebook button). */
  sparkTo?: { x: number; y: number };
  /** The sparkle arrived (or would have, with reduced motion): the scene can show the news. */
  onSpark?: () => void;
}

const NOTE_SCALE = 0.62;
const FALL_PX = 40;
const FALL_DEGREES = 6;
/** The pile drops its sparkle on its own after this long, or sooner when it is tapped. */
const SPARK_AFTER_MS = 2000;
const FLIP_GAP_MS = 60;
const SPARK_FLIGHT_MS = 600;
const ICON_COLORS: Record<string, string> = { '♥': Ink.frambuesa, '★': Ink.sol, '✦': Ink.sol, '✿': Ink.rosa, '?': Ink.lapiz };

/**
 * The progress events as polaroid notes in a row (a record, a taste found, a combo, a set, an unlock). Each one falls in with a
 * rustle of paper. Centered on (x, y); the order of arrival is the order of the row.
 */
export class EventNotes extends Phaser.GameObjects.Container {
  private readonly bag: TweenBag;
  private readonly noteCount: number;
  private readonly step: number;
  private readonly noteScale: number;
  private readonly sparkTo?: { x: number; y: number };
  private readonly onSpark?: () => void;
  private sparkTimer?: Phaser.Time.TimerEvent;
  private sparked = false;

  constructor(scene: Phaser.Scene, x: number, y: number, { count, gap = 150, maxWidth = 760, scale = 1, sparkTo, onSpark }: EventNotesOptions) {
    super(scene, x, y);
    this.bag = new TweenBag(scene);
    this.noteCount = count;
    this.noteScale = scale;
    this.sparkTo = sparkTo;
    this.onSpark = onSpark;
    this.step = count > 1 ? Math.min(gap, maxWidth / (count - 1)) : gap;
    scene.add.existing(this);
  }

  /** World x of slot `index`. */
  slotX(index: number): number {
    return this.x + (index - (this.noteCount - 1) / 2) * this.step;
  }

  addNote(index: number, note: RewardNote, ms: number): void {
    const scene = this.scene;
    const p = profileOf(scene);
    const tilt = stableTilt(`note-${index}-${note.title}`);
    const holder = scene.add.container(this.slotX(index) - this.x, 0);
    // A pile: two or three papers peek out behind the front one, and each flips in a little later.
    const behind = note.stack ? Math.min(3, note.stack) - 1 : 0;
    for (let i = behind; i >= 1; i--) {
      const back = scene.add.image(7 * i, -5 * i, TextureKeys.NotePolaroid).setScale(NOTE_SCALE).setAngle(i % 2 ? 5 : -4);
      holder.add(back);
      if (p.reduced) continue;
      back.setScale(0, NOTE_SCALE);
      this.bag.add({ targets: back, scaleX: NOTE_SCALE, duration: ms * 0.6, delay: (behind - i) * FLIP_GAP_MS + FLIP_GAP_MS, ease: 'Back.easeOut' });
    }
    const paper = scene.add.image(0, 0, TextureKeys.NotePolaroid).setScale(NOTE_SCALE);
    const icon = scene.add
      .text(0, -28 * NOTE_SCALE, note.icon, { fontFamily: Fonts.Title, fontSize: '64px', color: ICON_COLORS[note.icon] ?? Ink.lapiz })
      .setOrigin(0.5);
    const caption = scene.add
      .text(0, 100 * NOTE_SCALE, note.title, { fontFamily: Fonts.Voice, fontSize: '19px', color: Ink.tinta, align: 'center', wordWrap: { width: 136 } })
      .setOrigin(0.5);
    holder.add([paper, icon, caption]);
    holder.setScale(this.noteScale);
    if (note.reward) {
      holder.add(scene.add.text(-46, -74, note.reward, { fontFamily: Fonts.Title, fontSize: '26px', color: Ink.lapiz }).setOrigin(0.5));
    }
    this.add(holder);

    holder.setAlpha(0);
    holder.setAngle(tilt);
    if (p.reduced) {
      this.bag.add({ targets: holder, alpha: 1, duration: ms });
    } else {
      holder.y = -FALL_PX;
      holder.setAngle(tilt + FALL_DEGREES * (tilt < 0 ? -1 : 1));
      // The icon pops in the window once the paper has landed.
      icon.setScale(0);
      this.bag.add({ targets: icon, scale: 1, duration: ms * 0.5, delay: ms * 0.5, ease: 'Back.easeOut' });
      this.bag.add({ targets: holder, alpha: 1, y: 0, angle: tilt, duration: ms, ease: 'Back.easeOut' });
    }
    getAudio(scene).play(SfxKeys.Paper, { rate: 1 + index * 0.04, volume: 0.7 });
    if (note.stack) {
      paper.setInteractive({ useHandCursor: true });
      paper.once('pointerdown', () => this.releaseSpark(holder.x));
      this.sparkTimer = scene.time.delayedCall(SPARK_AFTER_MS, () => this.releaseSpark(holder.x));
    }
  }

  /** The pile lets go of one sparkle that flies to the notebook (once). With reduced motion it only tells the scene. */
  private releaseSpark(fromX: number): void {
    if (this.sparked) return;
    this.sparked = true;
    this.sparkTimer?.remove();
    const scene = this.scene;
    const done = () => this.onSpark?.();
    if (!this.sparkTo || profileOf(scene).reduced) {
      done();
      return;
    }
    const spark = scene.add.text(fromX, 0, '✦', { fontFamily: Fonts.Title, fontSize: '40px', color: Ink.sol }).setOrigin(0.5);
    this.add(spark);
    this.bag.add({
      targets: spark, x: this.sparkTo.x - this.x, y: this.sparkTo.y - this.y, scale: 0.5, duration: SPARK_FLIGHT_MS, ease: 'Sine.easeIn',
      onComplete: () => { spark.destroy(); done(); },
    });
  }

  speedUp(factor: number): void {
    this.bag.speedUp(factor);
  }

  destroy(fromScene?: boolean): void {
    this.sparkTimer?.remove();
    this.bag.clear();
    super.destroy(fromScene);
  }
}
