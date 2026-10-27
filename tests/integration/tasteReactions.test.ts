import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Plugins: { BasePlugin: class {} } } }));

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

// A stand-in for the chip: it records its flight and lands when the test says so.
vi.mock('../../src/game/objects/TasteChip', () => {
  const chips: { text: unknown; target?: unknown; land?: () => void; destroyed: boolean }[] = [];
  return {
    chips,
    TasteChip: class {
      rec: { text: unknown; target?: unknown; land?: () => void; destroyed: boolean };
      constructor(_s: unknown, _x: number, _y: number, text: unknown) { this.rec = { text, destroyed: false }; chips.push(this.rec); }
      setDepth() { return this; }
      flyTo(target: unknown, onLand: () => void) { this.rec.target = target; this.rec.land = onLand; }
      destroy() { this.rec.destroyed = true; }
    },
  };
});

import cats from '../../src/game/data/cats.json';
import economy from '../../src/game/data/economy.json';
import clothes from '../../src/game/data/clothes.json';
import { DressUpEvents, RegistryKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import { tasteKeyOf, tasteReaction } from '../../src/game/domain/tastes';
import type { CatDef, ClothingDef, EconomyRules, Progress } from '../../src/game/domain/types';
import { TasteReactions } from '../../src/game/objects/dressup/TasteReactions';
import * as bubbleModule from '../../src/game/objects/kit/SpeechBubble';
import * as chipModule from '../../src/game/objects/TasteChip';

const said = (bubbleModule as unknown as { made: string[] }).made;
const chips = (chipModule as unknown as { chips: { text: { glyph: string; label: string }; target?: { x: number; y: number }; land?: () => void; destroyed: boolean }[] }).chips;
const rules = economy as unknown as EconomyRules;
const items = clothes as unknown as ClothingDef[];
const catDefs = cats as unknown as CatDef[];
const cat = catDefs.find((c) => c.id === 'naranja')!;
const prefs = cat.prefs!;

class Emitter {
  private map = new Map<string, { fn: (...a: unknown[]) => void; ctx?: unknown }[]>();
  // Like Phaser's emitter: the listener runs with the context it was registered with.
  on(e: string, fn: (...a: unknown[]) => void, ctx?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, ctx }]); return this; }
  off(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => l.fn !== fn)); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of this.map.get(e) ?? []) l.fn.call(l.ctx, ...a); }
  count() { return [...this.map.values()].reduce((n, l) => n + l.length, 0); }
}

function setup({ reduced = false, dye = {}, found = [] }: { reduced?: boolean; dye?: Record<string, string>; found?: string[] } = {}) {
  chips.length = 0;
  let progress: Progress = { ...emptyProgress(100), tastesFound: found.length ? { naranja: found } : {} };
  const writes: Progress[] = [];
  const flights: unknown[] = [];
  const order: string[] = [];
  const events = new Emitter();
  const sounds: { key: string; rate?: number }[] = [];
  const calls: string[] = [];
  const audio = {
    play: (key: string, o?: { rate?: number }) => (sounds.push({ key, rate: o?.rate }), true),
    playRandom: (keys: string[], o?: { rate?: number }) => (sounds.push({ key: keys[0], rate: o?.rate }), true),
  };
  const scene = {
    events,
    registry: {
      get: (k: string) => (k === RegistryKeys.Progress ? progress : reduced),
      set: (k: string, v: Progress) => { if (k === RegistryKeys.Progress) { progress = v; writes.push(v); order.push('write'); } },
    },
    plugins: { get: (k: string) => (k === 'AudioPlugin' ? audio : { saved: { itemDye: dye } }) },
    time: { delayedCall: (_ms: number, fn: () => void) => (fn(), { remove: () => {} }) },
    tweens: { add: (cfg: { onComplete?: () => void }) => cfg.onComplete?.() },
    add: { particles: () => ({ explode: () => calls.push('sparks'), setDepth() { return this; }, destroy: () => {} }) },
  };
  const catFake = {
    sayNo: () => calls.push('sayNo'),
    glanceAt: () => calls.push('glance'),
    playFaces: (p: { expression: string }) => calls.push(`face:${p.expression}`),
    getAnchorWorld: () => ({ x: 100, y: 100 }),
  };
  const hearts = { explode: (n: number) => calls.push(`hearts:${n}`) };
  const ctx = {
    scene, catalog: { cats: catDefs, clothes: items, combos: [], economy: rules, dyes: [] }, cat: catFake, hearts, sparkles: hearts, sign: { x: 700, y: 92, setScale() { return this; } },
    hud: { add: () => {} }, catId: 'naranja', getOutfit: () => ({}),
  } as never;
  const realEmit = events.emit.bind(events);
  events.emit = (e: string, ...a: unknown[]) => {
    if (e === DressUpEvents.WalletFlight) { flights.push(a[0]); order.push('flight'); }
    realEmit(e, ...a);
  };
  const fx = new TasteReactions();
  fx.attach(ctx);
  const drop = (item: ClothingDef) => {
    events.emit(DressUpEvents.OutfitChanged, { [item.slot]: item.id }, 'drop');
    events.emit(DressUpEvents.ItemDropped, item);
  };
  return { fx, events, drop, sounds, calls, progress: () => progress, writes, flights, order };
}

