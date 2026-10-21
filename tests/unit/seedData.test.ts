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

  it('keeps the 3 F1 sample cats first (the full F3 cast is in cats.test.ts)', () => {
    expect(cats.slice(0, 3).map((c) => [c.id, c.name])).toEqual([
      ['naranja', 'Naranjito'], ['negro', 'Luna'], ['calico', 'Tricolor'],
    ]);
  });

  it('starts with no combos', () => {
    expect(combos).toEqual([]);
  });
});
