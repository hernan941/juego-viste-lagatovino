import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

// Stand-ins for the objects: the controller is the logic; the objects have their own tests.
const made = vi.hoisted(() => ({ sheets: [] as unknown[], said: [] as string[] }));
vi.mock('../../src/game/objects/CheckoutSheet', () => ({
  CheckoutSheet: class {
    handlers: Record<string, (...a: unknown[]) => void> = {};
    closed = false;
    destroyed = false;
    nudged = 0;
    constructor(_scene: unknown, public options: { lines: { label: string; price: number }[]; total: number; missing: number; sellerLine: string }) { made.sheets.push(this); }
    on(e: string, fn: (...a: unknown[]) => void) { this.handlers[e] = fn; return this; }
    emit(e: string, ...a: unknown[]) { this.handlers[e]?.(...a); }
    close(done?: () => void) { this.closed = true; done?.(); }
    nudge() { this.nudged++; }
    updates: { lines: { label: string; price: number }[]; total: number; missing: number; sellerLine: string }[] = [];
    update(o: { lines: { label: string; price: number }[]; total: number; missing: number; sellerLine: string }) { this.updates.push(o); }
    getRemovePoints() { return [{ x: 7, y: 8 }]; }
    getButtonPoints() { return { takeAll: { x: 1, y: 2 }, leaveOut: { x: 3, y: 4 }, keepTrying: { x: 5, y: 6 } }; }
    get isClosing() { return this.closed; }
    destroy() { this.destroyed = true; }
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
import dyes from '../../src/game/data/dyes.json';
import economy from '../../src/game/data/economy.json';
import { DressUpEvents, ObjectEvents, RegistryKeys, SfxKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import type { ClothingDef, DyeDef, EconomyRules, ItemDye, Outfit, Progress } from '../../src/game/domain/types';
import { CheckoutController } from '../../src/game/objects/dressup/CheckoutController';
import { controllerFactories } from '../../src/game/objects/dressup/controllers';

const rules = economy as unknown as EconomyRules;
const items = clothes as unknown as ClothingDef[];
const bottles = dyes as unknown as DyeDef[];
const free = items.find((c) => c.starter)!;
const basic = items.find((c) => c.tier === 'basica' && c.slot !== free.slot)!;
const fancy = items.find((c) => c.tier === 'lujo' && c.slot !== basic.slot && c.slot !== free.slot)!;
const bottle = bottles.find((d) => !d.starter)!;

class Emitter {
  private map = new Map<string, { fn: (...a: unknown[]) => void; ctx?: unknown }[]>();
  on(e: string, fn: (...a: unknown[]) => void, ctx?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, ctx }]); return this; }
  off(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => l.fn !== fn)); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of [...(this.map.get(e) ?? [])]) l.fn.call(l.ctx, ...a); }
}

interface Setup { wallet?: number; worn?: ClothingDef[]; owned?: string[]; dyed?: ItemDye }

