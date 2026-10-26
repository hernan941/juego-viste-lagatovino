import { describe, expect, it } from 'vitest';
import { defaultSave } from '../../src/game/plugins/saveCore';
import {
  emptyProgress, emptyStoredProgress, progressFromSave, sanitizeStoredProgress, toStoredProgress, type ProgressCatalog,
} from '../../src/game/domain/progress';
import type { KeychainRecipe, SaveData } from '../../src/game/domain/types';

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
