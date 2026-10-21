import { describe, expect, it } from 'vitest';
import { RegistryKeys } from '../../src/game/constants';
import { chooseCat, emptySession, isComplete, sessionFromSave, toSaveData, withOutfit } from '../../src/game/domain/session';
import { defaultSave } from '../../src/game/plugins/saveCore';
import { readSession, writeSession, type RegistryLike } from '../../src/game/systems/sessionStore';

class FakeRegistry implements RegistryLike {
  data = new Map<string, unknown>();
  get(key: string) { return this.data.get(key); }
  set(key: string, value: unknown) { this.data.set(key, value); }
}

describe('session state', () => {
  it('starts without a cat, a name or an outfit', () => {
    expect(emptySession()).toEqual({ catId: null, catName: '', outfit: {} });
    expect(isComplete(emptySession())).toBe(false);
  });

  it('choosing a cat sets the id and the trimmed name', () => {
    const s = chooseCat(emptySession(), 'luna', '  Luna ');
    expect(s).toEqual({ catId: 'luna', catName: 'Luna', outfit: {} });
    expect(isComplete(s)).toBe(true);
  });

  it('choosing another cat clears the outfit, choosing the same one keeps it', () => {
    const dressed = withOutfit(chooseCat(emptySession(), 'a', 'A'), { sweater: 's1' });
    expect(chooseCat(dressed, 'b', 'B').outfit).toEqual({});
    expect(chooseCat(dressed, 'a', 'Nuevo').outfit).toEqual({ sweater: 's1' });
  });

  it('refuses an invalid name by keeping the previous session', () => {
    const s = chooseCat(emptySession(), 'a', 'A');
    expect(chooseCat(s, 'b', '   ')).toBe(s);
  });

  it('does not mutate the previous session', () => {
    const s = chooseCat(emptySession(), 'a', 'A');
    const d = withOutfit(s, { head: 'h' });
    expect(s.outfit).toEqual({});
    expect(d.outfit).toEqual({ head: 'h' });
  });

  it('merges into the save without losing the mute or the secrets', () => {
    const base = { ...defaultSave(), muted: true, secrets: ['x'] };
    const s = withOutfit(chooseCat(emptySession(), 'a', 'A'), { head: 'h' });
    expect(toSaveData(s, base)).toEqual({ ...base, catId: 'a', catName: 'A', outfit: { head: 'h' } });
  });
});

describe('session store (registry)', () => {
  it('writes and reads the session through the registry keys', () => {
    const reg = new FakeRegistry();
    writeSession(reg, withOutfit(chooseCat(emptySession(), 'a', 'A'), { head: 'h' }));
    expect(reg.get(RegistryKeys.CatId)).toBe('a');
    expect(reg.get(RegistryKeys.CatName)).toBe('A');
    expect(readSession(reg)).toEqual({ catId: 'a', catName: 'A', outfit: { head: 'h' } });
  });

  it('reads an empty registry as an empty session', () => {
    expect(readSession(new FakeRegistry())).toEqual(emptySession());
  });

  it('ignores values of the wrong type', () => {
    const reg = new FakeRegistry();
    reg.set(RegistryKeys.CatId, 42);
    reg.set(RegistryKeys.CatName, null);
    reg.set(RegistryKeys.Outfit, 'x');
    expect(readSession(reg)).toEqual(emptySession());
  });
});

describe('sessionFromSave (restoring a save against the catalog)', () => {
  const cats = [{ id: 'luna', name: 'Luna' }, { id: 'nube', name: 'Nube' }];
  const clothes = [
    { id: 'sweater-a', slot: 'sweater' as const },
    { id: 'head-b', slot: 'head' as const },
  ];
  const save = (over: Partial<ReturnType<typeof defaultSave>>) => ({ ...defaultSave(), ...over });

  it('restores the cat, the name and the outfit', () => {
    const s = sessionFromSave(save({ catId: 'luna', catName: 'Mimi', outfit: { sweater: 'sweater-a', head: 'head-b' } }), cats, clothes);
    expect(s).toEqual({ catId: 'luna', catName: 'Mimi', outfit: { sweater: 'sweater-a', head: 'head-b' } });
  });

  it('starts clean when there is no cat or the cat no longer exists', () => {
    expect(sessionFromSave(save({}), cats, clothes)).toEqual(emptySession());
    expect(sessionFromSave(save({ catId: 'fantasma', catName: 'X' }), cats, clothes)).toEqual(emptySession());
  });

  it('falls back to the default name of the cat when the saved name is invalid', () => {
    expect(sessionFromSave(save({ catId: 'nube', catName: '   ' }), cats, clothes).catName).toBe('Nube');
    expect(sessionFromSave(save({ catId: 'nube', catName: 'x'.repeat(40) }), cats, clothes).catName).toBe('Nube');
  });

  it('drops items that are not in the catalog or sit in the wrong slot', () => {
    const s = sessionFromSave(save({ catId: 'luna', catName: 'L', outfit: { sweater: 'borrado', head: 'sweater-a' } }), cats, clothes);
    expect(s.outfit).toEqual({});
  });
});
