import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

// A stand-in for the bubble: it only records the lines it was asked to say.
vi.mock('../../src/game/objects/kit/SpeechBubble', () => {
  const made: string[] = [];
  return {
    made,
    SpeechBubble: class {
      constructor(_s: unknown, _x: number, _y: number, text: string) { made.push(text); }
      setDepth() { return this; }
      destroy() {}
    },
  };
});

// A stand-in for the sweep: it records the textures it was asked to lay over a garment; it ends at once unless a test holds it.
vi.mock('../../src/game/objects/DyeSweep', () => {
  const log: { key: string; done: () => void; finish: ReturnType<typeof vi.fn> }[] = [];
  const control = { hold: false };
  return {
    log, control,
    startSweep: (_scene: unknown, _layer: unknown, key: string, done: () => void) => {
      const entry = { key, done, finish: vi.fn(() => done()) };
      log.push(entry);
      if (!control.hold) done();
      return { finish: entry.finish };
    },
  };
});

import { DressUpEvents, ObjectEvents, RegistryKeys } from '../../src/game/constants';
import clothesJson from '../../src/game/data/clothes.json';
import dyesJson from '../../src/game/data/dyes.json';
import type { ClothingDef, DyeDef, ItemDye } from '../../src/game/domain/types';
import { controllerFactories } from '../../src/game/objects/dressup/controllers';
import type { DressUpContext } from '../../src/game/objects/dressup/DressUpController';
import { DYE_TAB_ID, DyeTabController } from '../../src/game/objects/dressup/DyeTabController';
import * as sweepModule from '../../src/game/objects/DyeSweep';
import type { DyeTagRequest } from '../../src/game/objects/dressup/PurchaseController';
import { emptyProgress } from '../../src/game/domain/progress';
import * as bubbleModule from '../../src/game/objects/kit/SpeechBubble';
import { makeFakeScene } from './helpers/kitScene';

const sweeps = sweepModule as unknown as { log: { key: string; done: () => void; finish: ReturnType<typeof vi.fn> }[]; control: { hold: boolean } };
const said = (bubbleModule as unknown as { made: string[] }).made;
const clothes = clothesJson as unknown as ClothingDef[];
const dyes = dyesJson as unknown as DyeDef[];
const sweater = clothes.find((c) => c.dyeable)!;
const hat = clothes.find((c) => !c.dyeable && c.slot === 'head')!;

type Fn = (...a: unknown[]) => void;
interface Listener { fn: Fn; context: unknown }
class Emitter {
  private readonly map = new Map<string, Listener[]>();
  on(e: string, fn: Fn, context?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, context }]); return this; }
  off(e: string, fn: Fn, context?: unknown) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => !(l.fn === fn && l.context === context))); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of [...(this.map.get(e) ?? [])]) l.fn.apply(l.context, a); }
  count(e?: string) { return e ? (this.map.get(e) ?? []).length : [...this.map.values()].reduce((n, l) => n + l.length, 0); }
}

interface FakeJar { dye: DyeDef; emit(e: string, ...a: unknown[]): void; destroyed: boolean; x: number; y: number }
const pointer = (x: number, y: number, extra: Record<string, unknown> = {}) => ({ id: 1, x, y, wasTouch: false, ...extra });
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

