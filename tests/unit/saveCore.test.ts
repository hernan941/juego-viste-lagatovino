import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY, defaultSave, deserialize, loadSave, saveToStorage, serialize, type StorageLike,
} from '../../src/game/plugins/saveCore';
import { emptyStoredProgress } from '../../src/game/domain/progress';
import { SAVE_VERSION, type SaveData } from '../../src/game/domain/types';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const sample: SaveData = {
  version: SAVE_VERSION, catId: 'luna', catName: 'Luna',
  outfit: { sweater: 'sweater-rayas', head: 'head-boina' }, itemDye: { 'sweater-rayas': 'rosa' },
  muted: true, motion: 'reduce',
  progress: { ...emptyStoredProgress(), wallet: 70, owned: ['sweater-rayas'], secrets: ['navidad'], bestStars: { luna: 4 } },
};

describe('defaultSave', () => {
  it('is empty, unmuted, on automatic motion and current version', () => {
    expect(defaultSave()).toEqual({
      version: SAVE_VERSION, catId: null, catName: '', outfit: {}, itemDye: {}, muted: false, motion: 'auto', progress: emptyStoredProgress(),
    });
  });

  it('returns a fresh object each time', () => {
    expect(defaultSave()).not.toBe(defaultSave());
    expect(defaultSave().progress.secrets).not.toBe(defaultSave().progress.secrets);
  });
});

describe('motion preference (ADR 0013, no migration)', () => {
  it('a save without the field reads as auto', () => {
    const old: Record<string, unknown> = { ...sample };
    delete old.motion;
    expect(deserialize(JSON.stringify(old)).motion).toBe('auto');
  });

  it('keeps reduce and full, and reads anything else as auto', () => {
    expect(deserialize(JSON.stringify({ ...sample, motion: 'full' })).motion).toBe('full');
    expect(deserialize(JSON.stringify({ ...sample, motion: 'reduce' })).motion).toBe('reduce');
    for (const bad of ['none', '', 3, null, true, ['reduce']]) expect(deserialize(JSON.stringify({ ...sample, motion: bad })).motion).toBe('auto');
  });

  it('the save is version 2 (ADR 0017)', () => {
    expect(SAVE_VERSION).toBe(2);
  });
});

describe('serialize / deserialize', () => {
  it('round trips cat, name, outfit, dyes, mute, motion and progress', () => {
    expect(deserialize(serialize(sample))).toEqual(sample);
  });

  it('returns defaults for null, empty and corrupt input', () => {
    for (const raw of [null, '', '{not json', 'null', '42', '[]', '"x"']) {
      expect(deserialize(raw)).toEqual(defaultSave());
    }
  });

  it('keeps valid fields and defaults the broken ones', () => {
    const raw = JSON.stringify({
      version: 2, catId: 7, catName: 'Luna', outfit: 'x', itemDye: [], muted: 'yes', progress: { secrets: [1, 'a'], wallet: -3, owned: 'x' },
    });
    expect(deserialize(raw)).toEqual({ ...defaultSave(), catName: 'Luna', progress: { ...emptyStoredProgress(), secrets: ['a'] } });
  });

  it('drops outfit entries with unknown slots or non text ids', () => {
    const raw = JSON.stringify({ ...sample, outfit: { sweater: 'a', tail: 'b', head: 3 } });
    expect(deserialize(raw).outfit).toEqual({ sweater: 'a' });
  });

  it('migrates a version 0 save (cat/name/mute keys) all the way to v2', () => {
    const raw = JSON.stringify({ version: 0, cat: 'luna', name: 'Luna', outfit: { head: 'head-boina' }, secrets: ['x'], mute: true });
    expect(deserialize(raw)).toEqual({
      version: SAVE_VERSION, catId: 'luna', catName: 'Luna', outfit: { head: 'head-boina' }, itemDye: {}, muted: true, motion: 'auto',
      progress: { ...emptyStoredProgress(), owned: ['head-boina'], secrets: ['x'] },
    });
  });

  it('treats a save without version as version 0', () => {
    expect(deserialize(JSON.stringify({ cat: 'luna', name: 'Luna' })).catId).toBe('luna');
  });

  it('falls back to defaults for a save from the future', () => {
    expect(deserialize(JSON.stringify({ ...sample, version: SAVE_VERSION + 1 }))).toEqual(defaultSave());
  });
});

