import { Scene } from 'phaser';
import { FONT_FAMILY, SceneKeys } from '../constants';

const FONT_TIMEOUT_MS = 3000;

export class Boot extends Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create() {
    // Wait for Fredoka (Google Fonts) before any text is created; fall back after a timeout (e.g. offline).
    const loaded = document.fonts.load(`500 16px ${FONT_FAMILY}`).catch(() => []);
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS));
    void Promise.race([loaded, timeout]).then(() => {
      // TODO F5: route scene changes through systems/transitions.ts (ADR 0007).
      this.scene.start(SceneKeys.Preloader);
    });
  }
}
