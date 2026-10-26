import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { DressUpEvents, RegistryKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import type { Progress } from '../../src/game/domain/types';
import type { DressUpContext } from '../../src/game/objects/dressup/DressUpController';
import { controllerFactories } from '../../src/game/objects/dressup/controllers';
import { WalletController } from '../../src/game/objects/dressup/WalletController';
import { makeFakeScene, type TweenRecord } from './helpers/kitScene';

type Fn = (...a: unknown[]) => void;
interface Listener { fn: Fn; context: unknown }
/** Like Phaser's EventEmitter: `on(event, fn, context)`. */
class Emitter {
  private readonly map = new Map<string, Listener[]>();
  on(e: string, fn: Fn, context?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, context }]); return this; }
  off(e: string, fn: Fn, context?: unknown) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => !(l.fn === fn && l.context === context))); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of this.map.get(e) ?? []) l.fn.apply(l.context, a); }
  count(e: string) { return (this.map.get(e) ?? []).length; }
}

function setup(wallet = 100, reduced = false) {
  const scene = makeFakeScene(reduced) as ReturnType<typeof makeFakeScene> & Record<string, unknown>;
  const timers: { config: { delay: number; repeat?: number; callback: () => void }; removed: boolean; remove(): void }[] = [];
  const counters: TweenRecord[] = [];
  const base = scene.tweens.add;
  (scene.tweens as unknown as Record<string, unknown>).addCounter = (config: Record<string, unknown>) => {
    const rec = base.call(scene.tweens, { ...config, targets: config }) as TweenRecord;
    counters.push(rec);
    return rec;
  };
  (scene.time as unknown as Record<string, unknown>).addEvent = (config: (typeof timers)[number]['config']) => {
    const rec = { config, removed: false, remove() { rec.removed = true; } };
    timers.push(rec);
    return rec;
  };
  const events = new Emitter();
  const regEvents = new Emitter();
  let progress: Progress = { ...emptyProgress(100), wallet };
  scene.events = events;
  scene.registry = {
    events: regEvents,
    get: (key: string) => (key === RegistryKeys.Progress ? progress : key === 'reducedMotion' ? reduced : undefined),
  } as never;
  const hud = (scene.add as Record<string, (...a: unknown[]) => { list: unknown[] }>).container(0, 0, []);
  const ctx = { scene, hud } as unknown as DressUpContext;
  const controller = new WalletController();
  controller.attach(ctx);
  const setWallet = (n: number) => {
    const prev = progress;
    progress = { ...progress, wallet: n };
    regEvents.emit(`changedata-${RegistryKeys.Progress}`, scene.registry, progress, prev);
  };
  const state = () => (controller.e2eState() as { wallet: { shown: number; wallet: number; counting: boolean; held: boolean } }).wallet;
  /** Runs every tick of the current count. */
  const tick = () => {
    const t = timers.filter((x) => !x.removed).at(-1);
    if (!t) return;
    for (let i = 0; i <= (t.config.repeat ?? 0); i++) t.config.callback();
  };
  const land = () => { for (const c of counters) { (c.config.onStart as (() => void) | undefined)?.(); (c.config.onComplete as (() => void) | undefined)?.(); } };
  return { scene, events, regEvents, controller, setWallet, state, tick, timers, counters, land, hud };
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('WalletController (F13.3)', () => {
  it('is registered in the controllers list', () => {
    expect(controllerFactories.some((make) => make() instanceof WalletController)).toBe(true);
  });

  it('shows the wallet of the progress from the start', () => {
    const { state } = setup(250);
    expect(state()).toMatchObject({ shown: 250, wallet: 250, counting: false });
  });

  it('the number follows the progress with ticks (up and down)', () => {
    const { setWallet, state, tick } = setup(100);
    setWallet(108);
    expect(state().counting).toBe(true);
    tick();
    expect(state().shown).toBe(108);
    setWallet(60);
    tick();
    expect(state().shown).toBe(60);
  });

  it('the shake event shakes the purse', () => {
    const { events, scene } = setup();
    const before = scene.tweens.records.length;
    events.emit(DressUpEvents.WalletShake);
    expect(scene.tweens.records.length).toBeGreaterThan(before);
  });

  it('flying buttons in: the number is held and each landing adds its credit; at the end it settles on the progress', () => {
    const { events, setWallet, state, land, scene } = setup(100);
    events.emit(DressUpEvents.WalletFlight, { direction: 'in', at: { x: 300, y: 300 }, coins: 15 });
    setWallet(115);
    expect(state().held).toBe(true);
    expect(state().shown).toBe(100);
    land();
    expect(state().held).toBe(false);
    expect(state().shown).toBe(115);
    expect(scene.played.filter((k) => k === 'sfx-clink')).toHaveLength(3);
  });

  it('flying buttons out (a purchase): the number drops as the buttons leave and settles on the progress', () => {
    const { events, setWallet, state, land } = setup(100);
    events.emit(DressUpEvents.WalletFlight, { direction: 'out', at: { x: 300, y: 300 }, coins: 40 });
    setWallet(60);
    land();
    expect(state().shown).toBe(60);
    expect(state().held).toBe(false);
  });

  it('is not settled while buttons fly', () => {
    const { events, controller, land, setWallet } = setup(100);
    expect(controller.isSettled()).toBe(true);
    events.emit(DressUpEvents.WalletFlight, { direction: 'in', at: { x: 0, y: 0 }, coins: 10 });
    setWallet(110);
    expect(controller.isSettled()).toBe(false);
    land();
    expect(controller.isSettled()).toBe(true);
  });

  it('with reduced motion only 3 buttons fly', () => {
    const { events, counters } = setup(100, true);
    events.emit(DressUpEvents.WalletFlight, { direction: 'in', at: { x: 0, y: 0 }, coins: 500 });
    expect(counters).toHaveLength(3);
  });

  it('destroy removes every listener and leaves nothing running', () => {
    const { controller, events, regEvents, scene, timers, setWallet } = setup(100);
    setWallet(120);
    events.emit(DressUpEvents.WalletFlight, { direction: 'in', at: { x: 0, y: 0 }, coins: 20 });
    controller.destroy();
    expect(events.count(DressUpEvents.WalletFlight)).toBe(0);
    expect(events.count(DressUpEvents.WalletShake)).toBe(0);
    expect(regEvents.count(`changedata-${RegistryKeys.Progress}`)).toBe(0);
    expect(timers.filter((t) => !t.removed)).toHaveLength(0);
    expect(scene.activeTweens()).toHaveLength(0);
  });
});
