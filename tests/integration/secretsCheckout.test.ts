import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

// The combo of the fitting room with a piece that is not paid (F13.6): it sounds, the seller sells the gift, and there is no box
// until every piece is the player's. The objects are stand-ins; the decisions are the controller's.
const made = vi.hoisted(() => ({ gifts: [] as { comboId: string }[], bubbles: [] as string[], full: [] as string[], short: [] as string[], unlocked: [] as string[] }));
vi.mock('../../src/game/objects/comboFx', () => ({
  playComboReaction: (_c: unknown, combo: { id: string }) => made.full.push(combo.id),
  playShortReaction: (_c: unknown, combo: { id: string }) => made.short.push(combo.id),
  showBubble: () => {},
}));
vi.mock('../../src/game/objects/GiftBox', () => ({
  GiftBox: class {
    ready = true;
    opened = false;
    constructor(_s: unknown, _x: number, _y: number, public comboId: string, public item: unknown) { made.gifts.push(this); }
    on() { return this; }
    destroy() {}
  },
}));
vi.mock('../../src/game/objects/SecretCounter', () => ({
  SecretCounter: class {
    text = '';
    setDepth() { return this; }
    setCount() {}
    destroy() {}
  },
}));
vi.mock('../../src/game/objects/kit/SpeechBubble', () => ({
  SpeechBubble: class {
    constructor(_s: unknown, _x: number, _y: number, text: string) { made.bubbles.push(text); }
    setDepth() { return this; }
    destroy() {}
  },
}));
vi.mock('../../src/game/objects/alphaMap', () => ({ opaqueBounds: () => null }));
vi.mock('../../src/game/plugins/SavePlugin', () => ({
  getSave: () => ({ secrets: [...made.unlocked], unlockSecret: (id: string) => { if (!made.unlocked.includes(id)) made.unlocked.push(id); return true; } }),
}));

import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import economy from '../../src/game/data/economy.json';
import { DressUpEvents, RegistryKeys } from '../../src/game/constants';
import { comboOutfit } from '../../src/game/domain/combos';
import { hasUnpaidPieces } from '../../src/game/domain/checkout';
import { emptyProgress } from '../../src/game/domain/progress';
import type { ClothingDef, ComboDef, EconomyRules, Outfit, Progress } from '../../src/game/domain/types';
import { SecretsController } from '../../src/game/objects/dressup/SecretsController';

const rules = economy as unknown as EconomyRules;
const items = clothes as unknown as ClothingDef[];
const comboList = combos as unknown as ComboDef[];
// A combo that can be completed with visible items, at least one of them for sale.
const combo = comboList.find((c) => {
  const outfit = comboOutfit(c, items);
  return outfit !== null && hasUnpaidPieces(c, outfit, [], { catalog: items, rules });
})!;
const outfit = comboOutfit(combo, items)!;
const forSale = Object.values(outfit).filter((id) => (items.find((c) => c.id === id)?.tier ?? null) !== null) as string[];
const dropped = items.find((c) => c.id === Object.values(outfit)[0])!;

class Emitter {
  private map = new Map<string, { fn: (...a: unknown[]) => void; ctx?: unknown }[]>();
  on(e: string, fn: (...a: unknown[]) => void, ctx?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, ctx }]); return this; }
  off(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => l.fn !== fn)); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of [...(this.map.get(e) ?? [])]) l.fn.call(l.ctx, ...a); }
}

