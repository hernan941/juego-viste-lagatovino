import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { DressUpEvents, ObjectEvents, RegistryKeys } from '../../src/game/constants';
import economy from '../../src/game/data/economy.json';
import { emptyProgress } from '../../src/game/domain/progress';
import type { ClothingDef, EconomyRules, Outfit, Progress } from '../../src/game/domain/types';
import type { DressUpContext } from '../../src/game/objects/dressup/DressUpController';
import { controllerFactories } from '../../src/game/objects/dressup/controllers';
import { PriceTagsController } from '../../src/game/objects/dressup/PriceTagsController';
import { WalletController } from '../../src/game/objects/dressup/WalletController';
import { makeFakeScene } from './helpers/kitScene';

type Fn = (...a: unknown[]) => void;
interface Listener { fn: Fn; context: unknown }
class Emitter {
  private readonly map = new Map<string, Listener[]>();
  on(e: string, fn: Fn, context?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, context }]); return this; }
  off(e: string, fn: Fn, context?: unknown) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => !(l.fn === fn && l.context === context))); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of this.map.get(e) ?? []) l.fn.apply(l.context, a); }
  count(e: string) { return (this.map.get(e) ?? []).length; }
}

const item = (id: string, slot: ClothingDef['slot'], extra: Partial<ClothingDef> = {}): ClothingDef => ({
  id, name: id, slot, category: slot === 'sweater' ? 'sweater' : 'head', texture: id, icon: id, tags: [], ...extra,
});
const clothes = [
  item('free', 'sweater', { starter: true }),
  item('cheap', 'head', { tier: 'basica' }),
  item('fancy', 'neck', { tier: 'lujo' }),
  item('gift', 'paws', { secret: true }),
];
const byId = (id: string) => clothes.find((c) => c.id === id)!;

/** A grid cell of the fake: it keeps what is hung on it and its own listeners. */
class FakeCell extends Emitter {
  alpha = 1;
  hung: unknown[] = [];
  constructor(readonly item: ClothingDef) { super(); }
  addDecoration<T>(o: T): T { this.hung.push(o); return o; }
}

