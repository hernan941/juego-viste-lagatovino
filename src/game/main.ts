import { AUTO, Game, Scale } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Title } from './scenes/Title';
import { CatSelect } from './scenes/CatSelect';
import { ShopEntrance } from './scenes/ShopEntrance';
import { DressUp } from './scenes/DressUp';
import { Showcase } from './scenes/Showcase';
import { Album } from './scenes/Album';
import { PhotoMode } from './scenes/PhotoMode';
import { AudioPlugin } from './plugins/AudioPlugin';
import { SavePlugin } from './plugins/SavePlugin';
import { MotionPlugin } from './plugins/MotionPlugin';
import { DyePlugin } from './plugins/DyePlugin';
import { GAME_HEIGHT, GAME_WIDTH, Ink, PluginKeys } from './constants';
import { readGpuRenderer, renderOptions } from './systems/renderConfig';
import { installE2EHook } from './e2eHook';
import { readPerf } from './e2ePerf';
import { installFpsCounter } from './fpsCounter';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: Ink.cremaPapel,
  // ADR 0014: a long press must not open the browser menu over the game.
  disableContextMenu: true,
  scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
  plugins: {
    global: [
      { key: PluginKeys.Audio, plugin: AudioPlugin, start: true },
      { key: PluginKeys.Save, plugin: SavePlugin, start: true },
      { key: PluginKeys.Motion, plugin: MotionPlugin, start: true },
      { key: PluginKeys.Dye, plugin: DyePlugin, start: true },
    ],
  },
  scene: [Boot, Preloader, Title, CatSelect, ShopEntrance, DressUp, Showcase, Album, PhotoMode],
};

const StartGame = (parent: string) => {
  // Dev labs (`?lab=porcelain`, F12.9, and `?lab=ceremony`, F15.3) exist only in development: `import.meta.env.DEV` is false in a build, so
  // the dynamic imports (and the scenes) never reach `dist/`. They reuse the test shortcut `?e2e=1&start=` of the Preloader.
  const lab = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('lab') : null;
  if (lab === 'porcelain' || lab === 'ceremony') {
    const q = new URLSearchParams(window.location.search);
    q.set('e2e', '1');
    q.set('start', lab === 'porcelain' ? 'PorcelainLab' : 'CeremonyLab');
    window.history.replaceState(null, '', `${window.location.pathname}?${q.toString()}`);
  }
  // A4: one texture per batch in test mode and on software WebGL (systems/renderConfig.ts); real GPUs keep Phaser's default.
  const game = new Game({ ...config, ...renderOptions(import.meta.env.MODE, readGpuRenderer(document)), parent });
  if (import.meta.env.DEV) {
    void import('./scenes/dev/PorcelainLab').then((m) => game.scene.add(m.LAB_SCENE_KEY, m.PorcelainLab));
    void import('./scenes/dev/CeremonyLab').then((m) => game.scene.add(m.CEREMONY_LAB_KEY, m.CeremonyLab));
  }
  installE2EHook(game, readPerf);
  installFpsCounter(game);
  return game;
};

export default StartGame;
