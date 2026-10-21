import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY, defaultSave, deserialize, loadSave, saveToStorage, serialize, type StorageLike,
} from '../../src/game/plugins/saveCore';
import { SAVE_VERSION, type SaveData } from '../../src/game/domain/types';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const sample: SaveData = {
  version: SAVE_VERSION, catId: 'luna', catName: 'Luna',
  outfit: { sweater: 'sweater-rayas', head: 'head-boina' }, secrets: ['navidad'], muted: true, motion: 'reduce',
};

describe('defaultSave', () => {
  it('is empty, unmuted, on automatic motion and current version', () => {
    expect(defaultSave()).toEqual({ version: SAVE_VERSION, catId: null, catName: '', outfit: {}, secrets: [], muted: false, motion: 'auto' });
  });

  it('returns a fresh object each time', () => {
    expect(defaultSave()).not.toBe(defaultSave());
    expect(defaultSave().secrets).not.toBe(defaultSave().secrets);
  });
});

describe('motion preference (ADR 0013, no migration)', () => {
  it('a save without the field (every v1 save so far) reads as auto', () => {
    const old: Record<string, unknown> = { ...sample };
    delete old.motion;
    expect(deserialize(JSON.stringify(old)).motion).toBe('auto');
  });

  it('keeps reduce and full, and reads anything else as auto', () => {
    expect(deserialize(JSON.stringify({ ...sample, motion: 'full' })).motion).toBe('full');
    expect(deserialize(JSON.stringify({ ...sample, motion: 'reduce' })).motion).toBe('reduce');
    for (const bad of ['none', '', 3, null, true, ['reduce']]) expect(deserialize(JSON.stringify({ ...sample, motion: bad })).motion).toBe('auto');
  });

  it('does not bump the save version', () => {
    expect(SAVE_VERSION).toBe(1);
  });
});

describe('serialize / deserialize', () => {
  it('round trips cat, name, outfit, secrets and mute', () => {
    expect(deserialize(serialize(sample))).toEqual(sample);
  });

  it('returns defaults for null, empty and corrupt input', () => {
    for (const raw of [null, '', '{not json', 'null', '42', '[]', '"x"']) {
      expect(deserialize(raw)).toEqual(defaultSave());
    }
  });

  it('keeps valid fields and defaults the broken ones', () => {
    const raw = JSON.stringify({ version: 1, catId: 7, catName: 'Luna', outfit: 'x', secrets: [1, 'a'], muted: 'yes' });
    expect(deserialize(raw)).toEqual({ ...defaultSave(), catName: 'Luna', secrets: ['a'] });
  });

  it('drops outfit entries with unknown slots or non text ids', () => {
    const raw = JSON.stringify({ ...sample, outfit: { sweater: 'a', tail: 'b', head: 3 } });
    expect(deserialize(raw).outfit).toEqual({ sweater: 'a' });
  });

  it('migrates a version 0 save (cat/name/mute keys)', () => {
    const raw = JSON.stringify({ version: 0, cat: 'luna', name: 'Luna', outfit: { head: 'head-boina' }, secrets: ['x'], mute: true });
    expect(deserialize(raw)).toEqual({
      version: SAVE_VERSION, catId: 'luna', catName: 'Luna', outfit: { head: 'head-boina' }, secrets: ['x'], muted: true, motion: 'auto',
    });
  });

  it('treats a save without version as version 0', () => {
    expect(deserialize(JSON.stringify({ cat: 'luna', name: 'Luna' })).catId).toBe('luna');
  });

  it('falls back to defaults for a save from the future', () => {
    expect(deserialize(JSON.stringify({ ...sample, version: SAVE_VERSION + 1 }))).toEqual(defaultSave());
  });
});

describe('storage helpers', () => {
  it('saves under the versioned key and loads it back', () => {
    const s = new MemoryStorage();
    expect(saveToStorage(s, sample)).toBe(true);
    expect(s.data.has(SAVE_KEY)).toBe(true);
    expect(SAVE_KEY).toBe('viste-lagato:save:v1');
    expect(loadSave(s)).toEqual(sample);
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
