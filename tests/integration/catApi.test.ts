import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    GameObjects: {
      Container: class {
        x = 0;
        y = 0;
        scaleX = 1;
        scaleY = 1;
        emitted: string[] = [];
        constructor(public scene: unknown) {}
        setScale() { return this; }
        add() { return this; }
        setDepth() { return this; }
        emit(event: string) { this.emitted.push(event); return true; }
        removeAllListeners() { return this; }
        destroy() { (this as { destroyedBase?: boolean }).destroyedBase = true; }
      },
    },
    Geom: { Rectangle: class {} },
    TintModes: { MULTIPLY: 0, ADD: 1, FILL: 2 },
  },
}));
// Two silhouettes: the base texture is transparent everywhere, the dyed one is solid, so the hit test tells them apart.
vi.mock('../../src/game/objects/alphaMap', () => ({
  alphaMapOf: (_scene: unknown, key: string) => ({ width: 4, height: 4, data: new Uint8Array(16).fill(key === 'sweater-dyed' ? 255 : 0) }),
  opaqueBounds: () => null,
}));

import anchors from '../../src/game/data/anchors.json';
import { Cat } from '../../src/game/objects/Cat';

type Handler = (...args: unknown[]) => void;

/** An object that remembers what the cat does to it; anything else is a no-op that returns itself. */
class FakeObject {
  angle = 0;
  y = 0;
  alpha = 1;
  width = 512;
  height = 512;
  textures: string[] = [];
  destroyed = false;
  interactive: { hitAreaCallback?: (a: unknown, x: number, y: number) => boolean } | null = null;
  handlers = new Map<string, Handler>();
  constructor(readonly key?: string) {
    return new Proxy(this, { get: (t, p, r) => (p in t ? Reflect.get(t, p, r) : () => r) });
  }
  setAngle(a: number) { this.angle = a; return this; }
  setY(y: number) { this.y = y; return this; }
  setAlpha(a: number) { this.alpha = a; return this; }
  setTexture(key: string) { this.textures.push(key); return this; }
  setInteractive(cfg: FakeObject['interactive']) { this.interactive = cfg; return this; }
  on(event: string, fn: Handler) { this.handlers.set(event, fn); return this; }
  destroy() { this.destroyed = true; }
}

interface TweenConfig { targets?: unknown; angle?: unknown; y?: unknown; x?: unknown; tweens?: Record<string, unknown>[]; onComplete?: () => void }

function fakeScene({ reduced = false }: { reduced?: boolean } = {}) {
  const timers: { delay: number; fn: () => void; remove: ReturnType<typeof vi.fn> }[] = [];
  const added: TweenConfig[] = [];
  const chains: TweenConfig[] = [];
  const containers: FakeObject[] = [];
  const images: FakeObject[] = [];
  const killed: unknown[] = [];
  const scene = {
    add: {
      container: () => { const c = new FakeObject(); containers.push(c); return c; },
      image: (_x: number, _y: number, key: string) => { const i = new FakeObject(key); images.push(i); return i; },
      existing: () => undefined,
    },
    tweens: {
      add: (cfg: TweenConfig) => { added.push(cfg); return { stop: vi.fn(), remove: vi.fn() }; },
      chain: (cfg: TweenConfig) => { chains.push(cfg); return { stop: vi.fn() }; },
      killTweensOf: (t: unknown) => void killed.push(t),
    },
    time: {
      now: 0,
      delayedCall: (delay: number, fn: () => void) => {
        const t = { delay, fn, remove: vi.fn() };
        timers.push(t);
        return t;
      },
    },
    input: { activePointer: { x: 0, y: 0 } },
    registry: { get: (k: string) => (k === 'reducedMotion' ? reduced : undefined), events: { on: vi.fn(), off: vi.fn() } },
    textures: {},
  };
  return { scene, timers, added, chains, containers, images, killed };
}

const def = { id: 'naranja', name: 'Naranjito', coat: 'x', texture: 'cat-naranja' };
const sweater = { id: 'sweater-rayas', name: 'Sweater', slot: 'sweater', category: 'sweater', texture: 'sweater-rayas', icon: 'i', tags: [] };
const hat = { id: 'head-gorro', name: 'Gorro', slot: 'head', category: 'head', texture: 'head-gorro', icon: 'i', tags: [] };

