import { Scene } from 'phaser';
import { FONT_FAMILY, SceneKeys } from '../constants';
import { transitionTo } from '../systems/transitions';

const FONT_TIMEOUT_MS = 3000;

export class Boot extends Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create() {
    // Wait for Fredoka (Google Fonts) before any text is created; fall back after a timeout (e.g. offline).
    const loaded = document.fonts.load(`500 16px ${FONT_FAMILY}`).catch(() => []);
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
    void Promise.race([loaded, timeout]).then(() => transitionTo(this, SceneKeys.Preloader, {}, 'fade'));
  }
}
