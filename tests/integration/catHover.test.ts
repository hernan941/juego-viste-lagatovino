import { describe, expect, it, vi } from 'vitest';

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
    TintModes: { MULTIPLY: 0, ADD: 1, FILL: 2 },
  },
}));
vi.mock('../../src/game/objects/alphaMap', () => ({
  alphaMapOf: () => ({ width: 4, height: 4, data: new Uint8Array(16).fill(255) }),
  opaqueBounds: () => null,
}));

import anchors from '../../src/game/data/anchors.json';
import { ObjectEvents } from '../../src/game/constants';
import { Cat } from '../../src/game/objects/Cat';

type Handler = (...args: unknown[]) => void;

/** An image that remembers its handlers, its tint and the glow filters added to it. */
class FakeImage {
  handlers = new Map<string, Handler>();
  tints: unknown[] = [];
  tintModes: unknown[] = [];
  glows: { color: number }[] = [];
  removedGlows = 0;
  filters = {
    internal: {
      addGlow: (color: number) => { const g = { color }; this.glows.push(g); return g; },
      remove: () => { this.removedGlows++; },
    },
  };
  constructor(readonly key?: string) {
    return new Proxy(this, { get: (t, p, r) => (p in t ? Reflect.get(t, p, r) : () => r) });
  }
  on(event: string, fn: Handler) { this.handlers.set(event, fn); return this; }
  enableFilters() { return this; }
  setTint(c: unknown) { this.tints.push(c); return this; }
  setTintMode(m: unknown) { this.tintModes.push(m); return this; }
  clearTint() { return this; }
}

function fakeScene(pointer = { x: 0, y: 0 }) {
  const images: FakeImage[] = [];
  return {
    images,
    pointer,
    scene: {
      add: { container: () => new FakeImage(), image: (_x: number, _y: number, key: string) => { const i = new FakeImage(key); images.push(i); return i; }, existing: () => undefined },
      tweens: { add: () => ({ stop: vi.fn(), remove: vi.fn() }), chain: () => ({ stop: vi.fn() }), killTweensOf: vi.fn() },
      time: { now: 0, delayedCall: () => ({ remove: vi.fn() }) },
      input: { activePointer: pointer },
      registry: { get: () => false, events: { on: vi.fn(), off: vi.fn() } },
      textures: {},
    },
  };
}

const def = { id: 'naranja', name: 'Naranjito', coat: 'x', texture: 'cat-naranja' };
const sweater = { id: 'sweater-rayas', name: 'Sweater de rayas', slot: 'sweater', category: 'sweater', texture: 'sweater-rayas', icon: 'i', tags: [] };

function wear() {
  const f = fakeScene({ x: 300, y: 300 });
  const cat = new Cat(f.scene as never, 0, 0, def, anchors as never, 512);
  const before = f.images.length;
  cat.setOutfit([sweater] as never);
  const layer = f.images[before] as FakeImage & { handlers: Map<string, Handler> };
  const emitted = () => (cat as unknown as { emitted: string[] }).emitted.filter((e) => e === ObjectEvents.LayerHover).length;
  return { f, cat, layer, emitted, at: (x: number, y: number) => ({ x, y }) };
}

describe('Cat hover on worn items (F9, review of task 16)', () => {
  it('hover never tints the fill: it asks for the sparkle and adds a rosa-200 glow behind the garment', () => {
    const { layer, emitted, f } = wear();
    f.pointer.x = 900; f.pointer.y = 900; // the pointer moved away from where the garment appeared
    layer.handlers.get('pointermove')?.({ x: 900, y: 900 });
    layer.handlers.get('pointerover')!({ x: 900, y: 900 });
    expect(layer.tints).toEqual([]);
    expect(layer.tintModes).not.toContain(1);
    expect(layer.glows.map((g) => g.color)).toEqual([0xffd1e3]);
    expect(emitted()).toBe(1);
    layer.handlers.get('pointerout')!();
    expect(layer.removedGlows).toBe(1);
  });

  it('a just-worn garment under a still pointer does not light up until the pointer moves', () => {
    const { layer, emitted } = wear();
    layer.handlers.get('pointerover')!({ x: 300, y: 300 });
    expect(layer.glows).toHaveLength(0);
    expect(emitted()).toBe(0);
    layer.handlers.get('pointermove')!({ x: 301, y: 300 });
    expect(layer.glows).toHaveLength(0);
    layer.handlers.get('pointermove')!({ x: 320, y: 300 });
    expect(layer.glows).toHaveLength(1);
    expect(emitted()).toBe(1);
  });

  it('after dragend without moving there is no hover, and none of it touches the tint', () => {
    const { layer, emitted } = wear();
    layer.handlers.get('dragstart')!({ x: 300, y: 300 });
    layer.handlers.get('dragend')!({ x: 500, y: 400 });
    layer.handlers.get('pointerover')!({ x: 500, y: 400 });
    expect(layer.glows).toHaveLength(0);
    expect(emitted()).toBe(0);
    layer.handlers.get('pointermove')!({ x: 530, y: 410 });
    expect(layer.glows).toHaveLength(1);
    expect(layer.tints).toEqual([]);
  });
});
