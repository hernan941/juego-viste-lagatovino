import { describe, expect, it, vi } from 'vitest';

// Phaser needs a browser to import. Cat only needs a Container base class (and Geom for the item hit areas).
vi.mock('phaser', () => ({
  default: {
    GameObjects: {
      Container: class {
        scaleX = 1;
        scaleY = 1;
        constructor(public scene: unknown) {}
        setScale() { return this; }
        add() { return this; }
        setDepth() { return this; }
      },
    },
    Geom: { Rectangle: class {} },
  },
}));

import anchors from '../../src/game/data/anchors.json';
import { catTailKey } from '../../src/game/data/assets';
import { TAIL_IDLE } from '../../src/game/domain/tail';
import { Cat } from '../../src/game/objects/Cat';

/** An image or container that accepts any call and remembers the angle it was given. */
class FakeObject {
  angle = 0;
  angleCalls: number[] = [];
  constructor(readonly key?: string) {
    return new Proxy(this, {
      get: (t, p, r) => (p in t ? Reflect.get(t, p, r) : () => r),
    });
  }
  setAngle(a: number) {
    this.angle = a;
    this.angleCalls.push(a);
    return this;
  }
}

interface TweenConfig {
  targets?: unknown;
  angle?: number | { from: number; to: number };
  tweens?: { angle: number; duration: number; ease: string }[];
  yoyo?: boolean;
  repeat?: number;
  onComplete?: () => void;
}

function fakeScene() {
  const images: FakeObject[] = [];
  const added: TweenConfig[] = [];
  const chains: TweenConfig[] = [];
  const scene = {
    add: {
      container: () => new FakeObject(),
      image: (_x: number, _y: number, key: string) => {
        const img = new FakeObject(key);
        images.push(img);
        return img;
      },
      existing: () => undefined,
    },
    tweens: {
      add: (cfg: TweenConfig) => {
        added.push(cfg);
        return { stop: vi.fn() };
      },
      chain: (cfg: TweenConfig) => {
        chains.push(cfg);
        return { stop: vi.fn() };
      },
      killTweensOf: vi.fn(),
    },
    time: { delayedCall: () => ({ remove: vi.fn() }) },
    textures: {},
  };
  return { scene, images, added, chains };
}

const def = { id: 'naranja', name: 'Naranjito', coat: 'x', texture: 'cat-naranja' };

describe('Cat tail: hand-over from the flick to the sway (F3 backlog)', () => {
  it('rests where the sway starts, and the sway does not reset the angle (no jump)', () => {
    const { scene, images, added, chains } = fakeScene();
    const cat = new Cat(scene as never, 0, 0, def, anchors as never, 512);
    const tail = images.find((i) => i.key === catTailKey(def))!;
    expect(tail.angle).toBe(-TAIL_IDLE.angle);

    cat.tailFlick();
    const flick = chains[0];
    const steps = flick.tweens!;
    // The tween engine would leave the tail on the angle of the last step.
    tail.angle = steps[steps.length - 1].angle;
    tail.angleCalls.length = 0;
    added.length = 0;

    flick.onComplete!();

    // The tail is where the sway begins and nothing teleports it: no setAngle, and the sway tween goes away from there.
    expect(tail.angleCalls).toEqual([]);
    expect(tail.angle).toBe(-TAIL_IDLE.angle);
    const sway = added.find((t) => t.yoyo && t.repeat === -1 && t.angle === TAIL_IDLE.angle);
    expect(sway, 'the sway starts again toward +angle').toBeDefined();
  });

  it('an idle sway that starts from scratch (the first one) does set the starting angle', () => {
    const { scene, images } = fakeScene();
    new Cat(scene as never, 0, 0, def, anchors as never, 512);
    const tail = images.find((i) => i.key === catTailKey(def))!;
    expect(tail.angleCalls).toEqual([-TAIL_IDLE.angle]);
  });
});
