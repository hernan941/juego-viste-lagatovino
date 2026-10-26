// A fake scene with a manual clock for the runway ceremony objects: timers that run when `advance` passes them, a camera that
// records its shakes, the audio plugin that records the options, particles and the scene events. Built on the kit's fake scene.
import { vi } from 'vitest';
import { makeFakeScene, type FakeScene } from './kitScene';

type Fn = (...a: unknown[]) => void;
interface Timer { at: number; fn: () => void; removed: boolean }

export interface CeremonyScene extends FakeScene {
  now: number;
  timers: Timer[];
  advance(ms: number): void;
  shakes: { duration: number; intensity: number }[];
  sounds: { key: string; options?: { rate?: number; volume?: number } }[];
  bursts: { count: number }[];
  emitScene(event: string): void;
  emitInput(event: string, ...args: unknown[]): void;
  inputListeners(event: string): number;
}

export function makeCeremonyScene(reduced = false): CeremonyScene {
  const scene = makeFakeScene(reduced) as CeremonyScene;
  scene.now = 0;
  scene.timers = [];
  scene.shakes = [];
  scene.sounds = [];
  scene.bursts = [];
  const handlers = new Map<string, Fn[]>();
  const inputHandlers = new Map<string, Fn[]>();
  const clock = {
    get now() { return scene.now; },
    delayedCall(ms: number, fn: () => void) {
      const t: Timer = { at: scene.now + ms, fn, removed: false };
      scene.timers.push(t);
      return { remove: () => { t.removed = true; } };
    },
  };
  scene.time = clock as unknown as FakeScene['time'];
  scene.advance = (ms) => {
    const end = scene.now + ms;
    for (;;) {
      const next = scene.timers.filter((t) => !t.removed && t.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      scene.now = Math.max(scene.now, next.at);
      next.removed = true;
      next.fn();
    }
    scene.now = end;
  };
  (scene as unknown as { cameras: unknown }).cameras = { main: { shake: (duration: number, intensity: number) => { scene.shakes.push({ duration, intensity }); } } };
  (scene as unknown as { events: unknown }).events = {
    once: (ev: string, fn: Fn) => { handlers.set(ev, [...(handlers.get(ev) ?? []), fn]); },
    off: (ev: string, fn: Fn) => { handlers.set(ev, (handlers.get(ev) ?? []).filter((h) => h !== fn)); },
  };
  scene.emitScene = (ev) => { for (const h of handlers.get(ev) ?? []) h(); };
  (scene as unknown as { input: unknown }).input = {
    on: (ev: string, fn: Fn) => { inputHandlers.set(ev, [...(inputHandlers.get(ev) ?? []), fn]); },
    off: (ev: string, fn: Fn) => { inputHandlers.set(ev, (inputHandlers.get(ev) ?? []).filter((h) => h !== fn)); },
  };
  scene.emitInput = (ev, ...args) => { for (const h of [...(inputHandlers.get(ev) ?? [])]) h(...args); };
  scene.inputListeners = (ev) => (inputHandlers.get(ev) ?? []).length;
  (scene as unknown as { plugins: unknown }).plugins = {
    get: () => ({ play: (key: string, options?: { rate?: number; volume?: number }) => { scene.sounds.push({ key, options }); scene.played.push(key); } }),
  };
  const particles = () => {
    const self: Record<string, unknown> = {
      setDepth: () => self, destroy: vi.fn(),
      explode: (count: number) => { scene.bursts.push({ count }); return self; },
    };
    return self;
  };
  scene.add.particles = particles;
  return scene;
}
