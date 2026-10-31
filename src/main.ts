import StartGame from './game/main';
import { installRotateHint } from './game/systems/touchEnv';
import { installPageChrome, isAppleTouch } from './page/pageChrome';

document.addEventListener('DOMContentLoaded', () => {
    // ADR 0023: the page around the canvas (home link, fullscreen) lives outside Phaser.
    // Safari on iPhone has no Fullscreen API: the button there explains "Add to Home Screen" instead.
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
        || window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
    installPageChrome(document, import.meta.env.VITE_HOME_URL, {
        appleTouch: isAppleTouch(navigator.userAgent, navigator.maxTouchPoints), standalone,
    });
    // ADR 0014: the "turn your phone" notice lives in the page, outside Phaser.
    installRotateHint(window, document);
    StartGame('game-container');
});
