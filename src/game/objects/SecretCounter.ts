import Phaser from 'phaser';
import { Palette, SfxKeys, TextureKeys } from '../constants';
import { getAudio } from '../plugins/AudioPlugin';
import { profileOf } from '../systems/motion';
import { makeText, hex } from './ui';

const WIDTH = 210;
const HEIGHT = 40;

/** "Secretos X/N" pill. Going up pops with a spinning star, so the new secret is felt. */
export class SecretCounter extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private readonly star: Phaser.GameObjects.Image;
  private current = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(hex('rosa600'), 0.16).fillRoundedRect(-WIDTH / 2 + 2, -HEIGHT / 2 + 5, WIDTH, HEIGHT, 20);
    g.fillStyle(hex('crema'), 1).fillRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 20);
    g.lineStyle(4, hex('rosa200'), 1).strokeRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 20);
    this.star = scene.add.image(-WIDTH / 2 + 28, 0, TextureKeys.Sparkle).setDisplaySize(26, 26);
    this.label = makeText(scene, 14, 0, '', 22, Palette.texto);
    this.add([g, this.star, this.label]);
    scene.add.existing(this);
  }

  get text(): string {
    return this.label.text;
  }

  /** Writes "Secretos X/N"; when `animate` and the count went up, the pill pops. */
  setCount(count: number, total: number, animate = false): void {
    const up = count > this.current;
    this.current = count;
    this.label.setText(`Secretos ${count}/${total}`);
    if (!(animate && up)) return;
    getAudio(this.scene).play(SfxKeys.Hover, { rate: 1.8, volume: 0.9 });
    const p = profileOf(this.scene);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { scale: 1 + 0.3 * p.squash, duration: 150, ease: 'Sine.easeOut' },
        { scale: 1, duration: 260, ease: p.ease('Back.easeOut') },
      ],
    });
    if (p.spin > 0) this.scene.tweens.add({ targets: this.star, angle: 360, duration: 500, ease: 'Sine.easeOut', onComplete: () => this.star.setAngle(0) });
  }

  destroy(fromScene?: boolean): void {
    this.scene?.tweens.killTweensOf([this, this.star]);
    super.destroy(fromScene);
  }
}
