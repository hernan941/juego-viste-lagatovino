import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

// Stand-ins for the objects: the controller is the logic; the objects have their own tests.
const made = vi.hoisted(() => ({ sheets: [] as unknown[], cuts: [] as unknown[], said: [] as string[] }));
vi.mock('../../src/game/objects/PurchaseSheet', () => ({
  PurchaseSheet: class {
    handlers: Record<string, () => void> = {};
    closed = false;
    destroyed = false;
    constructor(_scene: unknown, public item: { id: string; name: string; icon: string }, public price: number) { made.sheets.push(this); }
    on(e: string, fn: () => void) { this.handlers[e] = fn; return this; }
    emit(e: string) { this.handlers[e]?.(); }
    close(done?: () => void) { this.closed = true; done?.(); }
    getButtonPoints() { return { take: { x: 1, y: 2 }, notYet: { x: 3, y: 4 } }; }
    get isClosing() { return this.closed; }
    destroy() { this.destroyed = true; }
  },
}));
vi.mock('../../src/game/objects/TagCut', () => ({
  TagCut: class {
    active = true;
    cancelled = false;
    constructor(_scene: unknown, public options: Record<string, unknown>) { made.cuts.push(this); }
    cancel() { this.cancelled = true; this.active = false; }
    finish() { this.active = false; (this.options.onDone as () => void)(); }
  },
}));
vi.mock('../../src/game/objects/kit/SpeechBubble', () => ({
  SpeechBubble: class {
    constructor(_s: unknown, _x: number, _y: number, text: string) { made.said.push(text); }
    setDepth() { return this; }
    destroy() {}
  },
}));

import clothes from '../../src/game/data/clothes.json';
import economy from '../../src/game/data/economy.json';
import { DressUpEvents, ObjectEvents, RegistryKeys, SfxKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import dyesJson from '../../src/game/data/dyes.json';
import type { ClothingDef, DyeDef, EconomyRules, Progress } from '../../src/game/domain/types';
import { controllerFactories } from '../../src/game/objects/dressup/controllers';
import { PurchaseController } from '../../src/game/objects/dressup/PurchaseController';

const dyes = dyesJson as unknown as DyeDef[];
const lila = dyes.find((d) => d.id === 'lila')!;
const rosa = dyes.find((d) => d.starter)!;
const rules = economy as unknown as EconomyRules;
const items = clothes as unknown as ClothingDef[];
const priced = items.find((c) => c.tier === 'basica')!;
const fancy = items.find((c) => c.tier === 'lujo')!;
const free = items.find((c) => c.starter)!;

class Emitter {
  private map = new Map<string, { fn: (...a: unknown[]) => void; ctx?: unknown }[]>();
  on(e: string, fn: (...a: unknown[]) => void, ctx?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, ctx }]); return this; }
  off(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => l.fn !== fn)); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of [...(this.map.get(e) ?? [])]) l.fn.call(l.ctx, ...a); }
  count() { return [...this.map.values()].reduce((n, l) => n + l.length, 0); }
}

