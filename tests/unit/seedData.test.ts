import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import { comboOutfit, findCompletedCombos } from '../../src/game/domain/combos';
import type { ClothingDef, ComboDef } from '../../src/game/domain/types';
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

  it('has the 6 F8 combos with their prizes (docs/game-design.md, "Combos de F8")', () => {
    expect(combos.map((c) => [c.id, c.rewardItemId, c.reaction])).toEqual([
      ['galactico', 'accessory-varita-estrella', 'stars-orbit'],
      ['navidad', 'sweater-dorado-estrella', 'snowfall'],
      ['fresas', 'head-corona-flores', 'petals'],
      ['realeza', 'neck-capa-superheroe', 'royal-pose'],
      ['enamorado', 'face-lentes-corazon-brillantes', 'heartbeat'],
      ['arcoiris', 'neck-bufanda-arcoiris', 'rainbow-arc'],
    ]);
  });

  it('gives every secret item to exactly one combo', () => {
    const secrets = (clothes as ClothingDef[]).filter((c) => c.secret).map((c) => c.id).sort();
    expect(combos.map((c) => c.rewardItemId).sort()).toEqual(secrets);
  });

  it.each(combos.map((c) => [c.id, c] as const))('combo %s can be completed with visible items, and only it', (_id, combo) => {
    const outfit = comboOutfit(combo as ComboDef, clothes as ClothingDef[]);
    expect(outfit).not.toBeNull();
    const worn = Object.values(outfit!).map((id) => (clothes as ClothingDef[]).find((c) => c.id === id)!);
    expect(worn.every((c) => !c.secret)).toBe(true);
    expect(findCompletedCombos(outfit!, combos as ComboDef[], clothes as ClothingDef[]).map((c) => c.id)).toContain(combo.id);
  });

  it('no combo asks for a secret item', () => {
    const secretIds = new Set((clothes as ClothingDef[]).filter((c) => c.secret).map((c) => c.id));
    for (const c of combos) for (const r of c.requires) if ('itemId' in r) expect(secretIds.has(r.itemId)).toBe(false);
  });
});
