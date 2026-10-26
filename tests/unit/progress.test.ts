import { describe, expect, it } from 'vitest';
import { defaultSave } from '../../src/game/plugins/saveCore';
import {
  applyDiscovery, applyRating, emptyProgress, emptyStoredProgress, progressFromSave, sanitizeStoredProgress, toStoredProgress, type ProgressCatalog,
} from '../../src/game/domain/progress';
import type { EconomyRules, KeychainRecipe, Progress, RatingResult, SaveData, Stars } from '../../src/game/domain/types';

const catalog: ProgressCatalog = {
  cats: [{ id: 'luna' }, { id: 'nube' }],
  clothes: [
    { id: 'sweater-a', slot: 'sweater', starter: true },
    { id: 'sweater-b', slot: 'sweater' },
    { id: 'head-b', slot: 'head' },
    { id: 'sweater-secret', slot: 'sweater', secret: true },
  ],
  combos: [{ id: 'navidad' }, { id: 'fresas' }],
};
const rules = { startWallet: 100 };

const recipe = (over: Partial<KeychainRecipe> = {}): KeychainRecipe => ({
  catId: 'luna', catName: 'Luna', outfit: { sweater: 'sweater-b' }, itemDye: { 'sweater-b': 'rosa' }, pose: 'sentada', stars: 4,
  photo: { background: 'bg-1', frame: 'frame-1', stickers: [{ id: 'st-1', x: 10, y: 20, angle: 5 }] }, createdAt: '2026-10-25T10:00:00.000Z',
  ...over,
});

const saveWith = (progress: unknown): SaveData => ({ ...defaultSave(), progress: progress as SaveData['progress'] });

describe('emptyProgress', () => {
  it('has the start wallet and nothing else', () => {
    expect(emptyProgress(100)).toEqual({ ...emptyStoredProgress(), wallet: 100 });
  });

  it('returns fresh containers', () => {
    expect(emptyProgress(1).owned).not.toBe(emptyProgress(1).owned);
  });
});