function setup({ wallet = 100, worn = false, dragging = false, leaving = false }: { wallet?: number; worn?: boolean; dragging?: boolean; leaving?: boolean } = {}) {
  made.sheets.length = 0;
  made.cuts.length = 0;
  made.said.length = 0;
  const events = new Emitter();
  const sounds: string[] = [];
  const calls: string[] = [];
  const emitted: { event: string; args: unknown[] }[] = [];
  let progress: Progress = { ...emptyProgress(100), wallet };
  const writes: Progress[] = [];
  const delayed: { ms: number; fn: () => void; removed: boolean }[] = [];
  const realEmit = events.emit.bind(events);
  events.emit = (e: string, ...a: unknown[]) => { emitted.push({ event: e, args: a }); realEmit(e, ...a); };
  const scene = {
    events,
    registry: {
      get: (k: string) => (k === RegistryKeys.Progress ? progress : false),
      set: (k: string, v: Progress) => { if (k === RegistryKeys.Progress) { progress = v; writes.push(v); } },
    },
    plugins: { get: () => ({ play: (k: string) => sounds.push(k), playRandom: () => true }) },
    time: { delayedCall: (ms: number, fn: () => void) => { const t = { ms, fn, removed: false, remove() { t.removed = true; } }; delayed.push(t); return t; } },
  };
  const cat = {
    playFaces: (p: { expression: string }) => calls.push(`face:${p.expression}`),
    getAnchorWorld: () => ({ x: 600, y: 300 }),
  };
  const cell = { celebrate: () => calls.push('celebrate') };
  const grid = { getCellPositions: () => ({ [priced.id]: { x: 900, y: 200 }, [fancy.id]: { x: 900, y: 300 } }), getCell: () => cell };
  const hearts = { explode: (n: number) => calls.push(`hearts:${n}`) };
  const ctx = {
    scene, catalog: { cats: [], clothes: items, combos: [], dyes, economy: rules }, cat, grid, hearts, sparkles: hearts, hud: { add: () => {} },
    getOutfit: () => (worn ? { [priced.slot]: priced.id } : {}), isDragging: () => dragging, isLeaving: () => leaving,
  } as never;
  const controller = new PurchaseController();
  controller.attach(ctx);
  const press = (item: ClothingDef) => events.emit(DressUpEvents.PriceTagPressed, item);
  const sheet = () => made.sheets[made.sheets.length - 1] as { emit(e: string): void; closed: boolean; destroyed: boolean; item: ClothingDef; price: number };
  const run = () => { for (const t of delayed.filter((d) => !d.removed)) { t.removed = true; t.fn(); } };
  const pressDye = (dye: DyeDef) => events.emit(DressUpEvents.DyeTagPressed, { dye, at: { x: 120, y: 330 }, scale: 0.4 });
  return { controller, events, press, pressDye, sheet, sounds, calls, emitted, writes, run, delayed, progress: () => progress };
}