function setup(over: { itemDye?: ItemDye; outfit?: Record<string, string>; itemAt?: ClothingDef | null; dragging?: boolean; ready?: boolean; noImage?: boolean; favoriteDye?: string } = {}) {
  const scene = makeFakeScene() as ReturnType<typeof makeFakeScene> & Record<string, unknown>;
  const calls: string[] = [];
  const events = new Emitter();
  const regEvents = new Emitter();
  const store = new Map<string, unknown>([[RegistryKeys.ItemDye, over.itemDye ?? {}], [RegistryKeys.Outfit, over.outfit ?? {}], [RegistryKeys.Progress, emptyProgress(0)], ['reducedMotion', false]]);
  scene.events = events;
  scene.registry = {
    events: regEvents,
    get: (k: string) => store.get(k),
    set: (k: string, v: unknown) => { const prev = store.get(k); store.set(k, v); regEvents.emit(`changedata-${k}`, scene.registry, v, prev); },
  } as never;
  (scene.time as unknown as { now: number }).now = 1000;
  (scene.time as unknown as { delayedCall: unknown }).delayedCall = () => ({ remove() {} });
  const sounds: string[] = [];
  const ensure = vi.fn((itemId: string, dyeId: string) => Promise.resolve(`${itemId}~${dyeId}`));
  const dyeService = {
    keyFor: (itemId: string, dyeId: string) => `${itemId}~${dyeId}`,
    isReady: vi.fn(() => over.ready ?? false),
    ensure, retain: vi.fn(), release: vi.fn(),
  };
  const audio = { play: (k: string) => { sounds.push(k); return true; }, playRandom: () => true };
  scene.plugins = { get: (k: string) => (k === 'DyePlugin' ? dyeService : audio) } as never;
  const add = scene.add as Record<string, (...a: unknown[]) => unknown>;
  add.particles = () => ({ explode: () => calls.push('splash'), setDepth() { return this; }, destroy: () => {} });

  // Seven tabs of 54 px with 10 px between them are 438 px wide, wider than the 404 px panel: the row starts at x 20.
  const tabs = Object.assign(new Emitter(), {
    addTab: vi.fn(), selectedId: 'sweater' as string | null, x: 20, setScale: vi.fn(),
    getTabPositions: () => Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`t${i}`, { x: 20 + 27 + i * 64, y: 85 }])),
  });
  const cellDecorators: ((cell: unknown) => void)[] = [];
  const removeCellDecorator = vi.fn();
  const grid = { setItems: vi.fn(), addCellDecorator: vi.fn((fn: (cell: unknown) => void) => { cellDecorators.push(fn); return removeCellDecorator; }) };
  const rowDecorators: ((row: unknown, item: ClothingDef) => void)[] = [];
  const removeRowDecorator = vi.fn();
  const layersPanel = { addRowDecorator: vi.fn((fn: (row: unknown, item: ClothingDef) => void) => { rowDecorators.push(fn); return removeRowDecorator; }) };
  const catCalls: Record<string, unknown[][]> = {};
  const rec = (name: string) => (...a: unknown[]) => { (catCalls[name] ??= []).push(a); };
  let at: ClothingDef | null = over.itemAt === undefined ? sweater : over.itemAt;
  const cat = {
    itemAt: () => at, highlightItem: rec('highlightItem'), setItemTexture: rec('setItemTexture'), sayNo: rec('sayNo'), lookAt: rec('lookAt'),
    squash: rec('squash'), shake: rec('shake'), lookAtBelly: rec('lookAtBelly'), playFaces: rec('playFaces'), getItemImage: () => (over.noImage ? null : {}),
    getAnchorWorld: () => ({ x: 700, y: 300 }), getDropZoneRect: () => ({ x: 500, y: 100, width: 400, height: 500 }),
  };
  const hud = (add.container as (...a: unknown[]) => unknown)(0, 0, []);
  const ctx = {
    scene, tabs, grid, layersPanel, cat, hud, catalog: { cats: [{ id: 'naranja', prefs: { favoriteDye: over.favoriteDye ?? 'rosa' } }], clothes, combos: [], dyes, economy: { discoveryBonus: 15, prices: { basica: 40, linda: 70, lujo: 110, dye: 50 } } }, getOutfit: () => over.outfit ?? {},
    isDragging: () => over.dragging ?? false, isLeaving: () => false, catId: 'naranja',
  } as unknown as DressUpContext;
  const controller = new DyeTabController();
  controller.attach(ctx);
  const state = () => controller.e2eState() as { open: boolean; jars: Record<string, { x: number; y: number }>; dragging: boolean; target: string | null; last: string | null; applied: Record<string, string> };
  const openTab = () => { tabs.selectedId = DYE_TAB_ID; tabs.emit(ObjectEvents.TabSelect, DYE_TAB_ID); };
  return { cellDecorators, rowDecorators, removeCellDecorator, removeRowDecorator, scene, events, regEvents, store, tabs, grid, cat, catCalls, controller, state, openTab, sounds, calls, dyeService, setAt: (i: ClothingDef | null) => { at = i; } };
}