const plain = (c: ClothingDef) => !c.tags.includes('secreto');
const loved = items.find((c) => plain(c) && c.id !== prefs.favoriteItem && c.tags.some((t) => prefs.loves.includes(t)) && !c.tags.some((t) => prefs.dislikes.includes(t)))!;
const hated = items.find((c) => plain(c) && c.id !== prefs.favoriteItem && c.tags.some((t) => prefs.dislikes.includes(t)))!;
const favorite = items.find((c) => c.id === prefs.favoriteItem)!;
const neutral = items.find((c) => plain(c) && c.id !== prefs.favoriteItem && !c.tags.some((t) => [...prefs.loves, ...prefs.dislikes].includes(t)))!;

describe('TasteReactions (F14.2)', () => {
  it('love: amor face, extra hearts and a purr', () => {
    const t = setup();
    t.drop(loved);
    expect(t.calls).toContain('face:amor');
    expect(t.calls).toContain('hearts:3');
    expect(t.sounds.length).toBeGreaterThan(0);
    expect(t.fx.e2eState().last).toBe('love');
  });

  it('dislike: sayNo, a bubble "mmm… no" and a low meow (rate 0.8)', () => {
    const t = setup();
    t.drop(hated);
    expect(t.calls).toContain('sayNo');
    expect(said).toContain('mmm… no');
    expect(t.sounds.some((s) => s.rate === 0.8)).toBe(true);
    expect(t.fx.e2eState().last).toBe('dislike');
  });

  it('favorite: golden sparkles, amor and a bubble', () => {
    const t = setup();
    t.drop(favorite);
    expect(t.calls).toContain('sparks');
    expect(t.calls).toContain('face:amor');
    expect(said).toContain('¡MI FAVORITO!');
    expect(t.fx.e2eState().last).toBe('favorite');
  });

  it('color: the cat glances at the garment and says "¡mi color!"', () => {
    const t = setup({ dye: { [neutral.id]: prefs.favoriteDye } });
    t.drop(neutral);
    expect(t.calls).toContain('glance');
    expect(said).toContain('¡mi color!');
    expect(t.fx.e2eState().last).toBe('color');
  });

  it('neutral: the scene already reacts, so this controller adds nothing', () => {
    const t = setup();
    t.drop(neutral);
    expect(t.calls).toEqual([]);
    expect(t.fx.e2eState().last).toBe('neutral');
  });

  it('reduced motion: the face and the sound still answer', () => {
    const t = setup({ reduced: true });
    t.drop(loved);
    expect(t.calls).toContain('face:amor');
    expect(t.sounds.length).toBeGreaterThan(0);
  });

  it('keeps a log for the e2e hook and removes its listeners on destroy', () => {
    const t = setup();
    t.drop(loved);
    t.drop(hated);
    expect(t.fx.e2eState().log).toEqual(['love', 'dislike']);
    t.fx.destroy();
    expect(t.events.count()).toBe(0);
  });
});

