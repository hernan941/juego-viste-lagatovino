import { Scene } from 'phaser';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Palette, SceneKeys } from '../constants';

// Stub: filled in by a later feature (see docs/roadmap.md).
export class Title extends Scene {
  constructor() {
    super(SceneKeys.Title);
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, SceneKeys.Title, { fontFamily: FONT_FAMILY, fontSize: '48px', color: Palette.rosa600 })
      .setOrigin(0.5);
  }
}