describe('PurchaseController (F13.5)', () => {
  it('is in the controllers list', () => {
    expect(controllerFactories.some((make) => make() instanceof PurchaseController)).toBe(true);
  });

  it('touching the tag of an unpaid item opens the sheet with its price', () => {
    const t = setup();
    t.press(priced);
    expect(made.sheets).toHaveLength(1);
    expect(t.sheet().price).toBe(40);
    expect(t.controller.e2eState().open).toBe(true);
  });

  it('a tag already paid, a free item, a drag or leaving open nothing', () => {
    const t = setup();
    t.press(free);
    expect(made.sheets).toHaveLength(0);
    expect(setup({ dragging: true }).press(priced)).toBeUndefined();
    expect(made.sheets).toHaveLength(0);
    setup({ leaving: true }).press(priced);
    expect(made.sheets).toHaveLength(0);
  });

  it('a second touch while the sheet is open does not open another', () => {
    const t = setup();
    t.press(priced);
    t.press(fancy);
    expect(made.sheets).toHaveLength(1);
  });

  it('[Todavía no] closes the sheet and changes nothing', () => {
    const t = setup();
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetCancel);
    expect(t.sheet().closed).toBe(true);
    expect(t.writes).toHaveLength(0);
    expect(t.controller.e2eState().open).toBe(false);
  });

  it('[Llevar] pays at once: wallet down, item in owned, written to the registry (which saves it)', () => {
    const t = setup({ wallet: 100 });
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    expect(t.writes).toHaveLength(1);
    expect(t.progress().wallet).toBe(60);
    expect(t.progress().owned).toContain(priced.id);
    expect(t.sheet().closed).toBe(true);
  });

  it('the buttons leave the purse for the garment BEFORE the progress is written (so the number is held)', () => {
    const t = setup({ worn: true });
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    const flight = t.emitted.find((e) => e.event === DressUpEvents.WalletFlight);
    expect(flight?.args[0]).toMatchObject({ direction: 'out', coins: 40, at: { x: 600, y: 300 } });
  });

  it('announces the bought item (a combo that waited for it can give its box)', () => {
    const t = setup({ wallet: 100 });
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    const bought = t.emitted.filter((e) => e.event === DressUpEvents.ItemsBought);
    expect(bought).toHaveLength(1);
    expect(bought[0].args[0]).toEqual([priced.id]);
    const short = setup({ wallet: 0 });
    short.press(priced);
    short.sheet().emit(ObjectEvents.SheetConfirm);
    expect(short.emitted.some((e) => e.event === DressUpEvents.ItemsBought)).toBe(false);
  });

  it('the scissors cut the tag where it hangs: on the cat when it is worn, in its cell otherwise', () => {
    const worn = setup({ worn: true });
    worn.press(priced);
    worn.sheet().emit(ObjectEvents.SheetConfirm);
    const wornCut = made.cuts[0] as { options: { x: number; y: number; price: number } };
    expect(wornCut.options.price).toBe(40);
    expect(wornCut.options.x).toBeGreaterThan(600);

    const cell = setup({ worn: false });
    cell.press(priced);
    cell.sheet().emit(ObjectEvents.SheetConfirm);
    const cellCut = made.cuts[0] as { options: { x: number; y: number } };
    expect(cellCut.options.x).toBeGreaterThan(900);
    expect(cellCut.options.y).toBeLessThan(200);
  });

  it('after the cut: register sound, amor face, "Me lo quedo!", hearts and the cell celebrates', () => {
    const t = setup();
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    t.run();
    expect(t.sounds).toContain(SfxKeys.Register);
    expect(t.calls).toContain('face:amor');
    expect(t.calls.some((c) => c.startsWith('hearts:'))).toBe(true);
    expect(t.calls).toContain('celebrate');
    expect(made.said).toContain('Me lo quedo!');
    expect(t.controller.e2eState().bought).toEqual([priced.id]);
  });

  it('not enough: the purse shakes, the seller says what is missing and nothing changes', () => {
    const t = setup({ wallet: 30 });
    t.press(fancy);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    expect(t.writes).toHaveLength(0);
    expect(t.emitted.some((e) => e.event === DressUpEvents.WalletShake)).toBe(true);
    expect(t.emitted.some((e) => e.event === DressUpEvents.WalletFlight)).toBe(false);
    expect(made.said.some((s) => s.includes('80'))).toBe(true);
    expect(made.cuts).toHaveLength(0);
  });

  it('a double tap on [Llevar] charges once', () => {
    const t = setup({ wallet: 200 });
    t.press(priced);
    const sheet = t.sheet();
    sheet.emit(ObjectEvents.SheetConfirm);
    sheet.emit(ObjectEvents.SheetConfirm);
    expect(t.writes).toHaveLength(1);
    expect(t.progress().wallet).toBe(160);
    expect(made.cuts).toHaveLength(1);
  });

  it('while it plays it is not settled; once the cut and the timers are done it is', () => {
    const t = setup();
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    expect(t.controller.isSettled()).toBe(false);
    (made.cuts[0] as { finish(): void }).finish();
    t.run();
    expect(t.controller.isSettled()).toBe(true);
  });

  it('a new purchase can start once the first one is over', () => {
    const t = setup({ wallet: 200 });
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    (made.cuts[0] as { finish(): void }).finish();
    t.run();
    t.press(fancy);
    expect(made.sheets).toHaveLength(2);
  });

  it('destroy removes the listeners, the sheet, the cuts and the timers', () => {
    const t = setup();
    t.press(priced);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    t.press(fancy);
    t.controller.destroy();
    expect((made.cuts[0] as { cancelled: boolean }).cancelled).toBe(true);
    expect(t.delayed.every((d) => d.removed)).toBe(true);
    expect(t.events.count()).toBe(0);
  });

  it('destroy with the sheet open destroys the sheet', () => {
    const t = setup();
    t.press(priced);
    t.controller.destroy();
    expect(t.sheet().destroyed).toBe(true);
  });

  describe('bottles of dye (F16.5)', () => {
    it('touching the tag of a bottle opens the same sheet with the bottle and its price', () => {
      const t = setup();
      t.pressDye(lila);
      expect(made.sheets).toHaveLength(1);
      expect(t.sheet().price).toBe(50);
      expect(t.sheet().item).toMatchObject({ id: 'lila', name: 'Tinte Lila', icon: 'ui-dye-lila' });
    });

    it('the starter bottle, one already owned, a drag or leaving open nothing', () => {
      const t = setup();
      t.pressDye(rosa);
      expect(made.sheets).toHaveLength(0);
      setup({ dragging: true }).pressDye(lila);
      setup({ leaving: true }).pressDye(lila);
      expect(made.sheets).toHaveLength(0);
    });

    it('a second touch while a sheet is open (garment or bottle) does not open another', () => {
      const t = setup();
      t.press(priced);
      t.pressDye(lila);
      expect(made.sheets).toHaveLength(1);
    });

    it('[Todavía no] changes nothing', () => {
      const t = setup();
      t.pressDye(lila);
      t.sheet().emit(ObjectEvents.SheetCancel);
      expect(t.writes).toHaveLength(0);
      expect(t.sheet().closed).toBe(true);
    });

    it('[Llevar] pays at once: wallet down, bottle owned, buttons fly from the purse to the tag', () => {
      const t = setup({ wallet: 100 });
      t.pressDye(lila);
      t.sheet().emit(ObjectEvents.SheetConfirm);
      expect(t.progress().wallet).toBe(50);
      expect(t.progress().dyesOwned).toEqual(['lila']);
      expect(t.progress().owned).toEqual([]);
      const flight = t.emitted.find((e) => e.event === DressUpEvents.WalletFlight);
      expect(flight?.args[0]).toMatchObject({ direction: 'out', coins: 50, at: { x: 120, y: 330 } });
    });

    it('announces the bottle (DyesBought) and not as a garment', () => {
      const t = setup({ wallet: 100 });
      t.pressDye(lila);
      t.sheet().emit(ObjectEvents.SheetConfirm);
      expect(t.emitted.filter((e) => e.event === DressUpEvents.DyesBought).map((e) => e.args[0])).toEqual([['lila']]);
      expect(t.emitted.some((e) => e.event === DressUpEvents.ItemsBought)).toBe(false);
      expect(t.controller.e2eState().boughtDyes).toEqual(['lila']);
    });

    it('the scissors cut the tag where it hangs, with its scale', () => {
      const t = setup();
      t.pressDye(lila);
      t.sheet().emit(ObjectEvents.SheetConfirm);
      expect((made.cuts[0] as { options: Record<string, unknown> }).options).toMatchObject({ x: 120, y: 330, scale: 0.4, price: 50 });
    });

    it('after the cut: register, amor face, "Me lo quedo!" and sparkles at the tag', () => {
      const t = setup();
      t.pressDye(lila);
      t.sheet().emit(ObjectEvents.SheetConfirm);
      t.run();
      expect(t.sounds).toContain(SfxKeys.Register);
      expect(t.calls).toContain('face:amor');
      expect(made.said).toContain('Me lo quedo!');
      expect(t.calls).not.toContain('celebrate');
    });

    it('not enough: the purse shakes, the seller says what is missing and nothing changes', () => {
      const t = setup({ wallet: 20 });
      t.pressDye(lila);
      t.sheet().emit(ObjectEvents.SheetConfirm);
      expect(t.writes).toHaveLength(0);
      expect(t.emitted.some((e) => e.event === DressUpEvents.WalletShake)).toBe(true);
      expect(made.said.some((s) => s.includes('30'))).toBe(true);
    });

    it('a double tap on [Llevar] charges once; destroy removes the DyeTagPressed listener', () => {
      const t = setup({ wallet: 200 });
      t.pressDye(lila);
      const sheet = t.sheet();
      sheet.emit(ObjectEvents.SheetConfirm);
      sheet.emit(ObjectEvents.SheetConfirm);
      expect(t.progress().wallet).toBe(150);
      t.controller.destroy();
      expect(t.events.count()).toBe(0);
    });
  });
});
