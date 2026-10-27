import Phaser from 'phaser';
import { Fonts, Ink, SfxKeys, TextureKeys, colorToNumber } from '../../constants';
import { getAudio } from '../../plugins/AudioPlugin';
import { profileOf } from '../../systems/motion';

const WIDTH = 210;
const HEIGHT = 44;
const TILT = -2;

/**
 * "Secretos X/N" as a paper tag (art-direction v2): white card, 3 px `borde`, flat shadow and ink handwriting, stuck slightly
 * crooked. Going up pops with a spinning star, so the new secret is felt. Same contract as `SecretCounter`.
 */
export class SecretsTag extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private readonly star: Phaser.GameObjects.Image;
  private current = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const g = scene.add.graphics();
    g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-WIDTH / 2 + 4, -HEIGHT / 2 + 4, WIDTH, HEIGHT, 16);
    g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 16);
    g.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-WIDTH / 2, -HEIGHT / 2, WIDTH, HEIGHT, 16);
    this.star = scene.add.image(-WIDTH / 2 + 28, 0, TextureKeys.InkSparkle).setDisplaySize(26, 26);
    this.label = scene.add
      .text(14, 0, '', { fontFamily: Fonts.Voice, fontStyle: '700', fontSize: '26px', color: Ink.tinta, padding: { x: 4, y: 8 } })
      .setOrigin(0.5);
    this.add([g, this.star, this.label]);
    this.setAngle(TILT);
    scene.add.existing(this);
  }

  get text(): string {
    return this.label.text;
  }

  /** Writes "Secretos X/N"; when `animate` and the count went up, the tag pops. */
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
