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

import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import { DressUpEvents } from '../../src/game/constants';
import type { CatDef, ClothingDef } from '../../src/game/domain/types';
import { TasteReactions } from '../../src/game/objects/dressup/TasteReactions';
import * as bubbleModule from '../../src/game/objects/kit/SpeechBubble';

const said = (bubbleModule as unknown as { made: string[] }).made;
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

function setup({ reduced = false, dye = {} }: { reduced?: boolean; dye?: Record<string, string> } = {}) {
  const events = new Emitter();
  const sounds: { key: string; rate?: number }[] = [];
  const calls: string[] = [];
  const audio = {
    play: (key: string, o?: { rate?: number }) => (sounds.push({ key, rate: o?.rate }), true),
    playRandom: (keys: string[], o?: { rate?: number }) => (sounds.push({ key: keys[0], rate: o?.rate }), true),
  };
  const scene = {
    events,
    registry: { get: () => reduced },
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
    scene, catalog: { cats: catDefs, clothes: items, combos: [] }, cat: catFake, hearts, sparkles: hearts,
    hud: { add: () => {} }, catId: 'naranja', getOutfit: () => ({}),
  } as never;
  const fx = new TasteReactions();
  fx.attach(ctx);
  const drop = (item: ClothingDef) => {
    events.emit(DressUpEvents.OutfitChanged, { [item.slot]: item.id }, 'drop');
    events.emit(DressUpEvents.ItemDropped, item);
  };
  return { fx, events, drop, sounds, calls };
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