function setup({ wallet = 500, worn = [free, basic, fancy], owned = [], dyed = {} }: Setup = {}) {
  made.sheets.length = 0;
  made.said.length = 0;
  const events = new Emitter();
  const sounds: string[] = [];
  const calls: string[] = [];
  const order: string[] = [];
  const emitted: { event: string; args: unknown[] }[] = [];
  let progress: Progress = { ...emptyProgress(100), wallet, owned };
  let itemDye: ItemDye = dyed;
  const delayed: { ms: number; fn: () => void; removed: boolean }[] = [];
  const realEmit = events.emit.bind(events);
  events.emit = (e: string, ...a: unknown[]) => { emitted.push({ event: e, args: a }); order.push(`event:${e}`); realEmit(e, ...a); };
  let outfit: Outfit = Object.fromEntries(worn.map((c) => [c.slot, c.id]));
  const scene = {
    events,
    registry: {
      get: (k: string) => (k === RegistryKeys.Progress ? progress : k === RegistryKeys.ItemDye ? itemDye : undefined),
      set: (k: string, v: unknown) => {
        order.push(`set:${k}`);
        if (k === RegistryKeys.Progress) progress = v as Progress;
        if (k === RegistryKeys.ItemDye) itemDye = v as ItemDye;
      },
    },
    plugins: { get: () => ({ play: (k: string) => sounds.push(k), playRandom: () => true }) },
    tweens: { add: () => ({}) },
    time: { delayedCall: (ms: number, fn: () => void) => { const t = { ms, fn, removed: false, remove() { t.removed = true; } }; delayed.push(t); return t; } },
  };
  const cat = {
    playFaces: (p: { expression: string }) => calls.push(`face:${p.expression}`),
    getAnchorWorld: () => ({ x: 600, y: 300 }),
  };
  const cell = { receivePop: () => calls.push('cellPop') };
  const grid = { getCell: () => cell };
  const hearts = { explode: (n: number) => calls.push(`hearts:${n}`) };
  const sparkles = { explode: (n: number, x: number, y: number) => calls.push(`puf:${n}@${x},${y}`) };
  const removed: string[] = [];
  const ctx = {
    scene, catalog: { cats: [], clothes: items, combos: [], economy: rules, dyes: bottles, brand: { seller: { name: 'La vendedora', texture: 'char-seller' } } },
    cat, grid, hearts, sparkles, getOutfit: () => outfit, isDragging: () => false, isLeaving: () => true,
    removeItem: (item: ClothingDef) => { removed.push(item.id); outfit = Object.fromEntries(Object.entries(outfit).filter(([, id]) => id !== item.id)); },
  } as never;
  const controller = new CheckoutController();
  controller.attach(ctx);
  const sheet = () => made.sheets[made.sheets.length - 1] as { emit(e: string, ...a: unknown[]): void; closed: boolean; destroyed: boolean; nudged: number; updates: { lines: { label: string; price: number }[]; total: number; missing: number; sellerLine: string }[]; options: { lines: { label: string; price: number }[]; total: number; missing: number; sellerLine: string } };
  // Runs the pending timers in order of delay, including the ones they add.
  const run = () => {
    for (let guard = 0; guard < 100; guard++) {
      const next = delayed.filter((d) => !d.removed).sort((a, b) => a.ms - b.ms)[0];
      if (!next) return;
      next.removed = true;
      next.fn();
    }
  };
  const verdicts: boolean[] = [];
  const leave = (action: 'finish' | 'change' = 'finish') => {
    const v = controller.beforeLeave(action);
    if (v instanceof Promise) void v.then((ok) => verdicts.push(ok));
    return v;
  };
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  return { controller, events, sheet, sounds, calls, order, emitted, removed, run, delayed, verdicts, leave, flush, progress: () => progress, itemDye: () => itemDye, outfit: () => outfit };
}

