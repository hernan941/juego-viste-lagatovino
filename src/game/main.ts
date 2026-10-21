import { AUTO, Game, Scale } from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Title } from './scenes/Title';
import { CatSelect } from './scenes/CatSelect';
import { ShopEntrance } from './scenes/ShopEntrance';
import { DressUp } from './scenes/DressUp';
import { Showcase } from './scenes/Showcase';
import { GAME_HEIGHT, GAME_WIDTH, Palette } from './constants';
import { installE2EHook } from './e2eHook';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: Palette.rosa50,
  scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
  scene: [Boot, Preloader, Title, CatSelect, ShopEntrance, DressUp, Showcase],
};

const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });
  installE2EHook(game);
  return game;
};

export default StartGame;