/** The jars the controller made (they are Containers of the fake Phaser, found through the hud and the scene). */
function jarsOf(controller: DyeTabController): FakeJar[] {
  return (controller as unknown as { jars: FakeJar[] }).jars;
}

function drag(controller: DyeTabController, dyeId: string, to = { x: 700, y: 300 }) {
  const jar = jarsOf(controller).find((j) => j.dye.id === dyeId)!;
  jar.emit(ObjectEvents.JarDragStart, jar, pointer(jar.x, jar.y));
  jar.emit(ObjectEvents.JarDrag, jar, pointer(to.x, to.y));
  return { jar, drop: () => jar.emit(ObjectEvents.JarDragEnd, jar, pointer(to.x, to.y)) };
}

beforeEach(() => {
  said.length = 0;
  sweeps.log.length = 0;
  sweeps.control.hold = false;
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('DyeTabController: the tab (F16.3)', () => {
  it('is the last of the controllers... of this feature: it is registered', () => {
    const list = controllerFactories.map((make) => make());
    expect(list.some((c) => c instanceof DyeTabController)).toBe(true);
  });

  it('adds the 7th tab with its own icon and name', () => {
    const { tabs } = setup();
    expect(tabs.addTab).toHaveBeenCalledWith({ id: DYE_TAB_ID, label: 'Tintes', icon: 'tab-icon-tintes', color: 'naranjo' });
  });

  it('shrinks the row of tabs to fit the panel, around the same middle point', () => {
    const { tabs } = setup();
    const k = tabs.setScale.mock.calls[0][0] as number;
    expect(k).toBeLessThan(1);
    expect(438 * k).toBeLessThanOrEqual(404);
    // The middle of the row stays where it was (20 + 438 / 2).
    expect(tabs.x + (438 * k) / 2).toBeCloseTo(239, 5);
  });

  it('selecting it empties the grid and shows the ten bottles and the water', () => {
    const { openTab, grid, state, controller } = setup();
    expect(state().open).toBe(false);
    openTab();
    expect(grid.setItems).toHaveBeenCalledWith([]);
    expect(state().open).toBe(true);
    expect(Object.keys(state().jars).sort()).toEqual([...dyes.map((d) => d.id), 'agua'].sort());
    expect(jarsOf(controller)).toHaveLength(11);
  });

  it('selecting a wardrobe category puts the bottles away', () => {
    const { openTab, tabs, state } = setup();
    openTab();
    tabs.selectedId = 'sweater';
    tabs.emit(ObjectEvents.TabSelect, 'sweater');
    expect(state().open).toBe(false);
  });

  it('a silent selection of a category (no event) also puts them away', () => {
    const { openTab, tabs, state, scene, events } = setup();
    openTab();
    tabs.selectedId = 'head';
    events.emit('update', 0, 16);
    expect(state().open).toBe(false);
    expect(scene).toBeDefined();
  });

  it('opening twice does not stack bottles', () => {
    const { openTab, controller } = setup();
    openTab();
    openTab();
    expect(jarsOf(controller)).toHaveLength(11);
  });
});

describe('DyeTabController: dragging a bottle (F16.3)', () => {
  it('lights the halo of the dyeable item under the bottle, and puts it out when it leaves', () => {
    const { openTab, controller, catCalls, setAt, scene } = setup();
    openTab();
    drag(controller, 'rosa');
    expect(catCalls.highlightItem.at(-1)).toEqual([sweater.id]);
    setAt(null);
    const jar = jarsOf(controller)[0];
    jar.emit(ObjectEvents.JarDrag, jar, pointer(10, 10));
    expect(catCalls.highlightItem.at(-1)).toEqual([null]);
    expect(scene).toBeDefined();
  });

  it('an item that does not take a dye gets no halo', () => {
    const { openTab, controller, catCalls } = setup({ itemAt: hat });
    openTab();
    drag(controller, 'rosa');
    expect((catCalls.highlightItem ?? []).every((args) => args[0] === null)).toBe(true);
  });

  it('uncorks with a sound and asks for the dyed texture early, so the drop does not wait', () => {
    const { openTab, controller, sounds, dyeService } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'lila');
    expect(sounds).toContain('sfx-uncork');
    expect(dyeService.ensure).toHaveBeenCalledWith(sweater.id, 'lila');
  });

  it('knows it is dragging, and the bottle looks empty-handed after the drop', () => {
    const { openTab, controller, state } = setup();
    openTab();
    const { drop } = drag(controller, 'rosa');
    expect(state().dragging).toBe(true);
    drop();
    expect(state().dragging).toBe(false);
  });

  it('ignores a bottle while the player holds a garment', () => {
    const { openTab, controller, state } = setup({ dragging: true });
    openTab();
    drag(controller, 'rosa');
    expect(state().dragging).toBe(false);
  });

  it('a second finger does not drive the drag', () => {
    const { openTab, controller, catCalls } = setup();
    openTab();
    const { jar } = drag(controller, 'rosa');
    catCalls.highlightItem.length = 0;
    jar.emit(ObjectEvents.JarDrag, jar, pointer(5, 5, { id: 2 }));
    expect(catCalls.highlightItem ?? []).toHaveLength(0);
  });
});

describe('DyeTabController: letting go (F16.3)', () => {
  it('on a dyeable worn item it saves the dye, shows the dyed texture and tells the scene', async () => {
    const { openTab, controller, store, catCalls, events, sounds, calls, dyeService } = setup({ outfit: { sweater: sweater.id } });
    const heard = vi.fn();
    events.on(DressUpEvents.ItemDyed, heard);
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(store.get(RegistryKeys.ItemDye)).toEqual({ [sweater.id]: 'rosa' });
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, `${sweater.id}~rosa`]);
    expect(dyeService.retain).toHaveBeenCalledWith(`${sweater.id}~rosa`);
    expect(heard).toHaveBeenCalledWith(sweater, 'rosa');
    expect(sounds).toContain('sfx-blup');
    expect(calls).toContain('splash');
    expect(catCalls.squash).toBeDefined();
  });

  it('the dye of another bottle replaces the first and the old texture is released', async () => {
    const { openTab, controller, store, dyeService } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    drag(controller, 'lila').drop();
    await flush();
    expect(store.get(RegistryKeys.ItemDye)).toEqual({ [sweater.id]: 'lila' });
    expect(dyeService.release).toHaveBeenCalledWith(`${sweater.id}~rosa`);
  });

  it('water brings the original color back', async () => {
    const { openTab, controller, store, catCalls, dyeService } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'rosa' } });
    openTab();
    await flush();
    drag(controller, 'agua').drop();
    await flush();
    expect(store.get(RegistryKeys.ItemDye)).toEqual({});
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, null]);
    expect(dyeService.release).toHaveBeenCalled();
  });

  it('on an item that does not take a dye the bottle bounces and the cat says so', async () => {
    const { openTab, controller, store, events } = setup({ itemAt: hat });
    const heard = vi.fn();
    events.on(DressUpEvents.ItemDyed, heard);
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(said).toContain('Ese no se tiñe');
    expect(store.get(RegistryKeys.ItemDye)).toEqual({});
    expect(heard).not.toHaveBeenCalled();
  });

  it('on the cat without a garment there: "¡A mí no!" and the cat shakes', async () => {
    const { openTab, controller, catCalls, store } = setup({ itemAt: null });
    openTab();
    drag(controller, 'rosa', { x: 700, y: 300 }).drop();
    await flush();
    expect(said).toContain('¡A mí no!');
    expect(catCalls.sayNo).toBeDefined();
    expect(store.get(RegistryKeys.ItemDye)).toEqual({});
  });

  it('away from the cat the bottle just goes back, in silence', async () => {
    const { openTab, controller, store, sounds } = setup({ itemAt: null });
    openTab();
    drag(controller, 'rosa', { x: 120, y: 650 }).drop();
    await flush();
    expect(said).toEqual([]);
    expect(store.get(RegistryKeys.ItemDye)).toEqual({});
    expect(sounds).toContain('sfx-return');
  });

  it('the last drop is told to the test hook', async () => {
    const { openTab, controller, state } = setup({ itemAt: hat });
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(state().last).toBe('notDyeable');
  });

  it('a failed rasterization sends the bottle back and keeps the old color', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { openTab, controller, store, dyeService } = setup({ outfit: { sweater: sweater.id } });
    dyeService.ensure.mockImplementation(() => Promise.reject(new Error('nope')));
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(store.get(RegistryKeys.ItemDye)).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('DyeTabController: the saved dyes (F16.3)', () => {
  it('a dye that came with the session is shown on the cat when it arrives', async () => {
    const { catCalls } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'lila' } });
    await flush();
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, `${sweater.id}~lila`]);
  });

  it('a texture that is already made is shown at once, with no wait', () => {
    const { catCalls } = setup({ itemDye: { [sweater.id]: 'lila' }, ready: true });
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, `${sweater.id}~lila`]);
  });

  it('a dye set from the outside (the test hook) reaches the cat too', async () => {
    const { store, catCalls, scene } = setup({ outfit: { sweater: sweater.id } });
    (scene.registry as unknown as { set(k: string, v: unknown): void }).set(RegistryKeys.ItemDye, { [sweater.id]: 'hoja' });
    await flush();
    expect(store.get(RegistryKeys.ItemDye)).toEqual({ [sweater.id]: 'hoja' });
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, `${sweater.id}~hoja`]);
  });

  it('reports the dyes on the cat', async () => {
    const { state } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'lila' } });
    await flush();
    expect(state().applied).toEqual({ [sweater.id]: 'lila' });
  });
});

