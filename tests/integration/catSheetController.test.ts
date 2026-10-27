import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

const made = vi.hoisted(() => ({ sheets: [] as { opts: { catName: string; entries: { key: string; found: boolean }[]; hint: string }; closed: boolean; destroyed: boolean; emit(e: string): void }[] }));
vi.mock('../../src/game/objects/CatSheet', () => ({
  CatSheet: class {
    handlers: Record<string, () => void> = {};
    closed = false;
    destroyed = false;
    constructor(_scene: unknown, public opts: never) { made.sheets.push(this as never); }
    on(e: string, fn: () => void) { this.handlers[e] = fn; return this; }
    emit(e: string) { this.handlers[e]?.(); }
    close(done?: () => void) { this.closed = true; done?.(); }
    get isClosing() { return this.closed; }
    destroy() { this.destroyed = true; }
  },
}));

import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import { DressUpEvents, ObjectEvents, RegistryKeys, SfxKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import { tasteKeys } from '../../src/game/domain/tastes';
import type { CatDef, ClothingDef, Progress } from '../../src/game/domain/types';
import { CatSheetController } from '../../src/game/objects/dressup/CatSheetController';
import { controllerFactories } from '../../src/game/objects/dressup/controllers';

const cat = (cats as unknown as CatDef[]).find((c) => c.id === 'naranja')!;

class Emitter {
  private map = new Map<string, { fn: (...a: unknown[]) => void; ctx?: unknown }[]>();
  on(e: string, fn: (...a: unknown[]) => void, ctx?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, ctx }]); return this; }
  off(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => l.fn !== fn)); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of [...(this.map.get(e) ?? [])]) l.fn.call(l.ctx, ...a); }
  count() { return [...this.map.values()].reduce((n, l) => n + l.length, 0); }
}

function setup({ found = [] as string[], dragging = false, leaving = false } = {}) {
  made.sheets.length = 0;
  const sounds: string[] = [];
  const sign = new Emitter() as Emitter & { makeInteractive: () => void; x: number; y: number; interactive: boolean };
  sign.interactive = false;
  sign.makeInteractive = () => { sign.interactive = true; };
  sign.x = 700;
  sign.y = 92;
  const progress: Progress = { ...emptyProgress(100), tastesFound: { naranja: found } };
  const scene = {
    events: new Emitter(),
    registry: { get: (k: string) => (k === RegistryKeys.Progress ? progress : false) },
    plugins: { get: () => ({ play: (k: string) => sounds.push(k) }) },
  };
  const ctx = {
    scene, sign, catId: 'naranja', catName: 'Naranjito', isDragging: () => dragging, isLeaving: () => leaving,
    catalog: { cats: [cat], clothes: clothes as unknown as ClothingDef[], combos: [], dyes: [] },
  } as never;
  const controller = new CatSheetController();
  controller.attach(ctx);
  const press = () => sign.emit(ObjectEvents.SignPress, sign);
  const sheet = () => made.sheets[made.sheets.length - 1];
  return { controller, sign, press, sheet, sounds, scene };
}

describe('CatSheetController (F14.4)', () => {
  it('is in the controllers list', () => {
    expect(controllerFactories.some((make) => make() instanceof CatSheetController)).toBe(true);
  });

  it('makes the name sign touchable', () => {
    expect(setup().sign.interactive).toBe(true);
  });

  it('touching the sign opens the sheet with the five tastes, the found ones marked, and the hint', () => {
    const keys = tasteKeys(cat);
    const t = setup({ found: [keys[1], 'favorite'] });
    t.press();
    expect(made.sheets).toHaveLength(1);
    const { opts } = t.sheet();
    expect(opts.catName).toBe('Naranjito');
    expect(opts.entries.map((e) => e.key)).toEqual(keys);
    expect(opts.entries.filter((e) => e.found).map((e) => e.key).sort()).toEqual([keys[1], 'favorite'].sort());
    expect(opts.hint).toBe(cat.prefs!.hint);
    expect(t.sounds).toContain(SfxKeys.Paper);
  });

  it('the sheet is built from the progress as it is now', () => {
    const t = setup();
    t.press();
    expect(t.sheet().opts.entries.every((e) => !e.found)).toBe(true);
  });

  it('does not open while a garment is dragged or the player is leaving', () => {
    setup({ dragging: true }).press();
    expect(made.sheets).toHaveLength(0);
    setup({ leaving: true }).press();
    expect(made.sheets).toHaveLength(0);
  });

  it('a second touch while it is open does not stack another one', () => {
    const t = setup();
    t.press();
    t.press();
    expect(made.sheets).toHaveLength(1);
  });

  it('a tap outside closes it, and it can be opened again afterwards', () => {
    const t = setup();
    t.press();
    t.sheet().emit(ObjectEvents.SheetCancel);
    expect(t.sheet().closed).toBe(true);
    expect(t.controller.e2eState().open).toBe(false);
    t.press();
    expect(made.sheets).toHaveLength(2);
  });

  it('reports to the e2e hook: open, the entries, the hint and where the sign is', () => {
    const t = setup({ found: ['favorite'] });
    expect(t.controller.e2eState()).toMatchObject({ open: false, entries: [], sign: { x: 700, y: 103 } });
    t.press();
    const state = t.controller.e2eState();
    expect(state.open).toBe(true);
    expect(state.entries).toHaveLength(5);
    expect(state.found).toBe(1);
    expect(state.hint).toBe(cat.prefs!.hint);
  });

  it('is not settled while it is closing', () => {
    const t = setup();
    expect(t.controller.isSettled()).toBe(true);
    t.press();
    expect(t.controller.isSettled()).toBe(false);
    t.sheet().emit(ObjectEvents.SheetCancel);
    expect(t.controller.isSettled()).toBe(true);
  });

  it('destroy removes its listeners and the sheet', () => {
    const t = setup();
    t.press();
    t.controller.destroy();
    expect(t.sheet().destroyed).toBe(true);
    expect(t.sign.count()).toBe(0);
    expect(t.scene.events.count()).toBe(0);
    expect(DressUpEvents.OutfitChanged).toBeDefined();
  });
});