function make(opts: { reduced?: boolean } = {}) {
  const f = fakeScene(opts);
  const cat = new Cat(f.scene as never, 0, 0, def, anchors as never, 512);
  const faceImage = f.images.find((i) => i.key === 'face-normal');
  return { f, cat, face: faceImage! };
}

const wearSweater = (f: ReturnType<typeof fakeScene>, cat: Cat) => {
  const before = f.images.length;
  cat.setOutfit([sweater] as never);
  return f.images[before];
};

describe('Cat.sayNo (F11.15)', () => {
  it('shows the puaj face and shakes the head 4 degrees twice', () => {
    const { f, cat, face } = make();
    cat.sayNo();
    expect(face.textures.at(-1)).toBe('face-puaj');
    const chain = f.chains.find((c) => c.tweens?.some((t) => t.angle !== undefined));
    expect(chain).toBeDefined();
    expect(chain!.tweens!.map((t) => t.angle)).toEqual([-4, 4, -4, 4, 0]);
  });

  it('goes back to the normal face after a moment', () => {
    const { f, cat, face } = make();
    cat.sayNo();
    const revert = f.timers.at(-1)!;
    revert.fn();
    expect(face.textures.at(-1)).toBe('face-normal');
  });

  it('with reduced motion only the face changes: no rotation', () => {
    const { f, cat, face } = make({ reduced: true });
    f.chains.length = 0;
    f.added.length = 0;
    cat.sayNo();
    expect(face.textures.at(-1)).toBe('face-puaj');
    expect(f.chains.some((c) => c.tweens?.some((t) => t.angle !== undefined))).toBe(false);
    expect(f.added.some((t) => t.angle !== undefined)).toBe(false);
  });
});

describe('Cat.glanceAt / lookAtBelly (F11.15)', () => {
  it('glanceAt moves the face toward the point and brings it back after the time', () => {
    const { f, cat } = make();
    const before = f.added.length;
    cat.glanceAt({ x: 900, y: 0 }, 500);
    const look = f.added.slice(before).find((t) => t.x !== undefined)!;
    expect(look.x as number).toBeGreaterThan(0);
    const back = f.timers.at(-1)!;
    expect(back.delay).toBe(500);
    const mark = f.added.length;
    back.fn();
    const home = f.added.slice(mark).find((t) => t.x !== undefined)!;
    expect(home.x).toBe(0);
  });

  it('lookAtBelly looks down, toward the torso anchor', () => {
    const { f, cat } = make();
    const before = f.added.length;
    cat.lookAtBelly();
    const look = f.added.slice(before).find((t) => t.y !== undefined)!;
    const base = anchors.canvas.height / 2 - 490;
    expect(look.y as number).toBeGreaterThan(base);
  });

  it('a second glance replaces the timer of the first', () => {
    const { f, cat } = make();
    cat.glanceAt({ x: 900, y: 0 });
    const first = f.timers.at(-1)!;
    cat.glanceAt({ x: -900, y: 0 });
    expect(first.remove).toHaveBeenCalled();
  });
});

describe('Cat.setItemTexture (F11.15)', () => {
  it('swaps the texture of the worn item and keeps the pixel hit test on the new silhouette', () => {
    const { f, cat } = make();
    const layer = wearSweater(f, cat);
    const hit = (x: number, y: number) => layer.interactive!.hitAreaCallback!({}, x, y);
    expect(hit(10, 10)).toBe(false);
    cat.setItemTexture('sweater-rayas', 'sweater-dyed');
    expect(layer.textures.at(-1)).toBe('sweater-dyed');
    expect(hit(10, 10)).toBe(true);
  });

  it('a layer made later for the same item starts with the dyed texture, and null goes back to the base one', () => {
    const { f, cat } = make();
    cat.setItemTexture('sweater-rayas', 'sweater-dyed');
    const before = f.images.length;
    cat.setOutfit([sweater] as never);
    expect(f.images[before].key).toBe('sweater-dyed');
    const layer = f.images[before];
    cat.setItemTexture('sweater-rayas', null);
    expect(layer.textures.at(-1)).toBe('sweater-rayas');
  });

  it('is a no-op for an item that is not worn', () => {
    const { f, cat } = make();
    const layer = wearSweater(f, cat);
    cat.setItemTexture('head-gorro', 'x');
    expect(layer.textures).toEqual([]);
  });
});