describe('CheckoutController (F13.6)', () => {
  it('is in the controllers list', () => {
    expect(controllerFactories.some((make) => make() instanceof CheckoutController)).toBe(true);
  });

  it('with nothing unpaid on the cat, Ready goes straight out', () => {
    const t = setup({ worn: [free] });
    expect(t.leave()).toBe(true);
    expect(made.sheets).toHaveLength(0);
  });

  it('owned things do not stop the way out either', () => {
    const t = setup({ worn: [free, basic], owned: [basic.id] });
    expect(t.leave()).toBe(true);
  });

  it('"Otro gato" never opens the till: trying is free', () => {
    const t = setup();
    expect(t.leave('change')).toBe(true);
    expect(made.sheets).toHaveLength(0);
  });

  it('with unpaid things, Ready opens the till with the list, the total and the seller', async () => {
    const t = setup();
    const verdict = t.leave();
    expect(verdict).toBeInstanceOf(Promise);
    const { options } = t.sheet();
    expect(options.lines.map((l) => l.label).sort()).toEqual([basic.name, fancy.name].sort());
    expect(options.total).toBe(40 + 110);
    expect(options.missing).toBe(0);
    expect(options.sellerLine).toContain('150');
    expect(t.controller.e2eState().open).toBe(true);
    expect(t.controller.isSettled()).toBe(false);
  });

  it('an unpaid bottle is a line of the till', () => {
    const t = setup({ worn: [free], dyed: { [free.id]: bottle.id } });
    t.leave();
    expect(t.sheet().options.lines.map((l) => l.label)).toEqual([`Tinte ${bottle.name}`]);
    expect(t.sheet().options.total).toBe(50);
  });

  it('each line carries what to take off if its cross is pressed (A6)', () => {
    const t = setup();
    t.leave();
    const lines = t.sheet().options.lines as unknown as { ref: { kind: string; id: string } }[];
    expect(lines.map((l) => l.ref).sort((a, b) => a.id.localeCompare(b.id))).toEqual([{ kind: 'item', id: basic.id }, { kind: 'item', id: fancy.id }].sort((a, b) => a.id.localeCompare(b.id)));
  });

  it('taking one piece off removes only that one with a puf, recalculates the total and keeps the till open (A6)', async () => {
    const t = setup({ wallet: 100 });
    t.leave();
    expect(t.sheet().options.missing).toBe(50);
    t.sheet().emit(ObjectEvents.SheetRemoveLine, { kind: 'item', id: fancy.id });
    expect(t.removed).toEqual([fancy.id]);
    expect(t.outfit()[basic.slot]).toBe(basic.id);
    expect(t.calls.some((c) => c.startsWith('puf:'))).toBe(true);
    const sheet = t.sheet();
    expect(sheet.updates).toHaveLength(1);
    expect(sheet.updates[0]).toMatchObject({ total: 40, missing: 0 });
    expect(sheet.updates[0].lines.map((l) => l.label)).toEqual([basic.name]);
    expect(sheet.closed).toBe(false);
    expect(t.verdicts).toEqual([]);
    // The wallet reaches now: [Llevar todo] pays only what is left.
    sheet.emit(ObjectEvents.SheetConfirm);
    expect(t.progress().owned).toEqual([basic.id]);
    expect(t.progress().wallet).toBe(60);
  });

  it('taking off a bottle keeps the garment and drops the bottle line (A6)', () => {
    const t = setup({ worn: [free, basic], dyed: { [free.id]: bottle.id } });
    t.leave();
    t.sheet().emit(ObjectEvents.SheetRemoveLine, { kind: 'dye', id: bottle.id });
    expect(t.removed).toEqual([]);
    expect(t.itemDye()).toEqual({});
    expect(t.outfit()[free.slot]).toBe(free.id);
    expect(t.sheet().updates[0].lines.map((l) => l.label)).toEqual([basic.name]);
  });

  it('taking off the last unpaid piece closes the till and lets the player go with what is theirs (A6)', async () => {
    const t = setup({ worn: [free, basic] });
    t.leave();
    t.sheet().emit(ObjectEvents.SheetRemoveLine, { kind: 'item', id: basic.id });
    expect(t.sheet().closed).toBe(true);
    t.run();
    await t.flush();
    expect(t.verdicts).toEqual([true]);
    expect(t.controller.e2eState().outcomes).toEqual(['left-out']);
  });

  it('a cross pressed on a line that is not there, or after paying, does nothing (A6)', () => {
    const t = setup();
    t.leave();
    t.sheet().emit(ObjectEvents.SheetRemoveLine, { kind: 'item', id: 'nope' });
    expect(t.removed).toEqual([]);
    expect(t.sheet().updates).toHaveLength(0);
    t.sheet().emit(ObjectEvents.SheetConfirm);
    t.sheet().emit(ObjectEvents.SheetRemoveLine, { kind: 'item', id: basic.id });
    expect(t.removed).toEqual([]);
  });

  it('[Seguir probando] closes the till and stays: the verdict is false and nothing changed', async () => {
    const t = setup();
    t.leave();
    t.sheet().emit(ObjectEvents.SheetCancel);
    await t.flush();
    expect(t.verdicts).toEqual([false]);
    expect(t.sheet().closed).toBe(true);
    expect(t.progress().owned).toEqual([]);
    expect(t.removed).toEqual([]);
    expect(t.controller.isSettled()).toBe(true);
  });

  it('[Llevar todo] pays everything at once, flies the buttons out of the purse and lets the player go', async () => {
    const t = setup();
    t.leave();
    t.sheet().emit(ObjectEvents.SheetConfirm);
    expect(t.progress().wallet).toBe(500 - 150);
    expect([...t.progress().owned].sort()).toEqual([basic.id, fancy.id].sort());
    const flight = t.emitted.find((e) => e.event === DressUpEvents.WalletFlight)!.args[0] as { direction: string; coins: number };
    expect(flight).toMatchObject({ direction: 'out', coins: 150 });
    // The buttons are asked before the progress changes so the purse holds its number while they leave.
    expect(t.order.indexOf(`event:${DressUpEvents.WalletFlight}`)).toBeLessThan(t.order.indexOf(`set:${RegistryKeys.Progress}`));
    const bought = t.emitted.find((e) => e.event === DressUpEvents.ItemsBought)!.args[0] as string[];
    expect([...bought].sort()).toEqual([basic.id, fancy.id].sort());
    expect(t.verdicts).toEqual([]);
    t.run();
    await t.flush();
    expect(t.verdicts).toEqual([true]);
    expect(t.sounds).toContain(SfxKeys.Register);
    expect(t.calls).toContain('face:amor');
    expect(made.said).toContain('¡Es tuyo! Buena elección');
  });

  it('paying also pays the unpaid bottles', () => {
    const t = setup({ worn: [free], dyed: { [free.id]: bottle.id } });
    t.leave();
    t.sheet().emit(ObjectEvents.SheetConfirm);
    expect(t.progress().dyesOwned).toEqual([bottle.id]);
    expect(t.progress().wallet).toBe(450);
  });

  it('announces the paid bottles (DyesBought) so the shelf drops their tags, and only when there are some', () => {
    const t = setup({ worn: [free], dyed: { [free.id]: bottle.id } });
    t.leave();
    t.sheet().emit(ObjectEvents.SheetConfirm);
    expect(t.emitted.filter((e) => e.event === DressUpEvents.DyesBought).map((e) => e.args[0])).toEqual([[bottle.id]]);
    const none = setup();
    none.leave();
    none.sheet().emit(ObjectEvents.SheetConfirm);
    expect(none.emitted.some((e) => e.event === DressUpEvents.DyesBought)).toBe(false);
  });

  it('a second tap on [Llevar todo] does not pay twice', () => {
    const t = setup();
    t.leave();
    const sheet = t.sheet();
    sheet.emit(ObjectEvents.SheetConfirm);
    sheet.emit(ObjectEvents.SheetConfirm);
    expect(t.progress().wallet).toBe(350);
    expect(t.emitted.filter((e) => e.event === DressUpEvents.ItemsBought)).toHaveLength(1);
  });

  it('short on buttons: the purse shakes, the till shakes, nothing is paid and the till stays open', async () => {
    const t = setup({ wallet: 100 });
    t.leave();
    expect(t.sheet().options.missing).toBe(50);
    t.sheet().emit(ObjectEvents.SheetShort);
    expect(t.emitted.some((e) => e.event === DressUpEvents.WalletShake)).toBe(true);
    expect(t.sheet().nudged).toBe(1);
    expect(t.progress().wallet).toBe(100);
    expect(t.sheet().closed).toBe(false);
    await t.flush();
    expect(t.verdicts).toEqual([]);
  });

  it('a [Llevar todo] that arrives when the wallet is short changes nothing', () => {
    const t = setup({ wallet: 100 });
    t.leave();
    t.sheet().emit(ObjectEvents.SheetConfirm);
    expect(t.progress().wallet).toBe(100);
    expect(t.progress().owned).toEqual([]);
    expect(t.sheet().closed).toBe(false);
  });

  it('[Sacarme lo que no tengo] takes off only the unpaid items, one after another, and lets the player go', async () => {
    const t = setup({ owned: [] });
    t.leave();
    t.sheet().emit(ObjectEvents.SheetLeaveOut);
    expect(t.sheet().closed).toBe(true);
    t.run();
    await t.flush();
    expect([...t.removed].sort()).toEqual([basic.id, fancy.id].sort());
    expect(Object.values(t.outfit())).toEqual([free.id]);
    expect(t.progress().wallet).toBe(500);
    expect(t.progress().owned).toEqual([]);
    expect(t.calls.filter((c) => c.startsWith('puf:'))).toHaveLength(2);
    expect(t.calls.filter((c) => c === 'cellPop')).toHaveLength(2);
    expect(t.verdicts).toEqual([true]);
  });

  it('the removals are 80 ms apart', () => {
    const t = setup();
    t.leave();
    t.sheet().emit(ObjectEvents.SheetLeaveOut);
    const removals = t.delayed.map((d) => d.ms).filter((ms) => ms < 400).sort((a, b) => a - b);
    expect(removals).toEqual([0, 80]);
  });

  it('[Sacarme lo que no tengo] also clears an unpaid bottle and keeps a paid one', () => {
    const paid = bottles.find((d) => !d.starter && d.id !== bottle.id)!;
    const t = setup({ worn: [free, basic], owned: [basic.id], dyed: { [free.id]: bottle.id, [basic.id]: paid.id } });
    t.progress().dyesOwned.push(paid.id);
    t.leave();
    t.sheet().emit(ObjectEvents.SheetLeaveOut);
    t.run();
    expect(t.itemDye()).toEqual({ [basic.id]: paid.id });
    expect(t.removed).toEqual([]);
  });

  it('closing the scene while the till is open lets nobody leave and leaves nothing behind', async () => {
    const t = setup();
    t.leave();
    const sheet = t.sheet();
    t.controller.destroy();
    await t.flush();
    expect(sheet.destroyed).toBe(true);
    expect(t.verdicts).toEqual([false]);
    expect(t.delayed.filter((d) => !d.removed)).toHaveLength(0);
  });

  it('reports itself to the e2e hook', () => {
    const t = setup();
    expect(t.controller.e2eState()).toMatchObject({ open: false, busy: false, total: null, lines: [], buttons: null, outcomes: [] });
    t.leave();
    const open = t.controller.e2eState();
    expect(open).toMatchObject({ open: true, total: 150 });
    expect(open.buttons).toEqual({ takeAll: { x: 1, y: 2 }, leaveOut: { x: 3, y: 4 }, keepTrying: { x: 5, y: 6 } });
  });

  it('remembers how each till ended', async () => {
    const t = setup();
    t.leave();
    t.sheet().emit(ObjectEvents.SheetCancel);
    await t.flush();
    t.leave();
    t.sheet().emit(ObjectEvents.SheetConfirm);
    t.run();
    expect(t.controller.e2eState().outcomes).toEqual(['kept', 'paid']);
  });
});
