// F19.2: the Keychain object (ADR 0021) with a fake scene. The real drawing (stamps, filters, ERASE) is checked in the lab scene
// and in the browser; here: what is built and when, the cache, the queue of thumbnails, the swing and that nothing leaks.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => {
  const { phaserMock } = await import('./helpers/kitScene');
  return {
    default: {
      ...phaserMock.default,
      Scenes: { Events: { UPDATE: 'update', SHUTDOWN: 'shutdown' } },
      TintModes: { FILL: 2 },
    },
  };
});

interface Baked { key: string; copies: number; px: number; ring: { metal: string; charm: boolean }; layout: { width: number } }
const { baked, cats, dye, FakeCat } = vi.hoisted(() => {
  const baked: Baked[] = [];
  const cats: FakeCat[] = [];
  class FakeCat {
    calls: string[] = [];
    destroyed = false;
    items: string[] = [];
    textures = new Map<string, string>();
    constructor(public scene: { events: { log: string[] } }, public x: number, public y: number, public def: { id: string }, public anchors: unknown, public size: number) {
      cats.push(this);
      scene.events.log.push('cat-created');
    }
    setOutfit(items: { id: string }[], opts: { instant?: boolean }) { this.items = items.map((i) => i.id); this.calls.push(`outfit:${opts.instant}`); }
    setItemTexture(id: string, key: string) { this.textures.set(id, key); }
    applyPose(id: string, opts: { instant?: boolean }) { this.calls.push(`pose:${id}:${opts.instant}`); return true; }
    freezeForPhoto(expression: string) { this.calls.push(`freeze:${expression}`); return () => undefined; }
    destroy() { this.destroyed = true; }
  }
  const dye = {
    ensured: [] as string[], retained: [] as string[], released: [] as string[], failFor: new Set<string>(),
    ensure(item: string, dyeId: string) {
      dye.ensured.push(`${item}:${dyeId}`);
      return dye.failFor.has(dyeId) ? Promise.reject(new Error('no')) : Promise.resolve(dyeId === 'agua' ? item : `${item}-tex~${dyeId}`);
    },
    retain(k: string) { dye.retained.push(k); },
    release(k: string) { dye.released.push(k); },
  };
  return { baked, cats, dye, FakeCat };
});

vi.mock('../../src/game/objects/keychain/porcelain', () => ({
  bakePorcelain: (scene: { textureKeys: Set<string> }, p: Baked) => {
    baked.push(p);
    scene.textureKeys.add(p.key);
  },
}));
vi.mock('../../src/game/objects/keychain/lookTop', () => ({ headTop: () => ({ x: 256, y: 80 }) }));
vi.mock('../../src/game/objects/Cat', () => ({ Cat: FakeCat }));
vi.mock('../../src/game/plugins/DyePlugin', () => ({ getDye: () => dye }));

import anchors from '../../src/game/data/anchors.json';
import { ObjectEvents } from '../../src/game/constants';
import { pendulum, pendulumDuration, recipeKey } from '../../src/game/domain/keychain';
import type { KeychainRecipe, Stars } from '../../src/game/domain/types';
import { Keychain, type KeychainData } from '../../src/game/objects/keychain/Keychain';

interface FakeImage { key: string; alpha: number; destroyed: boolean; tint?: number; [k: string]: unknown }
interface CounterConfig { from: number; to: number; duration: number; onUpdate: (t: { getValue(): number }) => void; onComplete: () => void }

