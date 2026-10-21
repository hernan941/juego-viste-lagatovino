import { AUTO, Game, Scale } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Title } from './scenes/Title';
import { CatSelect } from './scenes/CatSelect';
import { ShopEntrance } from './scenes/ShopEntrance';
import { DressUp } from './scenes/DressUp';
import { Showcase } from './scenes/Showcase';
import { AudioPlugin } from './plugins/AudioPlugin';
import { SavePlugin } from './plugins/SavePlugin';
import { MotionPlugin } from './plugins/MotionPlugin';
import { GAME_HEIGHT, GAME_WIDTH, Palette, PluginKeys } from './constants';
import { installE2EHook } from './e2eHook';
import { installFpsCounter } from './fpsCounter';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: Palette.rosa50,
  scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
  // Test mode only: software WebGL (SwiftShader, which headless Chromium in the e2e uses) renders
  // multi-texture batches with flickering, half-drawn layers, so tests batch one texture at a time.
  // Real browsers (dev and production) use Phaser's default.
  ...(import.meta.env.MODE === 'test' ? { render: { maxTextures: 1 } } : {}),
  plugins: {
    global: [
      { key: PluginKeys.Audio, plugin: AudioPlugin, start: true },
      { key: PluginKeys.Save, plugin: SavePlugin, start: true },
      { key: PluginKeys.Motion, plugin: MotionPlugin, start: true },
    ],
  },
  scene: [Boot, Preloader, Title, CatSelect, ShopEntrance, DressUp, Showcase],
};

const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });
  installE2EHook(game);
  installFpsCounter(game);
  return game;
};

export default StartGame;
