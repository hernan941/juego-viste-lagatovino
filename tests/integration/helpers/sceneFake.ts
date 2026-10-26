// A tiny fake of Phaser.Scene for the scenes that only wire objects together (Album, PhotoMode): every member a scene uses is here,
// and every object it makes is recorded. Use it with:
//   vi.mock('phaser', async () => (await import('./helpers/sceneFake')).phaserSceneMock);
type Handler = (...args: unknown[]) => void;

/** Chainable stand-in for a game object: every unknown method returns itself, and the calls are kept. */
export function loose<T extends Record<string, unknown>>(base: T = {} as T): T & Record<string, (...a: unknown[]) => unknown> {
  const proxy: Record<string, unknown> = new Proxy(base as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        if (prop.startsWith('set') && args.length > 0) target[prop[3]!.toLowerCase() + prop.slice(4)] = args[0];
        return proxy;
      };
    },
  });
  return proxy as T & Record<string, (...a: unknown[]) => unknown>;
}

export class Emitter {
  private handlers = new Map<string, Handler[]>();
  on(ev: string, fn: Handler) { this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]); return this; }
  once(ev: string, fn: Handler) { return this.on(ev, fn); }
  off(ev: string, fn?: Handler) { this.handlers.set(ev, fn ? (this.handlers.get(ev) ?? []).filter((h) => h !== fn) : []); return this; }
  emit(ev: string, ...a: unknown[]) { for (const h of [...(this.handlers.get(ev) ?? [])]) h(...a); return true; }
  count(ev: string) { return (this.handlers.get(ev) ?? []).length; }
  removeAllListeners() { this.handlers.clear(); return this; }
}

export interface TweenRec { config: Record<string, unknown>; removed: boolean }

export class FakeScene {
  scene: { key: string; isActive: () => boolean };
  registry = new Map<string, unknown>();
  events = new Emitter();
  input = Object.assign(new Emitter(), { enabled: true, keyboard: new Emitter() });
  tweens: { records: TweenRec[]; add(c: Record<string, unknown>): TweenRec; killTweensOf(t: unknown): void; killAll(): void; chain(c: Record<string, unknown>): TweenRec };
  time: { delayed: { ms: number; fn: () => void }[]; delayedCall(ms: number, fn: () => void): { remove(): void }; removeAllEvents(): void };
  scale = { width: 1280, height: 720 };
  textures = { exists: () => true };
  plugins: { get(key: string): { played: string[]; play(k: string): void; playRandom(k: string[]): void } };
  played: string[] = [];
  made: Record<string, unknown>[] = [];
  add: Record<string, (...a: unknown[]) => unknown>;
  constructor(key: string) {
    this.scene = { key, isActive: () => true };
    const records: TweenRec[] = [];
    const add = (config: Record<string, unknown>) => {
      const rec = { config, removed: false };
      records.push(rec);
      return rec;
    };
    this.tweens = {
      records, add, chain: add,
      killTweensOf: (t) => { for (const r of records) if (r.config.targets === t) r.removed = true; },
      killAll: () => { for (const r of records) r.removed = true; },
    };
    const delayed: { ms: number; fn: () => void }[] = [];
    this.time = { delayed, delayedCall: (ms, fn) => { delayed.push({ ms, fn }); return { remove() {} }; }, removeAllEvents: () => { delayed.length = 0; } };
    const played = this.played;
    const audio = { played, play: (k: string) => { played.push(k); }, playRandom: (ks: string[]) => { played.push(ks[0]!); } };
    this.plugins = { get: () => audio };
    const made = this.made;
    const make = (kind: string) => (...a: unknown[]) => { const o = loose({ kind, args: a, destroyed: false }); made.push(o); return o; };
    this.add = { image: make('image'), text: make('text'), graphics: make('graphics'), container: make('container'), existing: (o) => o };
  }
  get activeTweens() { return this.tweens.records.filter((r) => !r.removed); }
}

export const phaserSceneMock = {
  default: {
    Scene: FakeScene,
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    GameObjects: { Container: class { destroy() {} } },
    Geom: { Rectangle: class {} },
  },
};
