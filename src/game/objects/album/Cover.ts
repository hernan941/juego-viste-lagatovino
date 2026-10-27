import Phaser from 'phaser';
import { Fonts, Ink, TextureKeys } from '../../constants';
import { albumLines } from '../../domain/copy';
import { profileOf } from '../../systems/motion';

/** The label (white tag) of `cover.svg` is 340 x 190 at (110, 150) of a 560 x 700 art: these are the lines on it, from the art center. */
const TITLE_Y = -145;
const PERCENT_Y = -98;
const SETS_Y = -58;
const COUNT_DELAY_MS = 350;
const COUNT_MS = 650;
const CLOSE_MS = 130;

export interface CoverOptions {
  pct: number;
  setsDone: number;
  setsTotal: number;
  /** Scale of the art (the open sheet uses 0.9 too, so the book keeps its size when it opens). */
  scale?: number;
}

/**
 * The closed notebook (S5, F17.5): the cover with its spiral and the label, where the title and "Llevas el N %" are written by hand
 * (the number counts up, then pops). `openUp` turns it away like a cover being lifted; with reduced motion it only fades. The
 * scene puts the open sheet underneath and drops the cover when it is done.
 */
export class Cover extends Phaser.GameObjects.Container {
  private readonly percent: Phaser.GameObjects.Text;
  private readonly counter = { value: 0 };
  private opening = false;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly options: CoverOptions) {
    super(scene, x, y);
    const art = scene.add.image(0, 0, TextureKeys.Notebook).setScale(options.scale ?? 0.9);
    const style = { padding: { x: 4, y: 8 } };
    const title = scene.add.text(0, TITLE_Y, albumLines.coverTitle, { fontFamily: Fonts.Title, fontSize: '44px', color: Ink.tinta, ...style }).setOrigin(0.5);
    this.percent = scene.add
      .text(0, PERCENT_Y, albumLines.coverPercent(0), { fontFamily: Fonts.Voice, fontStyle: 'bold', fontSize: '36px', color: Ink.tinta, ...style })
      .setOrigin(0.5);
    const sets = scene.add
      .text(0, SETS_Y, albumLines.coverSets(options.setsDone, options.setsTotal), { fontFamily: Fonts.Voice, fontSize: '26px', color: Ink.lapiz, ...style })
      .setOrigin(0.5);
    this.add([art, title, this.percent, sets]);
    scene.add.existing(this);
    this.countUp();
  }

  /** The number written so far (for the e2e hook). */
  get shownPct(): number {
    return Math.round(this.counter.value);
  }

  private countUp(): void {
    const { pct } = this.options;
    if (profileOf(this.scene).reduced || pct === 0) {
      this.counter.value = pct;
      this.percent.setText(albumLines.coverPercent(pct));
      return;
    }
    this.scene.tweens.add({
      targets: this.counter, value: pct, delay: COUNT_DELAY_MS, duration: COUNT_MS, ease: 'Sine.easeOut',
      onUpdate: () => this.percent.setText(albumLines.coverPercent(this.shownPct)),
      onComplete: () => {
        this.percent.setText(albumLines.coverPercent(pct));
        this.scene.tweens.add({ targets: this.percent, scale: 1.2, duration: 110, yoyo: true, ease: 'Sine.easeOut' });
      },
    });
  }

  /** Lifts the cover away and calls `onOpened` when it is gone (once, even if asked twice). */
  openUp(onOpened: () => void): void {
    if (this.opening) return;
    this.opening = true;
    this.scene.tweens.killTweensOf(this.counter);
    this.counter.value = this.options.pct;
    this.percent.setText(albumLines.coverPercent(this.options.pct));
    const reduced = profileOf(this.scene).reduced;
    this.scene.tweens.add({
      targets: this, ...(reduced ? { alpha: 0 } : { scaleX: 0 }), duration: reduced ? 180 : CLOSE_MS, ease: 'Sine.easeIn',
      onComplete: () => {
        onOpened();
        this.destroy();
      },
    });
  }

  destroy(fromScene?: boolean): void {
    const tweens = this.scene?.tweens;
    tweens?.killTweensOf(this);
    tweens?.killTweensOf(this.counter);
    if (this.percent) tweens?.killTweensOf(this.percent);
    this.removeAllListeners();
    super.destroy(fromScene);
  }
}
