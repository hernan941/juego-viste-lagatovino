import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { ObjectEvents, SfxKeys } from '../../src/game/constants';
import { NameSign } from '../../src/game/objects/NameSign';
import { makeFakeScene } from './helpers/kitScene';

function make(reduced = false) {
  const scene = makeFakeScene(reduced);
  const sign = new NameSign(scene as never, 640, 92, 'Luna');
  const presses: unknown[] = [];
  sign.on(ObjectEvents.SignPress, (s: unknown) => presses.push(s));
  return { scene, sign, presses };
}
const hit = (sign: NameSign) => (sign as unknown as { interactive: { hitArea: { width: number; height: number }; useHandCursor: boolean } | null }).interactive;
const mouse = { wasTouch: false };
const finger = { wasTouch: true };

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('NameSign as a button (F14.4)', () => {
  it('is not interactive until it is asked to be', () => {
    const { sign } = make();
    expect(hit(sign)).toBeNull();
  });

  it('has a hand cursor and a touch area of at least 80 high', () => {
    const { sign } = make();
    sign.makeInteractive();
    expect(hit(sign)!.useHandCursor).toBe(true);
    expect(hit(sign)!.hitArea.height).toBeGreaterThanOrEqual(80);
    expect(hit(sign)!.hitArea.width).toBeGreaterThanOrEqual(190);
  });

  it('pressed and released on it: emits SignPress and clicks', () => {
    const { sign, presses, scene } = make();
    sign.makeInteractive();
    sign.emit('pointerdown', mouse);
    sign.emit('pointerup', mouse);
    expect(presses).toEqual([sign]);
    expect(scene.played).toContain(SfxKeys.Click);
  });

  it('released without having been pressed on it (a drag that ended here) does nothing', () => {
    const { sign, presses } = make();
    sign.makeInteractive();
    sign.emit('pointerup', mouse);
    expect(presses).toHaveLength(0);
  });

  it('leaving it while pressed cancels the press', () => {
    const { sign, presses } = make();
    sign.makeInteractive();
    sign.emit('pointerdown', mouse);
    sign.emit('pointerout', mouse);
    sign.emit('pointerup', mouse);
    expect(presses).toHaveLength(0);
  });

  it('the mouse over it grows it a little; a finger has no hover but still gets the press feedback', () => {
    const { sign, scene } = make();
    sign.makeInteractive();
    const before = scene.tweens.records.length;
    sign.emit('pointerover', finger);
    expect(scene.tweens.records.length).toBe(before);
    sign.emit('pointerover', mouse);
    expect(scene.tweens.records.at(-1)!.config.scale).toBeGreaterThan(1);
    sign.emit('pointerout', mouse);
    expect(scene.tweens.records.at(-1)!.config.scale).toBe(1);
    sign.emit('pointerdown', finger);
    expect(scene.tweens.records.at(-1)!.config.scale).toBeLessThan(1);
  });

  it('with reduced motion the press feedback has no scale (only the click answers)', () => {
    const { sign, scene } = make(true);
    sign.makeInteractive();
    const before = scene.tweens.records.length;
    sign.emit('pointerdown', mouse);
    sign.emit('pointerover', mouse);
    expect(scene.tweens.records.slice(before).some((r) => 'scale' in r.config)).toBe(false);
  });
});