describe('DyeTabController: cleanup (F16.3)', () => {
  it('leaves no listener behind and lets go of the textures it held', async () => {
    const { controller, events, regEvents, tabs, dyeService } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'lila' } });
    await flush();
    expect(events.count()).toBeGreaterThan(0);
    controller.destroy();
    expect(events.count()).toBe(0);
    expect(regEvents.count()).toBe(0);
    expect(tabs.count()).toBe(0);
    expect(dyeService.release).toHaveBeenCalledWith(`${sweater.id}~lila`);
  });

  it('destroys the bottle in the hand and the panel', () => {
    const { openTab, controller } = setup();
    openTab();
    const jars = jarsOf(controller);
    drag(controller, 'rosa');
    controller.destroy();
    expect(jars.every((j) => j.destroyed)).toBe(true);
    expect(() => controller.destroy()).not.toThrow();
  });

  it('is settled when no bottle flies', () => {
    const { controller } = setup();
    expect(controller.isSettled()).toBe(true);
  });
});

describe('DyeTabController: the sweep (F16.4)', () => {
  it('lays the new color over the item and swaps the real texture only when the sweep ends', async () => {
    sweeps.control.hold = true;
    const { openTab, controller, store, catCalls } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(sweeps.log.map((s) => s.key)).toEqual([`${sweater.id}~rosa`]);
    // The color is already saved (a reload mid-sweep keeps it), but the cat still shows the old texture.
    expect(store.get(RegistryKeys.ItemDye)).toEqual({ [sweater.id]: 'rosa' });
    expect(catCalls.setItemTexture).toBeUndefined();
    sweeps.log[0].done();
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, `${sweater.id}~rosa`]);
  });

  it('water sweeps back to the original texture of the item', async () => {
    sweeps.control.hold = true;
    const { openTab, controller, catCalls } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'rosa' }, ready: true });
    await flush();
    sweeps.log.length = 0;
    openTab();
    drag(controller, 'agua').drop();
    await flush();
    expect(sweeps.log.map((s) => s.key)).toEqual([sweater.texture]);
    sweeps.log[0].done();
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, null]);
  });

  it('an item that is not on the cat (nothing to sweep) changes at once', async () => {
    const { openTab, controller, catCalls } = setup({ outfit: { sweater: sweater.id }, noImage: true });
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(sweeps.log).toHaveLength(0);
    expect(catCalls.setItemTexture.at(-1)).toEqual([sweater.id, `${sweater.id}~rosa`]);
  });

  it('a second dye on the same item ends the sweep that was running', async () => {
    sweeps.control.hold = true;
    const { openTab, controller } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    drag(controller, 'lila').drop();
    await flush();
    expect(sweeps.log[0].finish).toHaveBeenCalled();
    expect(sweeps.log).toHaveLength(2);
  });

  it('leaving ends the running sweeps', async () => {
    sweeps.control.hold = true;
    const { openTab, controller } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    controller.destroy();
    expect(sweeps.log[0].finish).toHaveBeenCalled();
  });

  it('is not settled while a sweep runs', async () => {
    sweeps.control.hold = true;
    const { openTab, controller } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(controller.isSettled()).toBe(false);
    expect((controller.e2eState() as { sweeping: string[] }).sweeping).toEqual([sweater.id]);
    sweeps.log[0].done();
    expect((controller.e2eState() as { sweeping: string[] }).sweeping).toEqual([]);
  });

  it('a dye that came with the session appears without a sweep', async () => {
    setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'lila' } });
    await flush();
    expect(sweeps.log).toHaveLength(0);
  });
});

