import { Scene } from 'phaser';
import { SceneKeys } from '../constants';
import { fontSpecs, loadFonts } from '../systems/fonts';
import { go } from '../systems/navigate';

const FONT_TIMEOUT_MS = 3000;

export class Boot extends Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create() {
    // Wait for the self-hosted fonts before any text is created; fall back after a timeout (e.g. offline).
    void loadFonts(document.fonts, FONT_TIMEOUT_MS, fontSpecs()).then(() => go(this, 'boot'));
  }
}