describe('progressFromSave (ADR 0017)', () => {
  it('a save without wallet gets the start wallet (a v1 save keeps its 100 coins)', () => {
    expect(progressFromSave(defaultSave(), catalog, rules).wallet).toBe(100);
  });

  it('keeps a valid wallet, 0 included, and replaces a broken one', () => {
    expect(progressFromSave(saveWith({ ...emptyStoredProgress(), wallet: 0 }), catalog, rules).wallet).toBe(0);
    expect(progressFromSave(saveWith({ ...emptyStoredProgress(), wallet: 35 }), catalog, rules).wallet).toBe(35);
    for (const bad of [-5, 1.5, Number.NaN]) {
      expect(progressFromSave(saveWith({ ...emptyStoredProgress(), wallet: bad }), catalog, rules).wallet).toBe(100);
    }
  });

  it('owned drops unknown ids, starters, secrets and repeats', () => {
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), owned: ['sweater-b', 'borrado', 'sweater-a', 'sweater-secret', 'head-b', 'sweater-b'] }), catalog, rules);
    expect(p.owned).toEqual(['sweater-b', 'head-b']);
  });

  it('secrets keep only combos that exist', () => {
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), secrets: ['navidad', 'fantasma', 'navidad'] }), catalog, rules);
    expect(p.secrets).toEqual(['navidad']);
  });

  it('per cat records drop cats that no longer exist', () => {
    const p = progressFromSave(saveWith({
      ...emptyStoredProgress(),
      tastesFound: { luna: ['favorite', 'favorite', 'color'], fantasma: ['favorite'] },
      bestStars: { luna: 3, fantasma: 5 },
      ratedLooks: { nube: ['a'], fantasma: ['b'] },
    }), catalog, rules);
    expect(p.tastesFound).toEqual({ luna: ['favorite', 'color'] });
    expect(p.bestStars).toEqual({ luna: 3 });
    expect(p.ratedLooks).toEqual({ nube: ['a'] });
  });

  it('keeps the last 3 signatures, newest last', () => {
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), ratedLooks: { luna: ['1', '2', '3', '4', '5'] } }), catalog, rules);
    expect(p.ratedLooks.luna).toEqual(['3', '4', '5']);
  });

  it('bounds the best stars to 1..5 and drops what is not a number', () => {
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), bestStars: { luna: 9, nube: 0 } }), catalog, rules);
    expect(p.bestStars).toEqual({ luna: 5, nube: 1 });
    expect(progressFromSave(saveWith({ ...emptyStoredProgress(), bestStars: { luna: 'x' } }), catalog, rules).bestStars).toEqual({});
  });

  it('keeps a valid keychain', () => {
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), keychains: { luna: recipe() } }), catalog, rules);
    expect(p.keychains).toEqual({ luna: recipe() });
  });

  it('drops invalid keychains: another cat, bad stars, missing fields, unknown cat', () => {
    const p = progressFromSave(saveWith({
      ...emptyStoredProgress(),
      keychains: {
        luna: recipe({ catId: 'nube' }),
        nube: recipe({ catId: 'nube', stars: 7 as never }),
        fantasma: recipe({ catId: 'fantasma' }),
      },
    }), catalog, rules);
    expect(p.keychains).toEqual({});
    for (const broken of [{ ...recipe(), pose: 3 }, { ...recipe(), photo: null }, { ...recipe(), photo: { ...recipe().photo, stickers: [{ id: 'x' }] } }, 'x', null]) {
      expect(progressFromSave(saveWith({ ...emptyStoredProgress(), keychains: { luna: broken } }), catalog, rules).keychains).toEqual({});
    }
  });

  it('cleans the outfit and dyes of a keychain against the catalog', () => {
    const p = progressFromSave(saveWith({
      ...emptyStoredProgress(), keychains: { luna: recipe({ outfit: { sweater: 'sweater-b', head: 'borrado' }, itemDye: { 'sweater-b': 'rosa', borrado: 'rojo' } }) },
    }), catalog, rules);
    expect(p.keychains.luna.outfit).toEqual({ sweater: 'sweater-b' });
    expect(p.keychains.luna.itemDye).toEqual({ 'sweater-b': 'rosa' });
  });

  it('dyes: with a dye catalog it drops unknown and starter bottles', () => {
    const dyes = [{ id: 'rosa', starter: true }, { id: 'rojo' }, { id: 'azul' }];
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), dyesOwned: ['rojo', 'rosa', 'fantasma', 'rojo'] }), { ...catalog, dyes }, rules);
    expect(p.dyesOwned).toEqual(['rojo']);
  });

  it('dyes: without a dye catalog the purchases are kept as they are', () => {
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), dyesOwned: ['rojo'] }), catalog, rules);
    expect(p.dyesOwned).toEqual(['rojo']);
  });

  it('albumSeen drops repeats', () => {
    const p = progressFromSave(saveWith({ ...emptyStoredProgress(), albumSeen: ['a', 'b', 'a'] }), catalog, rules);
    expect(p.albumSeen).toEqual(['a', 'b']);
  });

  it('does not mutate the save', () => {
    const save = saveWith({ ...emptyStoredProgress(), owned: ['sweater-b', 'sweater-a'] });
    const before = JSON.stringify(save);
    progressFromSave(save, catalog, rules);
    expect(JSON.stringify(save)).toBe(before);
  });
});

describe('sanitizeStoredProgress / toStoredProgress', () => {
  it('round trips a stored progress', () => {
    const stored = { ...emptyStoredProgress(), wallet: 12, owned: ['a'], bestStars: { luna: 2 as const } };
    expect(sanitizeStoredProgress(stored)).toEqual(stored);
  });

  it('toStoredProgress copies the containers', () => {
    const p = emptyProgress(5);
    const stored = toStoredProgress(p);
    expect(stored).toEqual(p);
    expect(stored.owned).not.toBe(p.owned);
  });
});