describe('Cat.applyPose / clearPose (F11.15)', () => {
  it('coqueto tilts the cat 8 degrees and holds the in-love face', () => {
    const { f, cat, face } = make();
    expect(cat.applyPose('coqueto')).toBe(true);
    expect(cat.currentPose).toBe('coqueto');
    expect(face.textures.at(-1)).toBe('face-amor');
    expect(f.added.some((t) => t.angle === 8)).toBe(true);
  });

  it('saltito lifts the cat 24 canvas px', () => {
    const { f, cat } = make();
    cat.applyPose('saltito');
    expect(f.added.some((t) => t.y === -24)).toBe(true);
  });

  it('with reduced motion the pose is set at once, with no tween on the body', () => {
    const { f, cat } = make({ reduced: true });
    const pose = f.containers[2];
    f.added.length = 0;
    cat.applyPose('coqueto');
    expect(pose.angle).toBe(8);
    expect(f.added.some((t) => t.angle === 8)).toBe(false);
  });

  it('instant puts the pose on at once with no tween, to capture it (F19.2)', () => {
    const { f, cat } = make();
    const pose = f.containers[2];
    f.added.length = 0;
    expect(cat.applyPose('coqueto', { instant: true })).toBe(true);
    expect(pose.angle).toBe(8);
    expect(f.added.some((t) => t.angle === 8)).toBe(false);
  });

  it('an unknown pose changes nothing', () => {
    const { cat } = make();
    expect(cat.applyPose('volando')).toBe(false);
    expect(cat.currentPose).toBeNull();
  });

  it('clearPose brings the body and the face back', () => {
    const { f, cat, face } = make();
    cat.applyPose('coqueto');
    f.added.length = 0;
    cat.clearPose();
    expect(cat.currentPose).toBeNull();
    expect(f.added.some((t) => t.angle === 0)).toBe(true);
    expect(face.textures.at(-1)).toBe('face-normal');
  });

  it('applyPose drops the pose of before (poses do not stack)', () => {
    const { cat } = make();
    cat.applyPose('coqueto');
    cat.applyPose('saltito');
    expect(cat.currentPose).toBe('saltito');
  });
});

describe('Cat.setOutfit instant (F11.15, to capture a dressed cat)', () => {
  it('a normal outfit pops in from alpha 0 and is not settled', () => {
    const { f, cat } = make();
    const layer = wearSweater(f, cat);
    expect(layer.alpha).toBe(0);
    expect(cat.settling).toBe(true);
  });

  it('instant puts the layers on at full opacity with no tween and no settling', () => {
    const { f, cat } = make();
    const tweens = f.added.length + f.chains.length;
    const before = f.images.length;
    cat.setOutfit([sweater, hat] as never, { instant: true });
    const layers = f.images.slice(before);
    expect(layers.length).toBeGreaterThanOrEqual(2);
    for (const l of layers) expect(l.alpha).toBe(1);
    expect(cat.settling).toBe(false);
    expect(f.added.length + f.chains.length).toBe(tweens);
    expect(cat.wornIds).toEqual(['sweater-rayas', 'head-gorro']);
  });

  it('instant removes the layers that leave at once, with no fade', () => {
    const { f, cat } = make();
    const layer = wearSweater(f, cat);
    cat.setOutfit([], { instant: true });
    expect(layer.destroyed).toBe(true);
    expect(cat.wornIds).toEqual([]);
  });
});

describe('cleanup (F11.15)', () => {
  it('destroy removes the timers of the new methods and stops the tweens of the pose', () => {
    const { f, cat } = make();
    cat.glanceAt({ x: 1, y: 1 });
    cat.sayNo();
    cat.destroy();
    for (const t of f.timers.slice(-2)) expect(t.remove).toHaveBeenCalled();
    expect(f.killed.flat()).toContain(f.containers[2]);
  });
});
