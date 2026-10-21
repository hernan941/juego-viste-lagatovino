import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import { assertCatalog, validateCatalog } from '../../src/game/data/schema';

describe('seed catalog (F2)', () => {
  it('passes the schema', () => {
    const r = validateCatalog({ cats, clothes, combos });
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(() => assertCatalog({ cats, clothes, combos })).not.toThrow();
  });

  it('has the 3 sample cats from art-direction.md', () => {
    expect(cats.map((c) => [c.id, c.name])).toEqual([
      ['naranja', 'Naranjito'], ['negro', 'Luna'], ['calico', 'Tricolor'],
    ]);
  });

  it('has 6 clothes in 2 categories, sweaters and head', () => {
    expect(clothes).toHaveLength(6);
    expect(new Set(clothes.map((c) => c.category))).toEqual(new Set(['sweater', 'head']));
    const ids = clothes.map((c) => c.id);
    expect(ids).toContain('sweater-rayas');
    expect(ids).toContain('sweater-navideno');
    expect(ids).toContain('head-beanie-pompon');
    expect(ids).toContain('head-boina');
  });

  it('starts with no combos', () => {
    expect(combos).toEqual([]);
  });
});