describe('DyeTabController: the cat looks at its belly (F16.4)', () => {
  it('surprise first, then happy, and a look at the belly', async () => {
    const { openTab, controller, catCalls } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'lila').drop();
    await flush();
    expect(catCalls.playFaces.at(-1)?.[0]).toMatchObject({ lead: 'sorpresa', expression: 'feliz' });
    expect(catCalls.lookAtBelly).toBeDefined();
  });

  it('a refused drop does not make the cat happy', async () => {
    const { openTab, controller, catCalls } = setup({ itemAt: hat });
    openTab();
    drag(controller, 'lila').drop();
    await flush();
    expect(catCalls.playFaces).toBeUndefined();
  });
});

describe('DyeTabController: my favorite color (F16.4)', () => {
  const progressOf = (store: Map<string, unknown>) => store.get(RegistryKeys.Progress) as ReturnType<typeof emptyProgress>;

  it('the favorite color pays the discovery once, with buttons flying into the purse', async () => {
    const { openTab, controller, store, events } = setup({ outfit: { sweater: sweater.id }, favoriteDye: 'rosa' });
    const flights = vi.fn();
    events.on(DressUpEvents.WalletFlight, flights);
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(progressOf(store).tastesFound.naranja).toEqual(['color']);
    expect(progressOf(store).wallet).toBe(15);
    expect(flights).toHaveBeenCalledWith(expect.objectContaining({ direction: 'in', coins: 15 }));
    // The same color again pays nothing more.
    drag(controller, 'lila').drop();
    await flush();
    drag(controller, 'rosa').drop();
    await flush();
    expect(progressOf(store).wallet).toBe(15);
    expect(flights).toHaveBeenCalledTimes(1);
  });

  it('another color is not a discovery', async () => {
    const { openTab, controller, store } = setup({ outfit: { sweater: sweater.id }, favoriteDye: 'rosa' });
    openTab();
    drag(controller, 'lila').drop();
    await flush();
    expect(progressOf(store).wallet).toBe(0);
    expect(progressOf(store).tastesFound).toEqual({});
  });

  it('water is never a favorite color', async () => {
    const { openTab, controller, store } = setup({ outfit: { sweater: sweater.id }, favoriteDye: 'agua' });
    openTab();
    drag(controller, 'agua').drop();
    await flush();
    expect(progressOf(store).wallet).toBe(0);
  });
});