class FakeScene {
  textureKeys = new Set<string>();
  removed: string[] = [];
  images: FakeImage[] = [];
  tweens = {
    added: [] as { targets: unknown; alpha?: number; onComplete?: () => void }[],
    counters: [] as { config: CounterConfig; removed: boolean }[],
    add: (cfg: { targets: unknown; alpha?: number; onComplete?: () => void }) => { this.tweens.added.push(cfg); return { remove: vi.fn() }; },
    addCounter: (config: CounterConfig) => {
      const rec = { config, removed: false, remove: () => { rec.removed = true; }, getValue: () => 0 };
      this.tweens.counters.push(rec);
      return rec;
    },
    killTweensOf: vi.fn(),
  };
  handlers = new Map<string, (() => void)[]>();
  events = {
    log: [] as string[],
    on: (ev: string, fn: () => void) => this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]),
    once: (ev: string, fn: () => void) => this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), fn]),
    off: (ev: string, fn: () => void) => this.handlers.set(ev, (this.handlers.get(ev) ?? []).filter((f) => f !== fn)),
  };
  registry = { get: (k: string) => (k === 'reducedMotion' ? this.reduced : undefined) };
  textures = {
    exists: (k: string) => this.textureKeys.has(k),
    remove: (k: string) => { this.textureKeys.delete(k); this.removed.push(k); },
    addDynamicTexture: (k: string) => { this.textureKeys.add(k); return { capture: vi.fn(), render: vi.fn() }; },
  };
  add = {
    existing: (o: unknown) => o,
    image: (_x: number, _y: number, key: string) => {
      const img: FakeImage = { key, alpha: 1, destroyed: false };
      const proxy: FakeImage = new Proxy(img, {
        get: (t, p: string) => (p in t ? t[p] : (...a: unknown[]) => {
          if (p === 'setAlpha') t.alpha = a[0] as number;
          if (p === 'setTint') t.tint = a[0] as number;
          if (p === 'destroy') t.destroyed = true;
          return proxy;
        }),
      });
      this.images.push(img);
      return proxy;
    },
  };
  constructor(public reduced = false) {}
  fire(ev: string) { for (const f of [...(this.handlers.get(ev) ?? [])]) f(); }
  /** Runs frames until nothing waits (each one is an `update`). */
  async frames(n: number) {
    for (let i = 0; i < n; i++) {
      this.fire('update');
      await Promise.resolve();
      await Promise.resolve();
    }
  }
}

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

const catDefs = [{ id: 'naranja', texture: 'cat-naranja' }, { id: 'gris', texture: 'cat-gris' }];
const clothes = [
  { id: 'sweater-rayas', slot: 'sweater', texture: 'sweater-rayas', dyeable: true },
  { id: 'head-gorro', slot: 'head', texture: 'head-gorro' },
];
const data = {
  cats: catDefs, clothes, anchors,
  rules: { goldFrom: 4, charmFrom: 5, borderCopies: 12, borderRadius: 14, borderColor: '#FFFCF5', varnishAlpha: 0.5 },
} as unknown as KeychainData;

const recipe = (extra: Partial<KeychainRecipe> = {}, stars: Stars = 3): KeychainRecipe => ({
  catId: 'naranja', catName: 'Luna', outfit: { sweater: 'sweater-rayas', head: 'head-gorro' }, itemDye: { 'sweater-rayas': 'lila' },
  pose: 'coqueto', stars, photo: { background: 'a', frame: 'b', stickers: [] }, createdAt: '2026-10-25T10:00:00.000Z', ...extra,
});

const make = (scene: FakeScene, r: KeychainRecipe, options = {}) => new Keychain(scene as never, 10, 20, r, data, options);

beforeEach(() => {
  baked.length = 0;
  cats.length = 0;
  dye.ensured.length = 0; dye.retained.length = 0; dye.released.length = 0; dye.failFor.clear();
});

