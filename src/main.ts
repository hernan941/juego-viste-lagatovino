import StartGame from './game/main';
import { installRotateHint } from './game/systems/touchEnv';
import { installPageChrome } from './page/pageChrome';

document.addEventListener('DOMContentLoaded', () => {
    // ADR 0023: the page around the canvas (home link, fullscreen) lives outside Phaser.
    installPageChrome(document, import.meta.env.VITE_HOME_URL);
    // ADR 0014: the "turn your phone" notice lives in the page, outside Phaser.
    installRotateHint(window, document);
    StartGame('game-container');
});
