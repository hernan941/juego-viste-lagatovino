import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { ObjectEvents } from '../../src/game/constants';
import { PriceTag } from '../../src/game/objects/PriceTag';
import { makeFakeScene } from './helpers/kitScene';

type Obj = Record<string, unknown>;

/** The kit fake plus `add.zone` (the touch area of the tag). */
function makeScene(reduced = false) {
  const scene = makeFakeScene(reduced);
  const zones: { width: number; height: number; interactive: unknown; emit(e: string, ...a: unknown[]): void }[] = [];
  (scene.add as Record<string, unknown>).zone = (x: number, y: number, w: number, h: number) => {
    const z = (scene.add as Record<string, (...a: unknown[]) => Obj>).container(x, y, []) as Obj;
    (z.setSize as (w: number, h: number) => unknown)(w, h);
    zones.push(z as never);
    return z;
  };
  return { scene, zones };
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('PriceTag (F13.4)', () => {
  it('always writes the price on the tag', () => {
    const { scene } = makeScene();
    const tag = new PriceTag(scene as never, 0, 0, 110);
    expect(tag.price).toBe(110);
    expect(scene.made.texts.some((t) => t.text === '110')).toBe(true);
  });

  it('sways: angle -6 to 6, 1.4 s, Sine.easeInOut, yoyo and forever', () => {
    const { scene } = makeScene();
    new PriceTag(scene as never, 0, 0, 40);
    const sway = scene.tweens.records.find((r) => r.config.repeat === -1)!;
    expect(sway.config).toMatchObject({ yoyo: true, duration: 1400, ease: 'Sine.easeInOut' });
    expect(sway.config.angle).toEqual({ from: -6, to: 6 });
  });

  it('does not sway with reduced motion', () => {
    const { scene } = makeScene(true);
    new PriceTag(scene as never, 0, 0, 40);
    expect(scene.tweens.records.some((r) => r.config.repeat === -1)).toBe(false);
  });

  it('a poke jumps the tag to 18 degrees and settles it with Back.easeOut', () => {
    const { scene } = makeScene();
    const tag = new PriceTag(scene as never, 0, 0, 40);
    tag.flick();
    const poke = scene.tweens.records.filter((r) => r.config.ease === 'Back.easeOut' && !r.removed).at(-1)!;
    expect(poke.config.angle).toBe(0);
    expect(tag.swingAngle).toBe(18);
  });

  it('a poke with reduced motion is a soft pulse, with no angle', () => {
    const { scene } = makeScene(true);
    const tag = new PriceTag(scene as never, 0, 0, 40);
    tag.flick();
    expect(tag.swingAngle).toBe(0);
    expect(scene.tweens.records.some((r) => 'scale' in r.config)).toBe(true);
  });

  it('is interactive with a touch area of at least 80 x 80 game px, whatever its size', () => {
    for (const scale of [0.46, 0.62]) {
      const { scene, zones } = makeScene();
      new PriceTag(scene as never, 0, 0, 40, { scale, interactive: true });
      expect(zones).toHaveLength(1);
      expect(zones[0].width * scale).toBeGreaterThanOrEqual(80);
      expect(zones[0].height * scale).toBeGreaterThanOrEqual(80);
      expect(zones[0].interactive).toMatchObject({ useHandCursor: true });
    }
  });

  it('a tag that is only decoration has no touch area', () => {
    const { scene, zones } = makeScene();
    new PriceTag(scene as never, 0, 0, 40);
    expect(zones).toHaveLength(0);
  });

  it('pressing the tag pokes it and says so (the price tag press event)', () => {
    const { scene, zones } = makeScene();
    const tag = new PriceTag(scene as never, 0, 0, 40, { interactive: true });
    const heard = vi.fn();
    tag.on(ObjectEvents.PriceTagPress, heard);
    zones[0].emit('pointerup', { wasTouch: false });
    expect(heard).toHaveBeenCalledWith(tag);
    expect(tag.swingAngle).toBe(18);
  });

  it('hover grows it a bit and leaving brings it back', () => {
    const { scene } = makeScene();
    const tag = new PriceTag(scene as never, 0, 0, 40, { scale: 0.5 });
    tag.setHover(true);
    expect(scene.tweens.records.at(-1)!.config.scale).toBeGreaterThan(0.5);
    tag.setHover(false);
    expect(scene.tweens.records.at(-1)!.config.scale).toBe(0.5);
  });

  it('appears with a tween, not all at once', () => {
    const { scene } = makeScene();
    const tag = new PriceTag(scene as never, 0, 0, 40);
    expect(tag.alpha).toBe(0);
    expect(scene.tweens.records.some((r) => 'alpha' in r.config)).toBe(true);
  });

  it('leaves no tweens running when destroyed', () => {
    const { scene } = makeScene();
    const tag = new PriceTag(scene as never, 0, 0, 40);
    tag.flick();
    tag.destroy();
    expect(scene.activeTweens()).toHaveLength(0);
  });
});