describe('DyeTabController: the dot of color (F16.4)', () => {
  const fakeCell = (item: ClothingDef) => {
    const hung: { hex: string | null }[] = [];
    return { item, hung, addDecoration: <T,>(o: T) => { hung.push(o as never); return o; } };
  };

  it('hangs a dot on every wardrobe cell and on every layer row', () => {
    const { cellDecorators, rowDecorators } = setup();
    expect(cellDecorators).toHaveLength(1);
    expect(rowDecorators).toHaveLength(1);
    const cell = fakeCell(sweater);
    cellDecorators[0](cell);
    expect(cell.hung).toHaveLength(1);
  });

  it('the dot shows the color of the dye on the item, and goes away with water', async () => {
    const { cellDecorators, openTab, controller } = setup({ outfit: { sweater: sweater.id } });
    const cell = fakeCell(sweater);
    cellDecorators[0](cell);
    expect(cell.hung[0].hex).toBeNull();
    openTab();
    drag(controller, 'rosa').drop();
    await flush();
    expect(cell.hung[0].hex).toBe(dyes.find((d) => d.id === 'rosa')!.hex);
    drag(controller, 'agua').drop();
    await flush();
    expect(cell.hung[0].hex).toBeNull();
  });

  it('a dye that came with the session is already on the dot of a new cell', () => {
    const { cellDecorators } = setup({ itemDye: { [sweater.id]: 'lila' } });
    const cell = fakeCell(sweater);
    cellDecorators[0](cell);
    expect(cell.hung[0].hex).toBe(dyes.find((d) => d.id === 'lila')!.hex);
  });

  it('an item that does not take a dye gets no dot', () => {
    const { cellDecorators, rowDecorators } = setup();
    const cell = fakeCell(hat);
    cellDecorators[0](cell);
    const row = { added: [] as unknown[], add(o: unknown) { this.added.push(o); } };
    rowDecorators[0](row, hat);
    expect(cell.hung).toHaveLength(0);
    expect(row.added).toHaveLength(0);
  });

  it('the row of the layers panel gets its dot too, with the same color', () => {
    const { rowDecorators } = setup({ itemDye: { [sweater.id]: 'hoja' } });
    const row = { added: [] as { hex: string | null }[], add(o: { hex: string | null }) { this.added.push(o); } };
    rowDecorators[0](row, sweater);
    expect(row.added[0].hex).toBe(dyes.find((d) => d.id === 'hoja')!.hex);
  });

  it('takes the decorators away when it leaves', () => {
    const { controller, removeCellDecorator, removeRowDecorator } = setup();
    controller.destroy();
    expect(removeCellDecorator).toHaveBeenCalled();
    expect(removeRowDecorator).toHaveBeenCalled();
  });
});

