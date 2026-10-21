import Phaser from 'phaser';
import { FONT_FAMILY, Palette } from '../constants';
import { profileOf } from '../systems/motion';
import { hex } from './ui';

const SHOW_MS = 2000;

/**
 * The hanging sign with the name of the cat. To announce something (the name of a look, a prize) it flips
 * around on X with a little squash, shows the text for a while and flips back to the cat's name, so
 * nothing is ever written over the cat's head.
 */
export class NameSign extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly baseText: string;
  private current = '';
  /** Everything announced so far (for the e2e hook). */
  readonly announced: string[] = [];
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, catName: string) {
    super(scene, x, y);
    this.baseText = catName;
    this.label = scene.add
      .text(0, 11, catName, { fontFamily: FONT_FAMILY, fontSize: '34px', color: Palette.texto, fontStyle: '600' })
      .setOrigin(0.5);
    this.art = scene.add.graphics();
    this.add([this.art, this.label]);
    this.draw(catName);
    scene.add.existing(this);
  }

  /** What the sign says right now. */
  get text(): string {
    return this.current;
  }

  private draw(text: string): void {
    this.current = text;
    this.label.setText(text);
    const width = Math.max(190, this.label.width + 70);
    const g = this.art;
    g.clear();
    g.lineStyle(4, hex('contorno'), 1).beginPath().moveTo(-width / 2 + 34, -34).lineTo(-width / 2 + 34, -12).moveTo(width / 2 - 34, -34).lineTo(width / 2 - 34, -12).strokePath();
    g.fillStyle(hex('rosa600'), 0.18).fillRoundedRect(-width / 2 + 3, -16 + 7, width, 54, 27);
    g.fillStyle(hex('mantequilla'), 1).fillRoundedRect(-width / 2, -16, width, 54, 27);
    g.lineStyle(4, 0xf5d86a, 1).strokeRoundedRect(-width / 2, -16, width, 54, 27);
    g.fillStyle(0xffffff, 0.6).fillRoundedRect(-width / 2 + 20, -10, 50, 6, 3);
  }

  /** Flip (X with squash) to `text`, hold `holdMs`, flip back to the name of the cat. */
  announce(text: string, holdMs = SHOW_MS): void {
    this.timer?.remove();
    this.announced.push(text);
    this.flipTo(text);
    this.timer = this.scene.time.delayedCall(holdMs + 400, () => this.flipTo(this.baseText));
  }

  private flipTo(text: string): void {
    this.scene.tweens.killTweensOf(this);
    const p = profileOf(this.scene);
    if (p.reduced) {
      // No flip: the text changes under a quick cross fade.
      this.setScale(1);
      this.scene.tweens.chain({
        targets: this,
        tweens: [
          { alpha: 0, duration: 130, ease: 'Sine.easeIn', onComplete: () => this.draw(text) },
          { alpha: 1, duration: 200, ease: 'Sine.easeOut' },
        ],
      });
      return;
    }
    this.setAlpha(1);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { scaleX: 0, scaleY: 0.88, duration: 130, ease: 'Sine.easeIn', onComplete: () => this.draw(text) },
        { scaleX: 1, scaleY: 1, duration: 320, ease: p.ease('Back.easeOut') },
      ],
    });
  }

  destroy(fromScene?: boolean): void {
    this.timer?.remove();
    this.scene?.tweens.killTweensOf(this);
    super.destroy(fromScene);
  }
}