describe('Keychain: the big one (512 px)', () => {
  it('builds the flattened texture from the recipe and shows it', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    expect(k.ready).toBe(true);
    expect(k.textureKey).toBe(recipeKey(recipe(), 512));
    expect(baked).toHaveLength(1);
    expect(baked[0].key).toBe(k.textureKey);
    expect(baked[0].px).toBe(512);
    expect(baked[0].copies).toBe(12);
    expect(scene.textureKeys.has(k.textureKey)).toBe(true);
    expect(scene.images.some((i) => i.key === k.textureKey)).toBe(true);
  });

  it('dresses an off-screen cat at once, with the pose, the face of the pose and the dyed textures', async () => {
    const scene = new FakeScene();
    await make(scene, recipe()).whenReady();
    const cat = cats[0];
    expect(cat.items.sort()).toEqual(['head-gorro', 'sweater-rayas']);
    expect(cat.calls).toEqual(['outfit:true', 'pose:coqueto:true', 'freeze:amor']);
    expect(cat.textures.get('sweater-rayas')).toBe('sweater-rayas-tex~lila');
    expect(cat.x).toBeLessThan(-1000);
    expect(cat.size).toBe(512);
  });

  it('destroys the cat and the render of the look, and keeps the dyed textures alive only while it draws', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    expect(cats[0].destroyed).toBe(true);
    expect(scene.textureKeys.has(`${k.textureKey}~look`)).toBe(false);
    expect(dye.retained).toEqual(['sweater-rayas-tex~lila']);
    expect(dye.released).toEqual(dye.retained);
  });

  it('shows the plain item when the dye cannot be made', async () => {
    const scene = new FakeScene();
    dye.failFor.add('lila');
    const k = make(scene, recipe());
    await k.whenReady();
    expect(k.ready).toBe(true);
    expect(cats[0].textures.size).toBe(0);
  });

  it('keeps the water as the plain item (no dyed texture)', async () => {
    const scene = new FakeScene();
    await make(scene, recipe({ itemDye: { 'sweater-rayas': 'agua' } })).whenReady();
    expect(cats[0].textures.size).toBe(0);
  });

  it('has the ring by stars: silver with 3, gold with the charm with 5', async () => {
    const scene = new FakeScene();
    await make(scene, recipe({}, 3)).whenReady();
    await make(scene, recipe({ catId: 'gris' }, 5)).whenReady();
    expect(baked[0].ring).toEqual({ metal: 'silver', charm: false });
    expect(baked[1].ring).toEqual({ metal: 'gold', charm: true });
  });

  it('hangs from the ring: the container origin is the hang point of the layout', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    expect(k.hangPoint).toEqual(k.layout.hang);
    expect(k.width).toBe(k.layout.width);
    expect(k.height).toBe(k.layout.height);
  });

  it('fades the picture in over the pencil and tells when it is ready', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    const ready = vi.fn();
    k.on(ObjectEvents.KeychainReady, ready);
    expect(scene.images[0].tint).toBeDefined(); // the pencil silhouette while it waits
    await k.whenReady();
    expect(ready).toHaveBeenCalledTimes(1);
    const fadeIn = scene.tweens.added.find((t) => t.alpha === 1);
    const fadeOut = scene.tweens.added.find((t) => t.alpha === 0);
    expect(fadeIn).toBeDefined();
    expect(fadeOut).toBeDefined();
    fadeOut!.onComplete?.();
    expect(scene.images[0].destroyed).toBe(true);
  });

  it('removes the big texture when the last keychain that shows it is destroyed (it is drawn again when opened)', async () => {
    const scene = new FakeScene();
    const a = make(scene, recipe());
    await a.whenReady();
    const b = make(scene, recipe());
    await b.whenReady();
    expect(baked).toHaveLength(1); // the same recipe is built once
    a.destroy();
    expect(scene.textureKeys.has(a.textureKey)).toBe(true);
    b.destroy();
    expect(scene.textureKeys.has(a.textureKey)).toBe(false);
  });

  it('rejects a recipe of a cat that does not exist', () => {
    expect(() => make(new FakeScene(), recipe({ catId: 'fantasma' }))).toThrow(/fantasma/);
  });
});

describe('Keychain: the thumbnails (256 px)', () => {
  it('use 8 copies and a 256 px texture, and are not built until their frame', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe(), { px: 256 });
    await flush();
    expect(baked).toHaveLength(0);
    expect(k.ready).toBe(false);
    await scene.frames(1);
    await k.whenReady();
    expect(baked).toHaveLength(1);
    expect(baked[0].px).toBe(256);
    expect(baked[0].copies).toBe(8);
    expect(k.textureKey).toBe(recipeKey(recipe(), 256));
  });

  it('are built ONE per frame: twelve in a row take twelve frames (ADR 0021)', async () => {
    const scene = new FakeScene();
    const twelve = Array.from({ length: 12 }, (_, i) => make(scene, recipe({ outfit: { sweater: 'sweater-rayas' }, itemDye: {}, pose: ['sentadito', 'coqueto', 'saltito', 'dormilon'][i % 4], stars: ((i % 5) + 1) as Stars, catId: i % 2 ? 'gris' : 'naranja' }), { px: 256 }));
    await flush();
    const perFrame: number[] = [];
    for (let f = 0; f < 12; f++) {
      const before = baked.length;
      await scene.frames(1);
      perFrame.push(baked.length - before);
    }
    expect(Math.max(...perFrame)).toBeLessThanOrEqual(1);
    expect(twelve.filter((k) => k.ready).length).toBeGreaterThan(0);
    // 12 keychains but only as many distinct textures as distinct looks.
    expect(baked.length).toBe(new Set(baked.map((b) => b.key)).size);
  });

  it('keep their texture until the scene shuts down, even when the keychain is destroyed', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe(), { px: 256 });
    await flush();
    await scene.frames(1);
    await k.whenReady();
    const key = k.textureKey;
    k.destroy();
    expect(scene.textureKeys.has(key)).toBe(true);
    const again = make(scene, recipe(), { px: 256 });
    await again.whenReady();
    expect(baked).toHaveLength(1); // the cache answered
    scene.fire('shutdown');
    expect(scene.textureKeys.has(key)).toBe(false);
  });

  it('shutdown also drops the queue and the frame listener', async () => {
    const scene = new FakeScene();
    make(scene, recipe(), { px: 256 });
    await flush();
    expect(scene.handlers.get('update')).toHaveLength(1);
    scene.fire('shutdown');
    expect(scene.handlers.get('update')).toHaveLength(0);
    await scene.frames(2);
    expect(baked).toHaveLength(0);
  });

  it('a destroyed keychain that was waiting is never built and does not leave the queue stuck', async () => {
    const scene = new FakeScene();
    const first = make(scene, recipe({ catId: 'naranja' }), { px: 256 });
    const second = make(scene, recipe({ catId: 'gris' }), { px: 256 });
    await flush();
    first.destroy();
    await scene.frames(1);
    await second.whenReady();
    expect(baked.map((b) => b.key)).toEqual([second.textureKey]);
    await first.whenReady();
    expect(first.ready).toBe(false);
  });

  it('shows the pencil silhouette of the cat in linea-lapiz while it waits', async () => {
    const scene = new FakeScene();
    make(scene, recipe(), { px: 256 });
    const pencil = scene.images[0];
    expect(pencil.key).toBe('cat-naranja');
    expect(pencil.alpha).toBeGreaterThan(0);
    expect(pencil.tint).toBe(0x8fa8e3);
  });
});