describe('migration v1 -> v2 (ADR 0017)', () => {
  const v1 = {
    version: 1, catId: 'luna', catName: 'Luna', outfit: { sweater: 'sweater-rayas', head: 'head-boina' },
    secrets: ['navidad'], muted: true, motion: 'reduce',
  };

  it('keeps the session and preferences, moves the secrets into the progress and keeps what was worn as owned', () => {
    expect(deserialize(JSON.stringify(v1))).toEqual({
      version: 2, catId: 'luna', catName: 'Luna', outfit: v1.outfit, itemDye: {}, muted: true, motion: 'reduce',
      progress: { ...emptyStoredProgress(), owned: ['sweater-rayas', 'head-boina'], secrets: ['navidad'] },
    });
  });

  it('leaves the wallet out, so the domain gives the start wallet', () => {
    expect('wallet' in deserialize(JSON.stringify(v1)).progress).toBe(false);
  });

  it('migrates a v1 save with a broken outfit without throwing', () => {
    const save = deserialize(JSON.stringify({ ...v1, outfit: { sweater: 'a', tail: 'b', head: 3 }, secrets: 'x' }));
    expect(save.outfit).toEqual({ sweater: 'a' });
    expect(save.progress).toEqual({ ...emptyStoredProgress(), owned: ['a'] });
  });

  it('migrates a v1 save with no outfit or secrets', () => {
    expect(deserialize(JSON.stringify({ version: 1, catId: 'luna' })).progress).toEqual(emptyStoredProgress());
  });
});

describe('progress sanitizing', () => {
  const read = (progress: unknown) => deserialize(JSON.stringify({ ...sample, progress })).progress;

  it('a missing or non object progress is the empty one', () => {
    for (const bad of [undefined, null, 4, 'x', []]) expect(read(bad)).toEqual(emptyStoredProgress());
  });

  it('keeps only text ids in the lists and drops the broken records', () => {
    const p = read({
      owned: ['a', 3, 'a'], dyesOwned: [null, 'rojo'], albumSeen: 'x',
      tastesFound: { luna: ['love:lana', 4], nube: 'x' }, bestStars: { luna: 5, nube: 'x' },
      ratedLooks: { luna: ['s1', 2], nube: 7 }, keychains: { luna: 'no', nube: 3 },
    });
    expect(p).toEqual({
      ...emptyStoredProgress(), owned: ['a', 'a'], dyesOwned: ['rojo'],
      tastesFound: { luna: ['love:lana'] }, bestStars: { luna: 5 }, ratedLooks: { luna: ['s1'] },
    });
  });

  it('keeps a valid wallet and drops a negative, fractional or non numeric one', () => {
    expect(read({ wallet: 0 }).wallet).toBe(0);
    expect(read({ wallet: 120 }).wallet).toBe(120);
    for (const bad of [-1, 2.5, '3', null, Number.NaN]) expect('wallet' in read({ wallet: bad })).toBe(false);
  });

  it('itemDye keeps text pairs only', () => {
    const save = deserialize(JSON.stringify({ ...sample, itemDye: { a: 'rosa', b: 3 } }));
    expect(save.itemDye).toEqual({ a: 'rosa' });
    expect(deserialize(JSON.stringify({ ...sample, itemDye: 'x' })).itemDye).toEqual({});
  });
});

describe('storage helpers', () => {
  it('saves under the fixed key (the version lives inside the JSON) and loads it back', () => {
    const s = new MemoryStorage();
    expect(saveToStorage(s, sample)).toBe(true);
    expect(s.data.has(SAVE_KEY)).toBe(true);
    expect(SAVE_KEY).toBe('viste-lagato:save:v1');
    expect(loadSave(s)).toEqual(sample);
  });

  it('a stored v1 save under the same key is migrated on load', () => {
    const s = new MemoryStorage();
    s.setItem(SAVE_KEY, JSON.stringify({ version: 1, catId: 'luna', catName: 'Luna', outfit: {}, secrets: ['x'], muted: false, motion: 'auto' }));
    expect(loadSave(s)).toMatchObject({ version: 2, catId: 'luna', progress: { secrets: ['x'] } });
  });

  it('loads defaults from an empty storage', () => {
    expect(loadSave(new MemoryStorage())).toEqual(defaultSave());
  });

  it('survives a storage that throws', () => {
    const boom: StorageLike = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('denied'); },
    };
    expect(loadSave(boom)).toEqual(defaultSave());
    expect(saveToStorage(boom, sample)).toBe(false);
  });
});
