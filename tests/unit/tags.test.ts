import { describe, expect, it } from 'vitest';
import clothes from '../../src/game/data/clothes.json';
import economy from '../../src/game/data/economy.json';
import tags from '../../src/game/data/tags.json';
import { validateTags } from '../../src/game/data/schema';
import { tagLabel, tagLove, tagStyle } from '../../src/game/domain/copy';
import type { ClothingDef, TagNames } from '../../src/game/domain/types';

const names = tags as TagNames;
const used = [...new Set((clothes as unknown as ClothingDef[]).flatMap((c) => c.tags))].filter((t) => !economy.scoring.ignoredTags.includes(t));
const errorsOf = (r: { ok: boolean; errors?: string[] }): string => (r.ok ? '' : (r.errors ?? []).join('\n'));

describe('tags.json (F15.6)', () => {
  it('names the 33 tags the clothes use, with the three forms', () => {
    expect(used).toHaveLength(33);
    for (const t of used) {
      expect(names[t], t).toBeDefined();
      for (const form of ['label', 'love', 'style'] as const) expect(names[t]![form].length, `${t}.${form}`).toBeGreaterThan(1);
    }
  });
  it('passes the validation against the real clothes', () => {
    expect(errorsOf(validateTags(tags, clothes as never, economy.scoring.ignoredTags))).toBe('');
  });
});

describe('validateTags', () => {
  const full = { lana: { label: 'lana', love: 'la lana', style: 'Todo de lana' } };
  const cloth = [{ id: 'a', tags: ['lana', 'secreto'] }] as never;
  it('accepts a complete map and skips the ignored tags', () => {
    expect(validateTags(full, cloth, ['secreto']).ok).toBe(true);
  });
  it('fails when a tag in use has no entry, naming it', () => {
    expect(errorsOf(validateTags({}, cloth, ['secreto']))).toContain('tags.lana: falta el nombre');
  });
  it('wants the three forms as text', () => {
    const msg = errorsOf(validateTags({ lana: { label: '', love: 'la lana' } }, cloth, ['secreto']));
    expect(msg).toContain('tags.lana.label');
    expect(msg).toContain('tags.lana.style');
  });
  it('rejects non objects', () => {
    expect(errorsOf(validateTags([], cloth, []))).toContain('tags: debe ser un objeto');
  });
});

describe('tag copy helpers', () => {
  it('give the readable form and fall back to the id', () => {
    expect(tagLabel(names, 'clasico')).toBe('clásico');
    expect(tagLove(names, 'invierno')).toBe('el invierno');
    expect(tagStyle(names, 'gala')).toBe('Todo de gala');
    expect(tagLabel(undefined, 'raro')).toBe('raro');
    expect(tagLove({}, 'raro')).toBe('raro');
  });
});
