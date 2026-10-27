import { describe, expect, it, vi } from 'vitest';
import { startSweep } from '../../src/game/objects/DyeSweep';

type Cfg = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose bag of tween options in a hand-made fake

// A hand-made Phaser: tweens the test steps by hand, and an image that records its crop.
function setup(reduced: boolean) {
  const tweens: { cfg: Cfg; removed: boolean; remove(): void }[] = [];
  const overlay = {
    crops: [] as unknown[], alpha: 1, destroyed: false, active: true, frame: { width: 200, height: 400 },
    setOrigin() { return this; }, setScale() { return this; }, setAngle() { return this; }, setDepth() { return this; },
    setCrop(...a: unknown[]) { this.crops.push(a); return this; }, setAlpha(a: number) { this.alpha = a; return this; },
    destroy() { this.destroyed = true; this.active = false; },
  };
  const added: unknown[] = [];
  const parent = { getIndex: () => 3, addAt: (o: unknown, i: number) => added.push([o, i]) };
  const image = { x: 1, y: 2, originX: 0.5, originY: 0.5, scaleX: 1, scaleY: 1, angle: 0, depth: 4, active: true, parentContainer: parent };
  const make = (cfg: Cfg) => {
    const t = { cfg, removed: false, remove() { t.removed = true; } };
    tweens.push(t);
    return t;
  };
  const scene = {
    registry: { get: (k: string) => (k === 'reducedMotion' ? reduced : undefined) },
    add: { image: () => overlay },
    tweens: { addCounter: make, add: make },
  };
  return { scene, image, overlay, tweens, added };
}

describe('startSweep (F16.4)', () => {
  it('puts the new color right over the item, in the same container', () => {
    const { scene, image, added, overlay } = setup(false);
    startSweep(scene as never, image as never, 'sweater~rosa', () => undefined);
    expect(added).toEqual([[overlay, 4]]);
  });

  it('reveals it from the bottom up with a crop and calls done at the end, then removes the overlay', () => {
    const { scene, image, overlay, tweens } = setup(false);
    const done = vi.fn();
    startSweep(scene as never, image as never, 'k', done);
    tweens[0].cfg.onUpdate({ getValue: () => 0.5 });
    expect(overlay.crops.at(-1)).toEqual([0, 200, 200, 200]);
    expect(done).not.toHaveBeenCalled();
    tweens[0].cfg.onComplete();
    expect(done).toHaveBeenCalledTimes(1);
    expect(overlay.destroyed).toBe(true);
  });

  it('with reduced motion there is no mask: the color fades in', () => {
    const { scene, image, overlay, tweens } = setup(true);
    const done = vi.fn();
    startSweep(scene as never, image as never, 'k', done);
    expect(overlay.crops).toHaveLength(0);
    expect(overlay.alpha).toBe(0);
    expect(tweens[0].cfg.alpha).toBe(1);
    tweens[0].cfg.onComplete();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('finish() ends it at once, only once', () => {
    const { scene, image, overlay, tweens } = setup(false);
    const done = vi.fn();
    const sweep = startSweep(scene as never, image as never, 'k', done);
    sweep.finish();
    sweep.finish();
    tweens[0].cfg.onComplete?.();
    expect(done).toHaveBeenCalledTimes(1);
    expect(tweens[0].removed).toBe(true);
    expect(overlay.destroyed).toBe(true);
  });

  it('if the garment left meanwhile, it ends without painting', () => {
    const { scene, image, overlay, tweens } = setup(false);
    const done = vi.fn();
    startSweep(scene as never, image as never, 'k', done);
    image.active = false;
    tweens[0].cfg.onUpdate({ getValue: () => 0.3 });
    expect(done).toHaveBeenCalledTimes(1);
    expect(overlay.destroyed).toBe(true);
  });
});
