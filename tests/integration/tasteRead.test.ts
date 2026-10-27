import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Plugins: { BasePlugin: class {} } } }));

// Stand-ins: the bubble records its lines, the chip records its flight and lands when the test says so.
const made = vi.hoisted(() => ({ said: [] as string[], chips: [] as { text: unknown; land?: () => void; destroyed: boolean; at: { x: number; y: number } }[] }));
vi.mock('../../src/game/objects/kit/SpeechBubble', () => ({
  SpeechBubble: class {
    constructor(_s: unknown, _x: number, _y: number, text: string) { made.said.push(text); }
    setDepth() { return this; }
    destroy() {}
  },
}));
vi.mock('../../src/game/objects/TasteChip', () => ({
  TasteChip: class {
    rec: { text: unknown; land?: () => void; destroyed: boolean; at: { x: number; y: number } };
    constructor(_s: unknown, x: number, y: number, text: unknown) { this.rec = { text, destroyed: false, at: { x, y } }; made.chips.push(this.rec); }
    setDepth() { return this; }
    flyTo(_target: unknown, onLand: () => void) { this.rec.land = onLand; }
    destroy() { this.rec.destroyed = true; }
  },
}));

import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import economy from '../../src/game/data/economy.json';
import { DressUpEvents, RegistryKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import { tasteKeyOf, tasteReaction } from '../../src/game/domain/tastes';
import type { CatDef, ClothingDef, EconomyRules, Outfit, Progress } from '../../src/game/domain/types';
import { TasteReactions } from '../../src/game/objects/dressup/TasteReactions';

const rules = economy as unknown as EconomyRules;
const items = clothes as unknown as ClothingDef[];
const catDefs = cats as unknown as CatDef[];
const naranja = catDefs.find((c) => c.id === 'naranja')!;
const prefs = naranja.prefs!;
const byId = (id: string) => items.find((c) => c.id === id)!;
const favorite = byId(prefs.favoriteItem);
const loved = items.find((c) => c.slot !== favorite.slot && c.tags.some((t) => prefs.loves.includes(t)) && !c.tags.some((t) => prefs.dislikes.includes(t)))!;
const hated = items.find((c) => c.slot !== favorite.slot && c.slot !== loved.slot && c.tags.some((t) => prefs.dislikes.includes(t)) && !c.tags.some((t) => prefs.loves.includes(t)))!;
const neutral = items.find((c) => ![favorite.slot, loved.slot, hated.slot].includes(c.slot) && !c.tags.some((t) => [...prefs.loves, ...prefs.dislikes].includes(t)) && c.id !== prefs.favoriteItem)!;
const outfitOf = (...worn: ClothingDef[]): Outfit => Object.fromEntries(worn.map((c) => [c.slot, c.id]));

class Emitter {
  private map = new Map<string, { fn: (...a: unknown[]) => void; ctx?: unknown }[]>();
  on(e: string, fn: (...a: unknown[]) => void, ctx?: unknown) { this.map.set(e, [...(this.map.get(e) ?? []), { fn, ctx }]); return this; }
  off(e: string, fn: (...a: unknown[]) => void) { this.map.set(e, (this.map.get(e) ?? []).filter((l) => l.fn !== fn)); return this; }
  emit(e: string, ...a: unknown[]) { for (const l of [...(this.map.get(e) ?? [])]) l.fn.call(l.ctx, ...a); }
  count() { return [...this.map.values()].reduce((n, l) => n + l.length, 0); }
}

interface Setup { outfit?: Outfit; found?: string[]; reduced?: boolean; readCat?: string; catId?: string; dye?: Record<string, string> }

function setup({ outfit = outfitOf(favorite, hated, loved), found = [], reduced = false, readCat, catId = 'naranja', dye = {} }: Setup = {}) {
  made.said.length = 0;
  made.chips.length = 0;
  let progress: Progress = { ...emptyProgress(100), tastesFound: found.length ? { [catId]: found } : {} };
  const registry = new Map<string, unknown>(readCat ? [[RegistryKeys.ReadCat, readCat]] : []);
  const events = new Emitter();
  const sounds: { key: string; volume?: number; rate?: number }[] = [];
  const calls: string[] = [];
  const delayed: { ms: number; fn: () => void; removed: boolean }[] = [];
  const marks: { x: number; y: number; text: string; tweens: Record<string, unknown>[] }[] = [];
  const tweens: Record<string, unknown>[] = [];
  const audio = {
    play: (key: string, o?: { volume?: number; rate?: number }) => (sounds.push({ key, volume: o?.volume, rate: o?.rate }), true),
    playRandom: (keys: string[], o?: { volume?: number; rate?: number }) => (sounds.push({ key: keys[0], volume: o?.volume, rate: o?.rate }), true),
  };
  const scene = {
    events,
    registry: {
      get: (k: string) => (k === RegistryKeys.Progress ? progress : k === RegistryKeys.ReducedMotion ? reduced : registry.get(k)),
      set: (k: string, v: unknown) => { if (k === RegistryKeys.Progress) progress = v as Progress; else registry.set(k, v); },
    },
    plugins: { get: (k: string) => (k === 'AudioPlugin' ? audio : { saved: { itemDye: dye } }) },
    time: { delayedCall: (ms: number, fn: () => void) => { const t = { ms, fn, removed: false, remove() { t.removed = true; } }; delayed.push(t); return t; } },
    tweens: { add: (cfg: Record<string, unknown>) => { tweens.push(cfg); return {}; } },
    add: {
      text: (x: number, y: number, text: string) => {
        const m = { x, y, text, tweens };
        marks.push(m);
        const self: Record<string, unknown> = { setOrigin: () => self, setDepth: () => self, setAlpha: () => self, setScale: () => self, destroy: () => {} };
        return self;
      },
      particles: () => ({ explode: () => calls.push('burst'), setDepth() { return this; }, destroy: () => {} }),
    },
  };
  const anchors: Record<string, { x: number; y: number }> = { torso: { x: 300, y: 400 }, neck: { x: 300, y: 300 }, head: { x: 300, y: 200 }, face: { x: 300, y: 230 }, paws: { x: 300, y: 500 }, tail: { x: 400, y: 450 } };
  const catFake = {
    sayNo: () => calls.push('sayNo'),
    glanceAt: () => calls.push('glance'),
    playFaces: (p: { expression: string }) => calls.push(`face:${p.expression}`),
    getAnchorWorld: (name: string) => anchors[name] ?? { x: 300, y: 300 },
  };
  const hearts = { explode: (n: number, x: number, y: number) => calls.push(`hearts:${n}@${x},${y}`) };
  const sparkles = { explode: (n: number) => calls.push(`sparkles:${n}`) };
  const ctx = {
    scene, catalog: { cats: catDefs, clothes: items, combos: [], economy: rules, dyes: [] }, cat: catFake, hearts, sparkles,
    sign: { x: 700, y: 92, setScale() { return this; } }, hud: { add: () => {} }, catId, getOutfit: () => outfit,
  } as never;
  const fx = new TasteReactions();
  fx.attach(ctx);
  const arrive = (id = catId) => events.emit(DressUpEvents.CatChanged, id);
  // Runs the pending timers in order of delay, including the ones they add.
  const run = (upTo = Infinity) => {
    for (let guard = 0; guard < 200; guard++) {
      const next = delayed.filter((d) => !d.removed && d.ms <= upTo).sort((a, b) => a.ms - b.ms)[0];
      if (!next) return;
      next.removed = true;
      next.fn();
    }
  };
  return { fx, events, arrive, run, delayed, calls, sounds, marks, tweens, progress: () => progress, registry, ctx };
}

describe('the new cat reads the look (F14.5)', () => {
  it('a cat that arrives with 3 pieces on reacts 3 times, in slot order', () => {
    const t = setup();
    t.arrive();
    t.run();
    expect(t.fx.e2eState().log).toEqual(['favorite', 'dislike', 'love']);
  });

  it('the reactions are 80 ms apart, like the pop of the layers', () => {
    const t = setup();
    t.arrive();
    const starts = t.delayed.map((d) => d.ms).filter((ms) => ms < 200).sort((a, b) => a - b);
    expect(starts).toEqual([0, 80, 160]);
  });

  it('each piece pops on its own garment: hearts for the loved, a cross for the disliked, sparkles for the favorite', () => {
    const t = setup();
    t.arrive();
    t.run();
    expect(t.calls.some((c) => c.startsWith('hearts:'))).toBe(true);
    expect(t.calls).toContain('burst');
    expect(t.marks.map((m) => m.text)).toEqual(['✕']);
    expect(t.sounds.length).toBeGreaterThanOrEqual(3);
    expect(t.sounds.every((s) => (s.volume ?? 1) <= 0.6)).toBe(true);
  });

  it('ends with the face of the whole look, and one bubble for the strongest', () => {
    const t = setup();
    t.arrive();
    t.run();
    expect(t.calls).toContain('face:amor');
    expect(made.said).toEqual(['¡MI FAVORITO!']);
  });

  it('a look the cat does not like ends with the puaj face (sayNo) and "mmm… no"', () => {
    const t = setup({ outfit: outfitOf(hated) });
    t.arrive();
    t.run();
    expect(t.calls).toContain('sayNo');
    expect(made.said).toEqual(['mmm… no']);
  });

  it('a neutral piece counts as a reaction but adds nothing to see or hear', () => {
    const t = setup({ outfit: outfitOf(neutral) });
    t.arrive();
    t.run();
    expect(t.fx.e2eState().log).toEqual(['neutral']);
    expect(t.calls).toEqual([]);
    expect(t.sounds).toEqual([]);
    expect(made.said).toEqual([]);
  });

  it('an empty look reads nothing', () => {
    const t = setup({ outfit: {} });
    t.arrive();
    expect(t.fx.e2eState().log).toEqual([]);
    expect(t.delayed).toHaveLength(0);
  });

  it('the dye on a piece counts', () => {
    const t = setup({ outfit: outfitOf(neutral), dye: { [neutral.id]: prefs.favoriteDye } });
    t.arrive();
    t.run();
    expect(t.fx.e2eState().log).toEqual(['color']);
  });

  it('only a new cat reads: the same cat coming back with its look does not', () => {
    const t = setup({ readCat: 'naranja' });
    t.arrive();
    expect(t.fx.e2eState().log).toEqual([]);
    expect(t.delayed).toHaveLength(0);
  });

  it('after reading, the cat is remembered as the one that read (and an empty look remembers it too)', () => {
    const t = setup();
    t.arrive();
    expect(t.registry.get(RegistryKeys.ReadCat)).toBe('naranja');
    const empty = setup({ outfit: {} });
    empty.arrive();
    expect(empty.registry.get(RegistryKeys.ReadCat)).toBe('naranja');
  });

  it('with reduced motion the cross does not move or turn, it only fades', () => {
    const calm = setup({ outfit: outfitOf(hated), reduced: true });
    calm.arrive();
    calm.run();
    expect(calm.tweens.filter((tw) => 'alpha' in tw && tw.alpha === 0).length).toBeGreaterThan(0);
    expect(calm.tweens.some((tw) => 'angle' in tw || 'scale' in tw || 'delay' in tw)).toBe(false);
    const full = setup({ outfit: outfitOf(hated) });
    full.arrive();
    full.run();
    expect(full.tweens.some((tw) => 'scale' in tw)).toBe(true);
  });

  it('it is not settled while the chain runs, and it is when it ends', () => {
    const t = setup();
    t.arrive();
    expect(t.fx.isSettled()).toBe(false);
    t.run();
    t.run();
    for (const chip of made.chips) chip.land?.();
    expect(t.fx.isSettled()).toBe(true);
  });

  it('closing the scene mid-chain leaves no timer behind', () => {
    const t = setup();
    t.arrive();
    t.fx.destroy();
    expect(t.delayed.filter((d) => !d.removed)).toHaveLength(0);
    expect(t.events.count()).toBe(0);
  });
});

describe('reading and discovering (F14.5)', () => {
  it('a taste that was never seen is discovered by the reading: one chip, paid when it lands', () => {
    const t = setup({ outfit: outfitOf(loved) });
    t.arrive();
    t.run();
    expect(made.chips).toHaveLength(1);
    made.chips[0].land?.();
    expect(t.progress().wallet).toBe(100 + rules.discoveryBonus);
  });

  it('a taste that was already found pays nothing and shows no chip', () => {
    const all = ['favorite', ...prefs.loves.map((l) => `love:${l}`), ...prefs.dislikes.map((d) => `dislike:${d}`)];
    const t = setup({ found: all });
    t.arrive();
    t.run();
    expect(made.chips).toHaveLength(0);
    expect(t.progress().wallet).toBe(100);
    expect(t.fx.e2eState().log).toEqual(['favorite', 'dislike', 'love']);
  });

  it('two pieces of the same taste give one chip', () => {
    const keyOf = (c: ClothingDef) => tasteKeyOf(tasteReaction(c, undefined, naranja));
    const lovers = items.filter((c) => c.id !== prefs.favoriteItem && keyOf(c)?.startsWith('love:'));
    const first = lovers[0];
    const twin = lovers.find((c) => c.slot !== first.slot && keyOf(c) === keyOf(first));
    expect(twin).toBeDefined();
    const t = setup({ outfit: outfitOf(first, twin!), found: ['favorite'] });
    t.arrive();
    t.run();
    expect(made.chips).toHaveLength(1);
  });

  it('the chips come one after another, not all at once', () => {
    const t = setup();
    t.arrive();
    const chipTimers = t.delayed.filter((d) => d.ms >= 160).map((d) => d.ms);
    t.run();
    expect(made.chips).toHaveLength(3);
    expect(new Set(made.chips.map((c) => c.at.x)).size).toBeGreaterThan(0);
    expect(chipTimers.length).toBeGreaterThan(0);
  });

  it('closing the scene before the chips come pays what was found, quietly', () => {
    const t = setup({ outfit: outfitOf(loved) });
    t.arrive();
    t.fx.destroy();
    expect(t.progress().wallet).toBe(100 + rules.discoveryBonus);
    expect(made.chips).toHaveLength(0);
  });
});