function setup(over: { owned?: string[]; outfit?: Outfit } = {}) {
  const scene = makeFakeScene() as ReturnType<typeof makeFakeScene> & Record<string, unknown>;
  (scene.add as Record<string, unknown>).zone = (x: number, y: number, w: number, h: number) => {
    const z = (scene.add as Record<string, (...a: unknown[]) => Record<string, unknown>>).container(x, y, []);
    (z.setSize as (w: number, h: number) => unknown)(w, h);
    return z;
  };
  const events = new Emitter();
  const regEvents = new Emitter();
  let progress: Progress = { ...emptyProgress(100), owned: over.owned ?? [] };
  scene.events = events;
  scene.registry = {
    events: regEvents,
    get: (key: string) => (key === RegistryKeys.Progress ? progress : key === 'reducedMotion' ? false : undefined),
  } as never;
  let outfit: Outfit = over.outfit ?? {};
  const decorators: ((cell: FakeCell) => void)[] = [];
  const grid = Object.assign(new Emitter(), {
    addCellDecorator: vi.fn((fn: (cell: FakeCell) => void) => { decorators.push(fn); return () => decorators.splice(decorators.indexOf(fn), 1); }),
    refreshDecorations: vi.fn(),
  });
  const cat = { getAnchorWorld: () => ({ x: 700, y: 300 }) };
  const hud = (scene.add as Record<string, (...a: unknown[]) => { list: unknown[] }>).container(0, 0, []);
  const ctx = {
    scene, hud, grid, cat, getOutfit: () => outfit,
    catalog: { cats: [], clothes, combos: [], economy: economy as unknown as EconomyRules, dyes: [] },
  } as unknown as DressUpContext;
  const controller = new PriceTagsController();
  controller.attach(ctx);
  const decorate = (id: string) => { const cell = new FakeCell(byId(id)); decorators.forEach((fn) => fn(cell)); return cell; };
  const wear = (next: Outfit) => { outfit = next; events.emit(DressUpEvents.OutfitChanged, next, 'drop'); };
  const own = (...ids: string[]) => {
    const prev = progress;
    progress = { ...progress, owned: [...progress.owned, ...ids] };
    regEvents.emit(`changedata-${RegistryKeys.Progress}`, scene.registry, progress, prev);
  };
  const state = () => (controller.e2eState() as { tags: { cells: string[]; worn: string[] } }).tags;
  return { scene, events, regEvents, grid, hud, controller, decorate, wear, own, state, decorators };
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('PriceTagsController: the cells (F13.4)', () => {
  it('is registered after the wallet', () => {
    const list = controllerFactories.map((make) => make());
    const wallet = list.findIndex((c) => c instanceof WalletController);
    const tags = list.findIndex((c) => c instanceof PriceTagsController);
    expect(wallet).toBeGreaterThanOrEqual(0);
    expect(tags).toBeGreaterThan(wallet);
  });

  it('hangs a tag with the price on the cell of an item that is not bought, and the cell stays in full color', () => {
    const { decorate, scene } = setup();
    const cell = decorate('cheap');
    expect(cell.hung).toHaveLength(1);
    expect(scene.made.texts.some((t) => t.text === '40')).toBe(true);
    expect(cell.alpha).toBe(1);
  });

  it('the price follows the tier', () => {
    const { decorate, scene } = setup();
    decorate('fancy');
    expect(scene.made.texts.some((t) => t.text === '110')).toBe(true);
  });

  it('no tag for a starter, a prize or what is already bought', () => {
    const { decorate } = setup({ owned: ['cheap'] });
    expect(decorate('free').hung).toHaveLength(0);
    expect(decorate('gift').hung).toHaveLength(0);
    expect(decorate('cheap').hung).toHaveLength(0);
  });

  it('every new cell is decorated again (a tab change or a scroll builds new cells)', () => {
    const { decorate } = setup();
    expect(decorate('cheap').hung).toHaveLength(1);
    expect(decorate('cheap').hung).toHaveLength(1);
  });

  it('the tag of a cell grows with the hover of the cell (mouse only)', () => {
    const { decorate, scene } = setup();
    const cell = decorate('cheap');
    const before = scene.tweens.records.length;
    cell.emit('pointerover', { wasTouch: false });
    expect(scene.tweens.records.length).toBeGreaterThan(before);
  });

  it('tapping a cell with a tag says the tag was pressed and pokes the tag', () => {
    const { decorate, grid, events } = setup();
    const heard = vi.fn();
    events.on(DressUpEvents.PriceTagPressed, heard);
    const cell = decorate('cheap');
    grid.emit(ObjectEvents.ItemClick, cell);
    expect(heard).toHaveBeenCalledWith(byId('cheap'));
    const tag = cell.hung[0] as { swingAngle: number };
    expect(tag.swingAngle).toBe(18);
  });

  it('tapping a bought item says nothing', () => {
    const { decorate, grid, events } = setup({ owned: ['cheap'] });
    const heard = vi.fn();
    events.on(DressUpEvents.PriceTagPressed, heard);
    grid.emit(ObjectEvents.ItemClick, decorate('cheap'));
    expect(heard).not.toHaveBeenCalled();
  });

  it('after a purchase the cells are decorated again, without the tag', () => {
    const { own, grid } = setup();
    own('cheap');
    expect(grid.refreshDecorations).toHaveBeenCalled();
  });
});

describe('PriceTagsController: the worn items (F13.4)', () => {
  it('a worn item that is not bought hangs its tag on the cat and keeps it while it is worn', () => {
    const { wear, state, hud } = setup();
    wear({ head: 'cheap' });
    expect(state().worn).toEqual(['cheap']);
    expect(hud.list.length).toBeGreaterThan(0);
    wear({ head: 'cheap', neck: 'fancy' });
    expect(state().worn.sort()).toEqual(['cheap', 'fancy']);
  });

  it('wearing what is free or bought hangs nothing', () => {
    const { wear, state } = setup({ owned: ['cheap'] });
    wear({ sweater: 'free', head: 'cheap', paws: 'gift' });
    expect(state().worn).toEqual([]);
  });

  it('taking the item off takes its tag away; replacing it by a bought one too', () => {
    const { wear, state } = setup();
    wear({ head: 'cheap', neck: 'fancy' });
    wear({ neck: 'fancy' });
    expect(state().worn).toEqual(['fancy']);
    wear({});
    expect(state().worn).toEqual([]);
  });

  it('a look that came along already hangs its tags', () => {
    const { state } = setup({ outfit: { head: 'cheap' } });
    expect(state().worn).toEqual(['cheap']);
  });

  it('pressing the tag on the cat says it (the player wants to buy it)', () => {
    const { wear, events, hud } = setup();
    const heard = vi.fn();
    events.on(DressUpEvents.PriceTagPressed, heard);
    wear({ head: 'cheap' });
    const tag = hud.list.at(-1) as { emit(e: string, ...a: unknown[]): void };
    tag.emit(ObjectEvents.PriceTagPress, tag);
    expect(heard).toHaveBeenCalledWith(byId('cheap'));
  });

  it('after buying it the tag on the cat goes away', () => {
    const { wear, own, state } = setup();
    wear({ head: 'cheap' });
    own('cheap');
    expect(state().worn).toEqual([]);
  });

  it('shows the item ids of the tags of the cells in the test state', () => {
    const { decorate, state } = setup();
    decorate('cheap');
    decorate('fancy');
    expect(state().cells.sort()).toEqual(['cheap', 'fancy']);
  });
});

describe('PriceTagsController: cleaning up (F13.4)', () => {
  it('destroy removes the listeners, the decorator, the tags and every tween', () => {
    const { controller, events, regEvents, grid, wear, decorate, scene, decorators } = setup();
    decorate('cheap');
    wear({ head: 'cheap' });
    controller.destroy();
    expect(events.count(DressUpEvents.OutfitChanged)).toBe(0);
    expect(regEvents.count(`changedata-${RegistryKeys.Progress}`)).toBe(0);
    expect(grid.count(ObjectEvents.ItemClick)).toBe(0);
    expect(decorators).toHaveLength(0);
    expect(scene.activeTweens()).toHaveLength(0);
  });
});