describe('Keychain: the swing', () => {
  const counter = (scene: FakeScene, i = 0) => scene.tweens.counters[i];
  const at = (scene: FakeScene, ms: number, i = 0) => counter(scene, i).config.onUpdate({ getValue: () => ms });

  it('follows the pendulum: the angle is a function of the time only', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    k.swing();
    const c = counter(scene);
    expect(c.config.from).toBe(0);
    const params = { amp: 14, periodMs: 900, damping: 2.1 };
    expect(c.config.duration).toBeCloseTo(pendulumDuration(params), 6);
    for (const t of [0, 100, 450, 900, 1300]) {
      at(scene, t);
      expect(k.angle).toBeCloseTo(pendulum(t, params), 9);
    }
  });

  it('is gentler with reduced motion: 3 degrees and over in 0.6 s', async () => {
    const scene = new FakeScene(true);
    const k = make(scene, recipe());
    await k.whenReady();
    k.swing();
    expect(counter(scene).config.duration).toBeLessThan(700);
    at(scene, 0);
    expect(Math.abs(k.angle)).toBeCloseTo(3, 6);
  });

  it('a lighter push (strength) swings less', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    k.swing(0.5);
    at(scene, 0);
    expect(k.angle).toBeCloseTo(7, 6);
  });

  it('rests straight and says so when it ends', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    const ended = vi.fn();
    k.on(ObjectEvents.KeychainSwingEnd, ended);
    k.swing();
    expect(k.swinging).toBe(true);
    at(scene, 700);
    counter(scene).config.onComplete();
    expect(k.angle).toBe(0);
    expect(k.swinging).toBe(false);
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('a new swing replaces the one that is going', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    k.swing();
    k.swing();
    expect(scene.tweens.counters.map((c) => c.removed)).toEqual([true, false]);
  });

  it('tinks at each end of the swing, softer each time', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    const tinks: number[] = [];
    k.on(ObjectEvents.KeychainTink, (s: number) => tinks.push(s));
    k.swing();
    for (let t = 0; t <= 1600; t += 15) at(scene, t);
    expect(tinks.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < tinks.length; i++) expect(tinks[i]).toBeLessThan(tinks[i - 1] + 1e-9);
    expect(tinks[0]).toBeGreaterThan(0.3);
  });

  it('stopSwing hangs it straight at once', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    k.swing();
    at(scene, 120);
    k.stopSwing();
    expect(k.angle).toBe(0);
    expect(k.swinging).toBe(false);
    expect(counter(scene).removed).toBe(true);
  });

  it('does not swing when there is nothing to swing (strength 0)', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    k.swing(0);
    expect(scene.tweens.counters).toHaveLength(0);
  });

  it('destroy stops the swing', async () => {
    const scene = new FakeScene();
    const k = make(scene, recipe());
    await k.whenReady();
    k.swing();
    k.destroy();
    expect(counter(scene).removed).toBe(true);
  });
});
