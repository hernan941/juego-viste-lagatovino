import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { SfxKeys } from '../../src/game/constants';
import { COUNT_MAX_MS } from '../../src/game/domain/wallet';
import { CoinFlight } from '../../src/game/objects/CoinFlight';
import { WalletHud } from '../../src/game/objects/WalletHud';
import { makeFakeScene, type TweenRecord } from './helpers/kitScene';

interface TimerRecord { config: { delay: number; repeat?: number; callback: () => void }; removed: boolean; remove(): void }

/** The kit fake plus the two things the wallet needs: number tweens and timer events. */
function makeScene(reduced = false) {
  const scene = makeFakeScene(reduced);
  const timers: TimerRecord[] = [];
  const counters: TweenRecord[] = [];
  const base = scene.tweens.add;
  (scene.tweens as unknown as Record<string, unknown>).addCounter = (config: Record<string, unknown>) => {
    const rec = base.call(scene.tweens, { ...config, targets: config }) as TweenRecord;
    counters.push(rec);
    return rec;
  };
  (scene.time as unknown as Record<string, unknown>).addEvent = (config: TimerRecord['config']) => {
    const rec: TimerRecord = { config, removed: false, remove() { rec.removed = true; } };
    timers.push(rec);
    return rec;
  };
  // A fake "delayed call" that does not run at once, so a test decides when it fires.
  const later: (() => void)[] = [];
  (scene.time as unknown as Record<string, unknown>).delayedCall = (_ms: number, fn: () => void) => { later.push(fn); return { remove() {} }; };
  return { scene, timers, counters, later, active: () => timers.filter((t) => !t.removed) };
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const textOf = (hud: WalletHud) => hud.text;

describe('WalletHud', () => {
  it('shows the value it is given at once', () => {
    const { scene } = makeScene();
    const hud = new WalletHud(scene as never, 900, 34);
    hud.setValue(250);
    expect(hud.value).toBe(250);
    expect(textOf(hud)).toBe('250');
  });

  it('counts up tick by tick, one unit each, never longer than 1.2 s', () => {
    const { scene, timers } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    hud.setValue(100);
    hud.countTo(105);
    expect(hud.value).toBe(100);
    expect(hud.isCounting).toBe(true);
    const t = timers[0];
    expect(t.config.delay * ((t.config.repeat ?? 0) + 1)).toBeLessThanOrEqual(COUNT_MAX_MS);
    const seen: string[] = [];
    for (let i = 0; i <= (t.config.repeat ?? 0); i++) { t.config.callback(); seen.push(textOf(hud)); }
    expect(seen).toEqual(['101', '102', '103', '104', '105']);
    expect(hud.value).toBe(105);
    expect(hud.isCounting).toBe(false);
  });

  it('each tick sounds', () => {
    const { scene, timers } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    hud.setValue(0);
    hud.countTo(3);
    timers[0].config.callback();
    expect(scene.played).toContain(SfxKeys.Hover);
  });

  it('a big jump still ends exactly on the target within the time limit', () => {
    const { scene, timers } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    hud.setValue(0);
    hud.countTo(777);
    const t = timers[0];
    expect(t.config.delay * ((t.config.repeat ?? 0) + 1)).toBeLessThanOrEqual(COUNT_MAX_MS);
    for (let i = 0; i <= (t.config.repeat ?? 0); i++) t.config.callback();
    expect(hud.value).toBe(777);
  });

  it('a new count replaces the one in progress', () => {
    const { scene, timers, active } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    hud.setValue(0);
    hud.countTo(10);
    hud.countTo(20);
    expect(timers).toHaveLength(2);
    expect(active()).toHaveLength(1);
  });

  it('while held it ignores counts, and release counts to the wanted value', () => {
    const { scene, timers, active } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    hud.setValue(10);
    hud.hold();
    hud.countTo(50);
    expect(timers).toHaveLength(0);
    hud.release(12);
    expect(active()).toHaveLength(1);
    const t = timers[0];
    for (let i = 0; i <= (t.config.repeat ?? 0); i++) t.config.callback();
    expect(hud.value).toBe(12);
  });

  it('adjust moves the shown number by a credit, with a pop (a button landed)', () => {
    const { scene } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    hud.setValue(10);
    hud.hold();
    hud.adjust(5);
    expect(hud.value).toBe(15);
    expect(scene.activeTweens().some((t) => 'scale' in t.config || Array.isArray(t.config.tweens))).toBe(true);
  });

  it('shake moves it sideways; reduced motion only blinks (no movement)', () => {
    const full = makeScene();
    new WalletHud(full.scene as never, 0, 0).shake();
    expect(full.scene.tweens.records.some((r) => 'x' in r.config || 'angle' in r.config)).toBe(true);
    const calm = makeScene(true);
    new WalletHud(calm.scene as never, 0, 0).shake();
    expect(calm.scene.tweens.records.some((r) => 'x' in r.config || 'angle' in r.config)).toBe(false);
    expect(calm.scene.tweens.records.some((r) => 'alpha' in r.config)).toBe(true);
  });

  it('tells where the jar is, for the buttons to fly to', () => {
    const { scene } = makeScene();
    const hud = new WalletHud(scene as never, 900, 34);
    const p = hud.getJarPoint();
    expect(typeof p.x).toBe('number');
    expect(typeof p.y).toBe('number');
  });

  it('appears with a tween, not all at once', () => {
    const { scene } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    expect(hud.alpha).toBe(0);
    expect(scene.activeTweens().length).toBeGreaterThan(0);
  });

  it('leaves no timers or tweens when destroyed', () => {
    const { scene, active } = makeScene();
    const hud = new WalletHud(scene as never, 0, 0);
    hud.setValue(0);
    hud.countTo(9);
    hud.shake();
    hud.destroy();
    expect(active()).toHaveLength(0);
    expect(scene.activeTweens()).toHaveLength(0);
  });
});

describe('CoinFlight', () => {
  const run = (coins: number, reduced = false) => {
    const ctx = makeScene(reduced);
    const lands: { credit: number; index: number }[] = [];
    const done = vi.fn();
    const flight = new CoinFlight(ctx.scene as never, {
      from: { x: 0, y: 0 }, to: { x: 300, y: 100 }, coins, onLand: (credit, index) => lands.push({ credit, index }), onDone: done,
    });
    return { ...ctx, flight, lands, done };
  };

  /** Finishes every flight tween, in order. */
  const land = (counters: TweenRecord[]) => {
    for (const rec of counters) (rec.config.onComplete as (() => void) | undefined)?.();
  };

  it('draws one button per 5 coins, 12 at most', () => {
    expect(run(23).counters).toHaveLength(5);
    expect(run(900).counters).toHaveLength(12);
  });

  it('with reduced motion only 3 buttons fly', () => {
    expect(run(900, true).counters).toHaveLength(3);
  });

  it('every landing credits its share, the credits add up to the coins, and clinks', () => {
    const { counters, lands, done, scene } = run(23);
    land(counters);
    expect(lands.reduce((s, l) => s + l.credit, 0)).toBe(23);
    expect(scene.played.filter((k) => k === SfxKeys.Clink).length).toBe(5);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('works backwards too (wallet to the garment): same plan, other end', () => {
    const ctx = makeScene();
    const lands: number[] = [];
    new CoinFlight(ctx.scene as never, { from: { x: 900, y: 34 }, to: { x: 100, y: 300 }, coins: 10, onLand: (c) => lands.push(c) });
    land(ctx.counters);
    expect(lands.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('is active until the last button lands', () => {
    const { flight, counters } = run(10);
    expect(flight.active).toBe(true);
    land(counters);
    expect(flight.active).toBe(false);
  });

  it('has nothing to fly for zero coins and still finishes', () => {
    const { counters, done, flight } = run(0);
    expect(counters).toHaveLength(0);
    expect(done).toHaveBeenCalledTimes(1);
    expect(flight.active).toBe(false);
  });

  it('cancel kills the tweens and never credits again', () => {
    const { flight, counters, lands, scene } = run(30);
    flight.cancel();
    expect(scene.activeTweens()).toHaveLength(0);
    land(counters);
    expect(lands).toHaveLength(0);
  });

  it('a skip lands everything at once with the same credits', () => {
    const { flight, lands, done } = run(30);
    flight.finishNow();
    expect(lands.reduce((s, l) => s + l.credit, 0)).toBe(30);
    expect(done).toHaveBeenCalledTimes(1);
  });
});
