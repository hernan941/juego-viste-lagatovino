import { Scene } from 'phaser';
import { FONT_FAMILY, SceneKeys } from '../constants';
import { fontSpecs, loadFonts } from '../systems/fonts';
import { go } from '../systems/navigate';

const FONT_TIMEOUT_MS = 3000;

export class Boot extends Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create() {
    // Wait for the self-hosted v2 fonts and for Fredoka (Google Fonts, still used by the v1 scenes until F20)
    // before any text is created; fall back after a timeout (e.g. offline).
    const specs = [...fontSpecs(), `500 16px ${FONT_FAMILY}`];
    void loadFonts(document.fonts, FONT_TIMEOUT_MS, specs).then(() => go(this, 'boot'));
  }
}