function setup({ owned = [] as string[], wornNow = {} as Outfit, leaving = false, won = false } = {}) {
  made.gifts.length = 0;
  made.bubbles.length = 0;
  made.full.length = 0;
  made.short.length = 0;
  made.unlocked.length = 0;
  if (won) made.unlocked.push(combo.id);
  const events = new Emitter();
  let progress: Progress = { ...emptyProgress(100), owned, secrets: won ? [combo.id] : [] };
  let current: Outfit = wornNow;
  const delayed: { ms: number; fn: () => void; removed: boolean }[] = [];
  const state = { leaving };
  const scene = {
    events,
    registry: {
      get: (k: string) => (k === RegistryKeys.Progress ? progress : false),
      set: (k: string, v: Progress) => { if (k === RegistryKeys.Progress) progress = v; },
    },
    plugins: { get: () => ({ play: () => {}, playRandom: () => true }) },
    tweens: { add: () => ({}) },
    time: {
      delayedCall: (ms: number, fn: () => void) => { const t = { ms, fn, removed: false, remove() { t.removed = true; } }; delayed.push(t); return t; },
      addEvent: () => ({ remove() {} }),
    },
  };
  const spark = { explode() {} };
  const leaveData: Record<string, unknown> = {};
  const ctx = {
    scene, catalog: { cats: [], clothes: items, combos: comboList, economy: rules, brand: { seller: { name: 'La vendedora' } } },
    cat: { getAnchorWorld: () => ({ x: 600, y: 300 }), lookAt() {} }, grid: { addCellDecorator: () => () => {}, setWorn() {}, getCellPositions: () => ({}) },
    tabs: { getTabPositions: () => ({}) }, hearts: spark, sparkles: spark, rainbow: {}, sign: { text: '', announced: [], announce() {} },
    isLeaving: () => state.leaving, isDragging: () => false, getOutfit: () => current, anchors: { canvas: { width: 1, height: 1 } },
    showCategory() {}, leaveData,
  } as never;
  const controller = new SecretsController();
  controller.attach(ctx);
  const wear = (next: Outfit, item?: ClothingDef) => {
    current = next;
    events.emit(DressUpEvents.OutfitChanged, next, 'drop');
    if (item) events.emit(DressUpEvents.ItemDropped, item);
  };
  const run = () => { for (const t of delayed.filter((d) => !d.removed)) { t.removed = true; t.fn(); } };
  const pay = (ids: string[]) => {
    progress = { ...progress, owned: [...progress.owned, ...ids] };
    events.emit(DressUpEvents.ItemsBought, ids);
  };
  return { controller, wear, run, pay, state, leaveData, progress: () => progress };
}

describe('Secrets and the till (F13.6)', () => {
  it('there is a combo to test with', () => {
    expect(forSale.length).toBeGreaterThan(0);
  });

  it('a combo with an unpaid piece sounds short, the seller hooks the sale and no box comes', () => {
    const t = setup();
    t.wear({}, undefined);
    t.wear(outfit, dropped);
    t.run();
    expect(made.short).toEqual([combo.id]);
    expect(made.full).toEqual([]);
    expect(made.bubbles.some((b) => /regalito/i.test(b))).toBe(true);
    expect(made.gifts).toHaveLength(0);
    expect(t.controller.e2eRoot().reactions).toEqual([combo.reaction]);
    expect(t.controller.e2eRoot().pendingGifts).toBe(0);
  });

  it('with every piece paid, the same drop is the full reaction and the box comes', () => {
    const t = setup({ owned: forSale });
    t.wear({});
    t.wear(outfit, dropped);
    t.run();
    expect(made.full).toEqual([combo.id]);
    expect(made.short).toEqual([]);
    expect(made.gifts.map((g) => g.comboId)).toEqual([combo.id]);
    expect(made.bubbles.some((b) => /regalito/i.test(b))).toBe(false);
  });

  it('a combo whose prize is already won never says "regalito"', () => {
    const t = setup({ won: true });
    t.wear({});
    t.wear(outfit, dropped);
    t.run();
    expect(made.short).toEqual([combo.id]);
    expect(made.bubbles.some((b) => /regalito/i.test(b))).toBe(false);
  });

  it('paying the missing pieces later gives the box (a purchase while wearing it)', () => {
    const t = setup();
    t.wear({});
    t.wear(outfit, dropped);
    t.run();
    t.pay(forSale);
    t.run();
    expect(made.full).toEqual([combo.id]);
    expect(made.gifts.map((g) => g.comboId)).toEqual([combo.id]);
  });

  it('paying only some of the pieces is not enough', () => {
    const t = setup();
    t.wear({});
    t.wear(outfit, dropped);
    t.run();
    if (forSale.length > 1) {
      t.pay(forSale.slice(0, 1));
      t.run();
      expect(made.gifts).toHaveLength(0);
    }
  });

  it('paying at the till while leaving hands the prize over quietly, with the gifts of the Showcase', () => {
    const t = setup();
    t.wear({});
    t.wear(outfit, dropped);
    t.run();
    t.state.leaving = true;
    t.controller.beforeLeave();
    expect(t.leaveData.gifted).toEqual([]);
    t.pay(forSale);
    expect(t.leaveData.gifted).toEqual([combo.id]);
    expect(made.unlocked).toContain(combo.id);
    expect(made.gifts).toHaveLength(0);
  });

  it('paying does not repeat a prize that is already queued', () => {
    const t = setup({ owned: forSale });
    t.wear({});
    t.wear(outfit, dropped);
    t.pay(forSale);
    t.run();
    expect(made.gifts.map((g) => g.comboId)).toEqual([combo.id]);
  });

  it('a payment with nothing special changes nothing', () => {
    const t = setup();
    t.wear({});
    t.pay(['whatever']);
    t.run();
    expect(made.gifts).toHaveLength(0);
    expect(made.full).toEqual([]);
  });
});
