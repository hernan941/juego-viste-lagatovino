import { describe, expect, it, vi } from 'vitest';

// Phaser needs a browser to import. Cat only needs a Container base class (and Geom for the item hit areas).
vi.mock('phaser', () => ({
  default: {
    GameObjects: {
      Container: class {
        scaleX = 1;
        scaleY = 1;
        emitted: string[] = [];
        constructor(public scene: unknown) {}
        setScale() { return this; }
        add() { return this; }
        setDepth() { return this; }
        emit(event: string) { this.emitted.push(event); return true; }
        removeAllListeners() { return this; }
        destroy() {}
      },
    },
    Geom: { Rectangle: class {} },
  },
}));
// The alpha map needs a canvas; the cat only needs to ask for it.
vi.mock('../../src/game/objects/alphaMap', () => ({
  alphaMapOf: () => ({ width: 4, height: 4, data: new Uint8Array(16).fill(255) }),
  opaqueBounds: () => null,
}));

import anchors from '../../src/game/data/anchors.json';
import { ObjectEvents } from '../../src/game/constants';
import { TAIL_FLICK_WAG, TAIL_IDLE } from '../../src/game/domain/tail';
import { Cat } from '../../src/game/objects/Cat';

class FakeObject {
  angle = 0;
  constructor(readonly key?: string) {
    return new Proxy(this, { get: (t, p, r) => (p in t ? Reflect.get(t, p, r) : () => r) });
  }
  setAngle(a: number) {
    this.angle = a;
    return this;
  }
}

interface TweenConfig {
  targets?: unknown;
  scaleY?: unknown;
  angle?: unknown;
  yoyo?: boolean;
  repeat?: number;
  tweens?: { angle: number }[];
  onComplete?: () => void;
}

function fakeScene({ reduced = false, now = 0 }: { reduced?: boolean; now?: number } = {}) {
  const timers: { delay: number; fn: () => void; remove: ReturnType<typeof vi.fn> }[] = [];
  const added: TweenConfig[] = [];
  const chains: TweenConfig[] = [];
  const clock = { now };
  const scene = {
    add: { container: () => new FakeObject(), image: (_x: number, _y: number, key: string) => new FakeObject(key), existing: () => undefined },
    tweens: {
      add: (cfg: TweenConfig) => { added.push(cfg); return { stop: vi.fn(), remove: vi.fn() }; },
      chain: (cfg: TweenConfig) => { chains.push(cfg); return { stop: vi.fn() }; },
      killTweensOf: vi.fn(),
    },
    time: {
      get now() { return clock.now; },
      delayedCall: (delay: number, fn: () => void) => {
        const t = { delay, fn, remove: vi.fn() };
        timers.push(t);
        return t;
      },
    },
    registry: { get: (k: string) => (k === 'reducedMotion' ? reduced : undefined), events: { on: vi.fn(), off: vi.fn() } },
    textures: {},
  };
  return { scene, timers, added, chains, clock };
}

const def = { id: 'naranja', name: 'Naranjito', coat: 'x', texture: 'cat-naranja' };

describe('Cat idle extras (F9): a glance aside, a spontaneous tail wag and the pet', () => {
  it('schedules the blink, the glance (8 to 12 s) and the wag (6 to 10 s), and removes every timer on destroy', () => {
    const { scene, timers } = fakeScene();
    const cat = new Cat(scene as never, 0, 0, def, anchors as never, 512);
    const delays = timers.map((t) => t.delay);
    expect(timers).toHaveLength(3);
    expect(delays.some((d) => d >= 3000 && d < 5000)).toBe(true);
    expect(delays.some((d) => d >= 8000 && d < 12_000)).toBe(true);
    expect(delays.some((d) => d >= 6000 && d < 10_000)).toBe(true);
    cat.destroy();
    for (const t of timers) expect(t.remove).toHaveBeenCalled();
  });

  it('the spontaneous wag is a soft 6 degree flick that ends where the sway starts, and it schedules the next one', () => {
    const { scene, timers, chains } = fakeScene();
    new Cat(scene as never, 0, 0, def, anchors as never, 512);
    // Created in order: blink, glance, wag (the delay ranges of the glance and the wag overlap, so the order is what tells them apart).
    const wag = timers[2];
    expect(wag.delay).toBeGreaterThanOrEqual(6000);
    expect(wag.delay).toBeLessThan(10_000);
    const before = timers.length;
    wag.fn();
    expect(chains).toHaveLength(1);
    expect(chains[0].tweens!.map((s) => s.angle)).toEqual([-TAIL_FLICK_WAG, TAIL_FLICK_WAG, -TAIL_IDLE.angle]);
    expect(timers.length).toBe(before + 1);
  });

  it('the whip when an item is dropped is bigger (12 degrees)', () => {
    const { scene, chains } = fakeScene();
    const cat = new Cat(scene as never, 0, 0, def, anchors as never, 512);
    cat.wiggle();
    expect(chains[0].tweens!.map((s) => s.angle)).toEqual([-12, 12, -TAIL_IDLE.angle]);
  });

  it('the chin of the royal pose goes up -7 degrees (it was -4 and was hardly seen), and 0 with reduced motion', () => {
    const full = fakeScene();
    new Cat(full.scene as never, 0, 0, def, anchors as never, 512).raiseChin(1100);
    expect(full.chains.at(-1)!.tweens!.map((s) => s.angle)).toEqual([-7, -7, 0]);
    const calm = fakeScene({ reduced: true });
    new Cat(calm.scene as never, 0, 0, def, anchors as never, 512).raiseChin(1100);
    expect(calm.chains.at(-1)!.tweens![0].angle).toBeCloseTo(0);
  });

  it('petting answers with an event, at most once every 400 ms, and only if the cat was made pettable', () => {
    const { scene, clock } = fakeScene({ now: 1000 });
    const cat = new Cat(scene as never, 0, 0, def, anchors as never, 512);
    expect(cat.pet()).toBe(false);
    cat.makePettable();
    expect(cat.pet()).toBe(true);
    clock.now = 1200;
    expect(cat.pet()).toBe(false);
    clock.now = 1400;
    expect(cat.pet()).toBe(true);
    expect((cat as unknown as { emitted: string[] }).emitted.filter((e) => e === ObjectEvents.CatPet)).toHaveLength(2);
  });
});

describe('Cat idle in reduced motion (ADR 0013)', () => {
  it('does not breathe and sways the tail a little and slowly', () => {
    const { scene, added } = fakeScene({ reduced: true });
    new Cat(scene as never, 0, 0, def, anchors as never, 512);
    expect(added.some((t) => t.scaleY !== undefined)).toBe(false);
    const sway = added.find((t) => t.yoyo && t.repeat === -1)!;
    expect(sway.angle).toBeLessThanOrEqual(TAIL_IDLE.angle * 0.3);
    expect((sway as unknown as { duration: number }).duration).toBeGreaterThan(TAIL_IDLE.duration);
  });

  it('breathes in full motion', () => {
    const { scene, added } = fakeScene();
    new Cat(scene as never, 0, 0, def, anchors as never, 512);
    expect(added.some((t) => t.scaleY !== undefined)).toBe(true);
  });
});