describe('TasteReactions: dyeing an item (F16.3)', () => {
  const otherDye = ['rosa', 'lila', 'sol', 'hoja'].find((d) => d !== prefs.favoriteDye)!;

  it('dyeing with the favorite color makes the cat glance at the garment and say "¡mi color!"', () => {
    const t = setup();
    t.events.emit(DressUpEvents.ItemDyed, neutral, prefs.favoriteDye);
    expect(t.calls).toContain('glance');
    expect(said).toContain('¡mi color!');
    expect(t.fx.e2eState().last).toBe('color');
  });

  it('another color says nothing (the cat only has an opinion about its own)', () => {
    const t = setup();
    t.events.emit(DressUpEvents.ItemDyed, neutral, otherDye);
    expect(t.calls).toEqual([]);
    expect(t.fx.e2eState().log).toEqual([]);
  });

  it('the water is not a color to like', () => {
    const t = setup();
    t.events.emit(DressUpEvents.ItemDyed, neutral, 'agua');
    expect(t.fx.e2eState().log).toEqual([]);
  });
});

describe('TasteReactions: discovering pays (F14.3)', () => {
  const flights = (t: ReturnType<typeof setup>) => t.flights;

  it('the first time a taste shows, a chip with its glyph and name flies from the cat to the name sign', () => {
    const t = setup();
    t.drop(loved);
    expect(chips).toHaveLength(1);
    expect(chips[0].text).toMatchObject({ glyph: '♥' });
    expect(chips[0].target).toEqual({ x: 700, y: 103 });
    expect(chips[0].destroyed).toBe(false);
  });

  it('nothing is paid until the chip lands; then the buttons fly in from the sign and the progress is written once', () => {
    const t = setup();
    t.drop(loved);
    expect(t.writes).toHaveLength(0);
    expect(t.fx.isSettled()).toBe(false);
    chips[0].land!();
    expect(t.writes).toHaveLength(1);
    expect(t.progress().wallet).toBe(100 + rules.discoveryBonus);
    const key = tasteKeyOf(tasteReaction(loved, undefined, catDefs.find((c) => c.id === 'naranja')!))!;
    expect(t.progress().tastesFound.naranja).toContain(key);
    expect(t.flights).toEqual([{ direction: 'in', at: { x: 700, y: 103 }, coins: rules.discoveryBonus }]);
    expect(t.fx.isSettled()).toBe(true);
  });

  it('the buttons are asked before the progress changes (the purse holds its number)', () => {
    const t = setup();
    t.drop(loved);
    chips[0].land!();
    expect(t.order).toEqual(['flight', 'write']);
  });

  it('the same taste again pays nothing and makes no chip', () => {
    const t = setup();
    t.drop(loved);
    chips[0].land!();
    t.drop(loved);
    expect(chips).toHaveLength(1);
    expect(t.writes).toHaveLength(1);
  });

  it('a taste already in the save makes no chip', () => {
    const key = tasteKeyOf(tasteReaction(loved, undefined, catDefs.find((c) => c.id === 'naranja')!))!;
    const t = setup({ found: [key] });
    t.drop(loved);
    expect(chips).toHaveLength(0);
  });

  it('two quick drops of the same new taste make one chip and one payment', () => {
    const t = setup();
    t.drop(loved);
    t.drop(loved);
    expect(chips).toHaveLength(1);
    chips[0].land!();
    expect(t.progress().wallet).toBe(100 + rules.discoveryBonus);
  });

  it('a different taste pays on its own: the favorite and the dislike are two more chips', () => {
    const t = setup();
    t.drop(loved);
    t.drop(favorite);
    t.drop(hated);
    expect(chips).toHaveLength(3);
    for (const c of chips) c.land!();
    expect(t.progress().wallet).toBe(100 + 3 * rules.discoveryBonus);
  });

  it('a neutral drop discovers nothing', () => {
    const t = setup();
    t.drop(neutral);
    expect(chips).toHaveLength(0);
    expect(t.fx.isSettled()).toBe(true);
  });

  it('leaving while a chip is in the air does not lose the discovery: it is written and the chip is destroyed', () => {
    const t = setup();
    t.drop(loved);
    t.fx.destroy();
    expect(chips[0].destroyed).toBe(true);
    expect(t.progress().wallet).toBe(100 + rules.discoveryBonus);
    expect(t.flights).toEqual([]);
  });

  it('the e2e state lists what was discovered in this visit', () => {
    const t = setup();
    t.drop(loved);
    chips[0].land!();
    expect(t.fx.e2eState().discovered).toHaveLength(1);
    expect(flights(t)).toHaveLength(1);
  });
});
