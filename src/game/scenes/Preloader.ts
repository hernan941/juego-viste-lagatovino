import { Scene } from 'phaser';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Palette, SceneKeys, colorToNumber } from '../constants';

export class Preloader extends Scene {
  constructor() {
    super(SceneKeys.Preloader);
  }

  init() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, 468, 32).setStrokeStyle(4, colorToNumber(Palette.contorno)).setFillStyle(colorToNumber(Palette.crema));
    const bar = this.add.rectangle(cx - 230, cy, 4, 24, colorToNumber(Palette.rosa400));
    this.add
      .text(cx, cy - 50, 'Cargando...', { fontFamily: FONT_FAMILY, fontSize: '32px', color: Palette.texto })
      .setOrigin(0.5);
    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 456 * progress;
    });
  }

  preload() {
    // F0 has no assets yet. Real assets and data validation load here (ADR 0010).
  }

  create() {
    this.scene.start(SceneKeys.Title);
  }
}
