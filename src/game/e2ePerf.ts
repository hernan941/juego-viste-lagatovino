import type { Game } from 'phaser';
import type Phaser from 'phaser';
import { EventBus } from './EventBus';
import { countListeners, type PerfCounts } from './systems/perf';

/** Objects in a display list, counting what containers hold. */
function countDisplay(list: Phaser.GameObjects.GameObject[]): number {
  return list.reduce((n, o) => n + 1 + ((o as Phaser.GameObjects.Container).list ? countDisplay((o as Phaser.GameObjects.Container).list) : 0), 0);
}

/** F9 (test hook): what is alive in the active scenes, to catch leaks after N scene cycles. */
export function readPerf(game: Game): PerfCounts & { fps: number } {
  const total: PerfCounts & { fps: number } = { tweens: 0, timers: 0, eventBus: countListeners(EventBus), registry: countListeners(game.registry.events), input: 0, sceneEvents: 0, displayList: 0, fps: game.loop.actualFps };
  for (const scene of game.scene.getScenes(true)) {
    // `_active` and `_pendingInsertion` are the clock's private lists of timers: there is no public count.
    const clock = scene.time as unknown as { _active: unknown[]; _pendingInsertion: unknown[] };
    total.tweens += scene.tweens.getTweens().length;
    total.timers += clock._active.length + clock._pendingInsertion.length;
    total.input += countListeners(scene.input) + (scene.input.keyboard ? countListeners(scene.input.keyboard) : 0);
    total.sceneEvents += countListeners(scene.events);
    total.displayList += countDisplay(scene.children.list);
  }
  return total;
}
