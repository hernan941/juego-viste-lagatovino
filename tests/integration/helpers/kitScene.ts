// A tiny fake of Phaser and of a Scene for the UI kit objects: it records tweens, interactive setup and drawing calls.
// Use it with: vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);
type Handler = (...args: unknown[]) => void;

/** A chainable stand-in for Graphics and other drawables: every method returns itself and is recorded. */
function chain<T extends object>(base: T): T & Record<string, (...a: unknown[]) => unknown> {
  const calls: string[] = [];
  const proxy: T & Record<string, (...a: unknown[]) => unknown> = new Proxy(base as T & Record<string, (...a: unknown[]) => unknown>, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      if (prop === 'calls') return calls;
      return () => { calls.push(prop); return proxy; };
    },
  });
  return proxy;
}

class FakeContainer {
  x: number; y: number; scale = 1; angle = 0; alpha = 1; depth = 0; destroyed = false;
  list: unknown[] = [];
  width = 0; height = 0;
  interactive: { hitArea?: { x: number; y: number; width: number; height: number }; useHandCursor?: boolean } | null = null;
  private handlers = new Map<string, Handler[]>();
  constructor(public scene: unknown, x = 0, y = 0) { this.x = x; this.y = y; }
  add(c: unknown) { this.list.push(...(Array.isArray(c) ? c : [c])); return this; }
  setSize(w: number, h: number) { this.width = w; this.height = h; return this; }
  setInteractive(cfg: FakeContainer['interactive']) { this.interactive = cfg; return this; }
  disableInteractive() { this.interactive = null; return this; }
  setScale(s: number) { this.scale = s; return this; }
  setAngle(a: number) { this.angle = a; return this; }
  setAlpha(a: number) { this.alpha = a; return this; }
  setDepth(d: number) { this.depth = d; return this; }
  setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  on(ev: string, fn: Handler) { this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]); return this; }
  emit(ev: string, ...a: unknown[]) { (this.handlers.get(ev) ?? []).forEach((h) => h(...a)); return true; }
  removeAllListeners() { this.handlers.clear(); return this; }
  getWorldTransformMatrix() { return { tx: this.x, ty: this.y }; }
  destroy() { this.destroyed = true; }
}

export const phaserMock = {
  default: {
    GameObjects: { Container: FakeContainer },
    Plugins: { BasePlugin: class {} },
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Math: { Vector2: class { constructor(public x: number, public y: number) {} } },
    Geom: {
      Rectangle: Object.assign(
        class { constructor(public x: number, public y: number, public width: number, public height: number) {} },
        { Contains: () => true },
      ),
      Circle: Object.assign(class { constructor(public x: number, public y: number, public radius: number) {} }, { Contains: () => true }),
    },
  },
};

export interface TweenRecord { targets: unknown; config: Record<string, unknown>; removed: boolean; remove(): void }

export interface FakeScene {
  tweens: { records: TweenRecord[]; add(cfg: Record<string, unknown>): TweenRecord; killTweensOf(t: unknown): void };
  registry: { get(key: string): unknown };
  plugins: { get(key: string): { played: string[]; play(key: string): void } };
  textures: { exists(): boolean };
  time: { delayedCall(ms: number, fn: () => void): void };
  add: Record<string, (...a: unknown[]) => unknown>;
  made: { texts: Record<string, unknown>[]; graphics: unknown[]; images: unknown[] };
  played: string[];
  reduced: boolean;
  activeTweens(): TweenRecord[];
}

export function makeFakeScene(reduced = false): FakeScene {
  const played: string[] = [];
  const made = { texts: [] as Record<string, unknown>[], graphics: [] as unknown[], images: [] as unknown[] };
  const scene = { played, reduced, made } as unknown as FakeScene;
  const records: TweenRecord[] = [];
  scene.tweens = {
    records,
    add(config) {
      const rec: TweenRecord = { targets: config.targets, config, removed: false, remove() { rec.removed = true; } };
      records.push(rec);
      return rec;
    },
    killTweensOf(t) { for (const r of records) if (r.targets === t || (Array.isArray(r.targets) && r.targets.includes(t))) r.removed = true; },
  };
  scene.activeTweens = () => records.filter((r) => !r.removed);
  scene.registry = { get: (key) => (key === 'reducedMotion' ? reduced : undefined) };
  scene.plugins = { get: () => ({ played, play: (k: string) => { played.push(k); } }) };
  scene.textures = { exists: () => true };
  scene.time = { delayedCall: (_ms, fn) => fn() };
  const textObj = (cfg: Record<string, unknown>) => {
    const t: Record<string, unknown> = { ...cfg, width: String(cfg.text ?? '').length * 12, height: 30 };
    const self = new Proxy(t, { get: (o, p: string) => (p in o ? o[p] : (...a: unknown[]) => { if (p === 'setText') o.text = a[0]; return self; }) });
    return self;
  };
  scene.add = {
    graphics: () => { const g = chain({}); made.graphics.push(g); return g; },
    text: (_x, _y, text, style) => { const t = textObj({ text, style }); made.texts.push(t as Record<string, unknown>); return t; },
    image: (_x, _y, key) => { const i = chain({ key, width: 100, height: 100 }); made.images.push(i); return i; },
    container: (x, y, children) => new FakeContainer(scene, x as number, y as number).add(children ?? []),
    existing: (o) => o,
  };
  return scene;
}
