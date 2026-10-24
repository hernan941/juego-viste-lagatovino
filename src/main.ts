import StartGame from './game/main';
import { installRotateHint } from './game/systems/touchEnv';

document.addEventListener('DOMContentLoaded', () => {
    // ADR 0014: the "turn your phone" notice lives in the page, outside Phaser.
    installRotateHint(window, document);
    StartGame('game-container');
});
