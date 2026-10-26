import { describe, expect, it, vi } from 'vitest';
import { DressUpEvents } from '../../src/game/constants';
import type { DressUpContext, DressUpController } from '../../src/game/objects/dressup/DressUpController';
import { DecoratorRegistry } from '../../src/game/objects/dressup/decorators';
import { ControllerHost, mergeControllerState } from '../../src/game/objects/dressup/runtime';

/** A tiny EventEmitter like Phaser's scene events. */
class Emitter {
  private readonly map = new Map<string, ((...a: unknown[]) => void)[]>();
  on(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, [...(this.map.get(e) ?? []), fn]); return this; }
  off(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, (this.map.get(e) ?? []).filter((f) => f !== fn)); return this; }
  emit(e: string, ...a: unknown[]) { for (const f of this.map.get(e) ?? []) f(...a); }
}

const ctxOf = (events = new Emitter()) => ({ scene: { events }, events } as unknown as DressUpContext & { events: Emitter });

function probe(extra: Partial<DressUpController> = {}) {
  const log: string[] = [];
  const dropped: unknown[] = [];
  const controller: DressUpController = {
    key: 'probe',
    attach(ctx) {
      log.push('attach');
      ctx.scene.events.on(DressUpEvents.ItemDropped, (item: unknown) => dropped.push(item));
    },
    destroy() { log.push('destroy'); },
    ...extra,
  };
  return { controller, log, dropped };
}

describe('ControllerHost (ADR 0019)', () => {
  it('attaches every controller with the context, in order', () => {
    const a = probe();
    const b = probe({ key: 'b' });
    const host = new ControllerHost([() => a.controller, () => b.controller]);
    host.attach(ctxOf());
    expect(a.log).toEqual(['attach']);
    expect(b.log).toEqual(['attach']);
  });

  it('a controller receives the item-dropped scene event with the garment', () => {
    const ctx = ctxOf();
    const { controller, dropped } = probe();
    new ControllerHost([() => controller]).attach(ctx);
    const item = { id: 'sweater-a' };
    ctx.events.emit(DressUpEvents.ItemDropped, item);
    expect(dropped).toEqual([item]);
  });

  it('destroy runs once for every controller, last attached first', () => {
    const order: string[] = [];
    const mk = (key: string) => probe({ key, destroy: () => void order.push(key) }).controller;
    const host = new ControllerHost([() => mk('a'), () => mk('b')]);
    host.attach(ctxOf());
    host.destroy();
    host.destroy();
    expect(order).toEqual(['b', 'a']);
  });

  it('an empty list does nothing and lets the player leave at once', () => {
    const host = new ControllerHost([]);
    host.attach(ctxOf());
    expect(host.beforeLeave('finish')).toBe(true);
    expect(host.e2eState()).toEqual({});
  });
});

describe('beforeLeave', () => {
  const host = (...results: (boolean | void | Promise<boolean>)[]) => {
    const calls: string[] = [];
    const factories = results.map((r, i) => () => probe({ key: `c${i}`, beforeLeave: (action) => { calls.push(`${i}:${action}`); return r; } }).controller);
    const h = new ControllerHost(factories);
    h.attach(ctxOf());
    return { h, calls };
  };

  it('allows leaving when every controller agrees (or has no opinion)', () => {
    const { h, calls } = host(true, undefined);
    expect(h.beforeLeave('finish')).toBe(true);
    expect(calls).toEqual(['0:finish', '1:finish']);
  });

  it('false prevents leaving and stops asking the rest', () => {
    const { h, calls } = host(false, true);
    expect(h.beforeLeave('change')).toBe(false);
    expect(calls).toEqual(['0:change']);
  });

  it('waits for a promise and then asks the next controller', async () => {
    const { h, calls } = host(Promise.resolve(true), true);
    const verdict = h.beforeLeave('finish');
    expect(verdict).toBeInstanceOf(Promise);
    expect(await verdict).toBe(true);
    expect(calls).toEqual(['0:finish', '1:finish']);
  });

  it('a promise that resolves false prevents leaving', async () => {
    const { h, calls } = host(Promise.resolve(false), true);
    expect(await h.beforeLeave('finish')).toBe(false);
    expect(calls).toEqual(['0:finish']);
  });
});

describe('settled', () => {
  it('is true with no controllers and while every controller is at rest', () => {
    expect(new ControllerHost([]).settled()).toBe(true);
    const h = new ControllerHost([() => probe({ key: 'a', isSettled: () => true }).controller, () => probe({ key: 'b' }).controller]);
    h.attach(ctxOf());
    expect(h.settled()).toBe(true);
  });

  it('is false as soon as one controller is still animating', () => {
    const h = new ControllerHost([() => probe({ key: 'a', isSettled: () => true }).controller, () => probe({ key: 'b', isSettled: () => false }).controller]);
    h.attach(ctxOf());
    expect(h.settled()).toBe(false);
  });
});

describe('e2e state of controllers', () => {
  it('is merged under the key of each controller', () => {
    const h = new ControllerHost([
      () => probe({ key: 'shop', e2eState: () => ({ open: true }) }).controller,
      () => probe({ key: 'dye' }).controller,
    ]);
    h.attach(ctxOf());
    expect(h.e2eState()).toEqual({ shop: { open: true } });
  });

  it('e2eRoot keys go to the top level (the legacy shape of the state), after the keyed ones', () => {
    const h = new ControllerHost([
      () => probe({ key: 'secrets', e2eState: () => ({ count: 1 }), e2eRoot: () => ({ gift: null, almost: [] }) }).controller,
    ]);
    h.attach(ctxOf());
    expect(h.e2eState()).toEqual({ secrets: { count: 1 }, gift: null, almost: [] });
  });

  it('mergeControllerState never overrides what the scene reports', () => {
    expect(mergeControllerState({ catId: 'luna' }, { catId: 'otro', shop: 1 })).toEqual({ catId: 'luna', shop: 1 });
  });
});

describe('DecoratorRegistry (cell decorations)', () => {
  const cell = (id: string) => ({ item: { id }, decorated: [] as string[] });

  it('applies every decorator to each cell and again to the cells of the next tab', () => {
    const reg = new DecoratorRegistry<ReturnType<typeof cell>>();
    reg.add((c) => c.decorated.push('tag'));
    reg.add((c) => c.decorated.push('lock'));
    const first = cell('a');
    reg.apply(first);
    expect(first.decorated).toEqual(['tag', 'lock']);
    const second = cell('a');
    reg.apply(second);
    expect(second.decorated).toEqual(['tag', 'lock']);
  });

  it('add returns a function that removes the decorator', () => {
    const reg = new DecoratorRegistry<ReturnType<typeof cell>>();
    const fn = vi.fn();
    const remove = reg.add(fn);
    remove();
    reg.apply(cell('a'));
    expect(fn).not.toHaveBeenCalled();
    expect(reg.size).toBe(0);
  });

  it('clear forgets every decorator', () => {
    const reg = new DecoratorRegistry<ReturnType<typeof cell>>();
    reg.add(() => undefined);
    reg.clear();
    expect(reg.size).toBe(0);
  });
});
