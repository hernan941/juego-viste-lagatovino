import type { Game } from 'phaser';
import { FpsMeter } from './systems/perf';

/** `?fps=1`: a small counter over the canvas (latest fps and the median of the last 10 s), to measure on a PC with GPU. */
export function installFpsCounter(game: Game): void {
  if (new URLSearchParams(window.location.search).get('fps') !== '1') return;
  const box = document.createElement('div');
  box.id = 'fps-counter';
  box.style.cssText = 'position:fixed;top:8px;left:8px;padding:4px 10px;border-radius:10px;background:#fff8;color:#4a2b3a;font:600 16px sans-serif;pointer-events:none;z-index:10';
  document.body.appendChild(box);
  const meter = new FpsMeter(20);
  const timer = window.setInterval(() => {
    meter.add(game.loop.actualFps);
    box.textContent = meter.label();
  }, 500);
  game.events.once('destroy', () => {
    window.clearInterval(timer);
    box.remove();
  });
}
