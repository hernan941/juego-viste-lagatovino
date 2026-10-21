import { Scene } from 'phaser';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Palette, SceneKeys } from '../constants';

// Stub: filled in by a later feature (see docs/roadmap.md).
export class DressUp extends Scene {
  constructor() {
    super(SceneKeys.DressUp);
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, SceneKeys.DressUp, { fontFamily: FONT_FAMILY, fontSize: '48px', color: Palette.rosa600 })
      .setOrigin(0.5);
  }
}