describe('applyRating (F13.2)', () => {
  const eco = {
    startWallet: 100,
    payout: { byStars: { 1: 5, 2: 10, 3: 18, 4: 28, 5: 40 }, nearFactor: 0.5, tip: 2 },
    milestones: { threeStars: 15, fourStars: 25, fiveStars: 50 },
    novelty: { window: 3 },
    discoveryBonus: 15,
    comboBonus: 40,
  } as unknown as EconomyRules;
  const result = (stars: Stars): RatingResult => ({ points: 10, stars, breakdown: [] });
  const start = (over: Partial<Progress> = {}): Progress => ({ ...emptyProgress(100), ...over });
  const look = (signature: string, catId = 'luna') => ({ catId, signature });

  it('pays the new look, records the stars and the signature, in a stable order', () => {
    const { progress, events } = applyRating(start(), result(4), eco, look('sweater:a'));
    expect(events).toEqual([
      { type: 'coins', amount: 28 },
      { type: 'milestone', stars: 3, amount: 15 },
      { type: 'milestone', stars: 4, amount: 25 },
    ]);
    expect(progress.wallet).toBe(100 + 28 + 15 + 25);
    expect(progress.bestStars.luna).toBe(4);
    expect(progress.ratedLooks.luna).toEqual(['sweater:a']);
  });

  it('pays only a tip for the same look rated twice and no milestone again', () => {
    const first = applyRating(start(), result(3), eco, look('sweater:a')).progress;
    const second = applyRating(first, result(3), eco, look('sweater:a'));
    expect(second.events).toEqual([{ type: 'coins', amount: 2 }]);
    expect(second.progress.wallet).toBe(first.wallet + 2);
  });

  it('pays a fraction when only one slot changed', () => {
    const first = applyRating(start(), result(2), eco, look('sweater:a|head:b')).progress;
    expect(applyRating(first, result(2), eco, look('sweater:a|head:c')).events).toEqual([{ type: 'coins', amount: 5 }]);
  });

  it('keeps the best stars and only the last signatures', () => {
    let p = start({ bestStars: { luna: 5 } });
    for (const s of ['a', 'b', 'c', 'd']) p = applyRating(p, result(1), eco, look(`sweater:${s}`)).progress;
    expect(p.bestStars.luna).toBe(5);
    expect(p.ratedLooks.luna).toEqual(['sweater:b', 'sweater:c', 'sweater:d']);
  });

  it('never changes the input and never touches other cats', () => {
    const input = start({ bestStars: { nube: 2 }, ratedLooks: { nube: ['x:y'] } });
    const copy = structuredClone(input);
    const { progress } = applyRating(input, result(3), eco, look('sweater:a'));
    expect(input).toEqual(copy);
    expect(progress.bestStars.nube).toBe(2);
    expect(progress.ratedLooks.nube).toEqual(['x:y']);
  });
});

describe('applyDiscovery (F13.2)', () => {
  const eco = { discoveryBonus: 15, comboBonus: 40 } as unknown as EconomyRules;

  it('pays a taste once per cat', () => {
    const first = applyDiscovery(emptyProgress(100), 'taste', 'love:wool', eco, 'luna');
    expect(first.events).toEqual([{ type: 'tasteFound', taste: 'love:wool', amount: 15 }]);
    expect(first.progress.wallet).toBe(115);
    expect(first.progress.tastesFound.luna).toEqual(['love:wool']);
    const again = applyDiscovery(first.progress, 'taste', 'love:wool', eco, 'luna');
    expect(again.events).toEqual([]);
    expect(again.progress).toBe(first.progress);
    expect(applyDiscovery(first.progress, 'taste', 'love:wool', eco, 'nube').events).toHaveLength(1);
  });

  it('pays the first combo once and remembers it as a secret', () => {
    const first = applyDiscovery(emptyProgress(100), 'combo', 'navidad', eco);
    expect(first.events).toEqual([{ type: 'comboFirst', comboId: 'navidad', amount: 40 }]);
    expect(first.progress.wallet).toBe(140);
    expect(first.progress.secrets).toEqual(['navidad']);
    expect(applyDiscovery(first.progress, 'combo', 'navidad', eco).events).toEqual([]);
  });

  it('does not change the input', () => {
    const input = emptyProgress(100);
    const copy = structuredClone(input);
    applyDiscovery(input, 'combo', 'navidad', eco);
    applyDiscovery(input, 'taste', 'favorite', eco, 'luna');
    expect(input).toEqual(copy);
  });
});
