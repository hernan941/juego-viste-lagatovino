import Phaser from 'phaser';
import { Fonts, Ink, SfxKeys, TextureKeys } from '../../constants';
import { eventNote } from '../../domain/copy';
import type { CeremonyEvent } from '../../domain/ceremony';
import type { TagNames } from '../../domain/types';
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
  /** The readable tags (tags.json). */
  tags?: TagNames;
}

const NOTE_SCALE = 0.62;
const FALL_PX = 40;
const FALL_DEGREES = 6;
const ICON_COLORS: Record<string, string> = { '♥': Ink.frambuesa, '★': Ink.sol, '✦': Ink.sol, '✿': Ink.rosa, '?': Ink.lapiz };

/**
 * The progress events as polaroid notes in a row (a record, a taste found, a combo, a set, an unlock). Each one falls in with a
 * rustle of paper. Centered on (x, y); the order of arrival is the order of the row.
 */
export class EventNotes extends Phaser.GameObjects.Container {
  private readonly bag: TweenBag;
  private readonly noteCount: number;
  private readonly step: number;
  private readonly tags?: TagNames;

  constructor(scene: Phaser.Scene, x: number, y: number, { count, gap = 150, maxWidth = 760, tags }: EventNotesOptions) {
    super(scene, x, y);
    this.bag = new TweenBag(scene);
    this.noteCount = count;
    this.tags = tags;
    this.step = count > 1 ? Math.min(gap, maxWidth / (count - 1)) : gap;
    scene.add.existing(this);
  }

  /** World x of slot `index`. */
  slotX(index: number): number {
    return this.x + (index - (this.noteCount - 1) / 2) * this.step;
  }

  addNote(index: number, event: CeremonyEvent, ms: number): void {
    const scene = this.scene;
    const p = profileOf(scene);
    const note = eventNote(event, this.tags);
    const tilt = stableTilt(`note-${index}-${event.type}`);
    const holder = scene.add.container(this.slotX(index) - this.x, 0);
    const paper = scene.add.image(0, 0, TextureKeys.NotePolaroid).setScale(NOTE_SCALE);
    const icon = scene.add
      .text(0, -28 * NOTE_SCALE, note.icon, { fontFamily: Fonts.Title, fontSize: '64px', color: ICON_COLORS[note.icon] ?? Ink.lapiz })
      .setOrigin(0.5);
    const caption = scene.add
      .text(0, 100 * NOTE_SCALE, note.title, { fontFamily: Fonts.Voice, fontSize: '19px', color: Ink.tinta, align: 'center', wordWrap: { width: 136 } })
      .setOrigin(0.5);
    holder.add([paper, icon, caption]);
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
  }

  speedUp(factor: number): void {
    this.bag.speedUp(factor);
  }

  destroy(fromScene?: boolean): void {
    this.bag.clear();
    super.destroy(fromScene);
  }
}