describe('DyeTabController: buying bottles (F16.5)', () => {
  type Tagged = FakeJar & { price: number };
  const tagged = (controller: DyeTabController) => jarsOf(controller).filter((j) => (j as Tagged).price > 0).map((j) => j.dye.id).sort();
  const boughtDyes = (ids: string[]) => ({ ...emptyProgress(0), dyesOwned: ids });
  const wornTags = (controller: DyeTabController) => (controller.e2eState() as unknown as { wornTags: Record<string, string> }).wornTags;
  const pressed = (events: Emitter) => {
    const heard: DyeTagRequest[] = [];
    events.on(DressUpEvents.DyeTagPressed, (r) => heard.push(r as DyeTagRequest));
    return heard;
  };

  it('a bottle that is not yours hangs a tag with its price; the starter, the water and the bought ones do not', () => {
    const { openTab, controller, store } = setup();
    store.set(RegistryKeys.Progress, boughtDyes(['sol']));
    openTab();
    expect(tagged(controller)).toEqual(dyes.filter((d) => !d.starter && d.id !== 'sol').map((d) => d.id).sort());
    expect((jarsOf(controller).find((j) => j.dye.id === 'sol') as Tagged).price).toBe(0);
    expect((jarsOf(controller).find((j) => j.dye.id === 'agua') as Tagged).price).toBe(0);
  });

  it('touching a bottle with a tag asks to buy it, from where the tag hangs', () => {
    const { openTab, controller, events } = setup();
    const heard = pressed(events);
    openTab();
    const jar = jarsOf(controller).find((j) => j.dye.id === 'lila')!;
    jar.emit(ObjectEvents.JarClick, jar);
    expect(heard).toHaveLength(1);
    expect(heard[0].dye.id).toBe('lila');
    expect(heard[0].scale).toBeGreaterThan(0);
    expect(heard[0].at.x).toBeGreaterThan(jar.x);
  });

  it('touching a bottle that is yours (or the water) buys nothing', () => {
    const { openTab, controller, events } = setup();
    const heard = pressed(events);
    openTab();
    for (const id of ['rosa', 'agua']) {
      const jar = jarsOf(controller).find((j) => j.dye.id === id)!;
      jar.emit(ObjectEvents.JarClick, jar);
    }
    expect(heard).toHaveLength(0);
  });

  it('paying a bottle takes its tag off and leaves the others', () => {
    const { openTab, controller, store, events } = setup();
    openTab();
    expect(tagged(controller)).toContain('lila');
    store.set(RegistryKeys.Progress, boughtDyes(['lila']));
    events.emit(DressUpEvents.DyesBought, ['lila']);
    expect(tagged(controller)).not.toContain('lila');
    expect(tagged(controller)).toContain('sol');
  });

  it('the tab can open after the purchase: the bought bottle never gets a tag', () => {
    const { openTab, controller, store } = setup();
    store.set(RegistryKeys.Progress, boughtDyes(['lila']));
    openTab();
    expect(tagged(controller)).not.toContain('lila');
  });

  it('a garment dyed with a bottle that is not yours wears a tag with the price', async () => {
    const { openTab, controller } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'lila').drop();
    await flush();
    expect(wornTags(controller)).toEqual({ [sweater.id]: 'lila' });
  });

  it('a bottle that is yours, the starter and the water leave no tag on the garment', async () => {
    const { openTab, controller, store } = setup({ outfit: { sweater: sweater.id } });
    store.set(RegistryKeys.Progress, boughtDyes(['lila']));
    openTab();
    drag(controller, 'lila').drop();
    await flush();
    drag(controller, 'rosa').drop();
    await flush();
    expect(wornTags(controller)).toEqual({});
  });

  it('water takes the tag off', async () => {
    const { openTab, controller } = setup({ outfit: { sweater: sweater.id } });
    openTab();
    drag(controller, 'lila').drop();
    await flush();
    drag(controller, 'agua').drop();
    await flush();
    expect(wornTags(controller)).toEqual({});
  });

  it('taking the garment off the cat takes its tag off', () => {
    const outfit: Record<string, string> = { sweater: sweater.id };
    const { controller, events } = setup({ outfit, itemDye: { [sweater.id]: 'frambuesa' } });
    expect(wornTags(controller)).toEqual({ [sweater.id]: 'frambuesa' });
    delete outfit.sweater;
    events.emit(DressUpEvents.OutfitChanged, outfit, 'remove');
    expect(wornTags(controller)).toEqual({});
  });

  it('a dye that came with the session (not yours) shows its tag on arrival', () => {
    const { controller } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'frambuesa' } });
    expect(wornTags(controller)).toEqual({ [sweater.id]: 'frambuesa' });
  });

  it('touching the tag on the garment asks to buy that bottle, from the tag', () => {
    const { controller, events } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'frambuesa' } });
    const heard = pressed(events);
    const entry = (controller as unknown as { wornTags: Map<string, { tag: { emit(e: string, ...a: unknown[]): void } }> }).wornTags.get(sweater.id)!;
    entry.tag.emit(ObjectEvents.PriceTagPress, entry.tag);
    expect(heard).toHaveLength(1);
    expect(heard[0].dye.id).toBe('frambuesa');
    expect(heard[0].at.x).toBeGreaterThan(0);
  });

  it('paying the bottle at the till (the progress changes) clears the tag of the garment too', () => {
    const { controller, store, events } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'frambuesa' } });
    store.set(RegistryKeys.Progress, boughtDyes(['frambuesa']));
    events.emit(DressUpEvents.DyesBought, ['frambuesa']);
    expect(wornTags(controller)).toEqual({});
  });

  it('destroy takes every listener away', () => {
    const { controller, events, regEvents, openTab } = setup({ outfit: { sweater: sweater.id }, itemDye: { [sweater.id]: 'frambuesa' } });
    openTab();
    controller.destroy();
    expect(events.count()).toBe(0);
    expect(regEvents.count()).toBe(0);
  });
});
