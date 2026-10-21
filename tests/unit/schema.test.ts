import { describe, expect, it } from 'vitest';
import {
  CatalogError, assertCatalog, validateCats, validateCatalog, validateClothes, validateCombos,
} from '../../src/game/data/schema';

const cat = { id: 'naranja', name: 'Naranjito', coat: 'Atigrado naranja', texture: 'cat-naranja' };
const cloth = (over: Record<string, unknown> = {}) => ({
  id: 'sweater-rayas', name: 'Rayas', slot: 'sweater', category: 'sweater',
  texture: 'sweater-rayas', icon: 'sweater-rayas-icon', tags: ['lana'], ...over,
});
const secret = cloth({ id: 'gift-hat', slot: 'head', category: 'head', secret: true });
const combo = (over: Record<string, unknown> = {}) => ({
  id: 'navidad', name: 'Look Navidad', reaction: 'snowfall', rewardItemId: 'gift-hat',
  requires: [{ itemId: 'sweater-rayas' }, { slot: 'sweater', tag: 'lana' }], ...over,
});

function errorsOf(r: { ok: boolean; errors?: string[] }): string {
  return r.ok ? '' : (r.errors ?? []).join('\n');
}

describe('validateCombos (F8)', () => {
  it('rejects a reaction the scene does not know', () => {
    expect(errorsOf(validateCombos([combo({ reaction: 'dance' })], [cloth(), secret]))).toContain('combos[0].reaction: "dance" no existe');
  });

  it('rejects requirements that are secret items', () => {
    const msg = errorsOf(validateCombos([combo({ requires: [{ itemId: 'gift-hat' }] })], [cloth(), secret]));
    expect(msg).toContain('combos[0].requires[0]: "gift-hat" es secreta');
  });

  it('rejects a combo that no visible outfit can complete', () => {
    const msg = errorsOf(validateCombos([combo({ requires: [{ slot: 'neck', tag: 'nada' }] })], [cloth(), secret]));
    expect(msg).toContain('combos[0].requires: ninguna combinación de prendas visibles lo completa');
  });
});

describe('validateCats', () => {
  it('accepts a valid list', () => {
    expect(validateCats([cat])).toEqual({ ok: true, value: [cat] });
  });

  it('rejects non arrays', () => {
    expect(errorsOf(validateCats({}))).toContain('cats: debe ser un arreglo');
  });

  it('reports missing or wrongly typed fields with the entry path', () => {
    const msg = errorsOf(validateCats([{ id: 'x', name: 3 }]));
    expect(msg).toContain('cats[0].name: debe ser texto');
    expect(msg).toContain('cats[0].coat: debe ser texto');
    expect(msg).toContain('cats[0].texture: debe ser texto');
  });

  it('rejects entries that are not objects', () => {
    expect(errorsOf(validateCats([null]))).toContain('cats[0]: debe ser un objeto');
  });

  it('rejects duplicated ids', () => {
    expect(errorsOf(validateCats([cat, cat]))).toContain('cats[1].id: "naranja" está repetido');
  });
});

describe('validateClothes', () => {
  it('accepts valid items, with optional offset and secret', () => {
    const items = [cloth({ offset: { x: 1, y: -2 } }), secret];
    expect(validateClothes(items)).toEqual({ ok: true, value: items });
  });

  it('rejects an unknown slot and an unknown category', () => {
    const msg = errorsOf(validateClothes([cloth({ slot: 'tail', category: 'capes' })]));
    expect(msg).toContain('clothes[0].slot: "tail" no existe');
    expect(msg).toContain('clothes[0].category: "capes" no existe');
  });

  it('rejects duplicated ids', () => {
    expect(errorsOf(validateClothes([cloth(), cloth()]))).toContain('clothes[1].id: "sweater-rayas" está repetido');
  });

  it('validates tags, offset and secret types', () => {
    const msg = errorsOf(validateClothes([cloth({ tags: 'lana', offset: { x: 'a', y: 1 }, secret: 'si' })]));
    expect(msg).toContain('clothes[0].tags: debe ser una lista de textos');
    expect(msg).toContain('clothes[0].offset: debe tener x e y numéricos');
    expect(msg).toContain('clothes[0].secret: debe ser true o false');
  });

  it('rejects non arrays and non objects', () => {
    expect(errorsOf(validateClothes('x'))).toContain('clothes: debe ser un arreglo');
    expect(errorsOf(validateClothes([1]))).toContain('clothes[0]: debe ser un objeto');
  });
});

describe('validateCombos', () => {
  const clothes = [cloth(), secret] as never;

  it('accepts an empty list and a valid combo', () => {
    expect(validateCombos([], clothes)).toEqual({ ok: true, value: [] });
    expect(validateCombos([combo()], clothes).ok).toBe(true);
  });

  it('rejects requirements that reference missing items', () => {
    const msg = errorsOf(validateCombos([combo({ requires: [{ itemId: 'ghost' }] })], clothes));
    expect(msg).toContain('combos[0].requires[0]: la prenda "ghost" no existe');
  });

  it('rejects malformed requirements and invalid slots', () => {
    const msg = errorsOf(validateCombos([combo({ requires: [{}, { slot: 'tail', tag: 'x' }, 7] })], clothes));
    expect(msg).toContain('combos[0].requires[0]: debe tener itemId o slot y tag');
    expect(msg).toContain('combos[0].requires[1].slot: "tail" no existe');
    expect(msg).toContain('combos[0].requires[2]: debe ser un objeto');
  });

  it('requires a non empty requires list', () => {
    expect(errorsOf(validateCombos([combo({ requires: [] })], clothes))).toContain('combos[0].requires: debe tener al menos un requisito');
    expect(errorsOf(validateCombos([combo({ requires: 'x' })], clothes))).toContain('combos[0].requires: debe ser un arreglo');
  });

  it('rejects a reward that does not exist or is not secret', () => {
    expect(errorsOf(validateCombos([combo({ rewardItemId: 'ghost' })], clothes)))
      .toContain('combos[0].rewardItemId: la prenda "ghost" no existe');
    expect(errorsOf(validateCombos([combo({ rewardItemId: 'sweater-rayas' })], clothes)))
      .toContain('combos[0].rewardItemId: "sweater-rayas" debe tener secret: true');
  });

  it('rejects duplicated ids, missing text fields, non arrays and non objects', () => {
    expect(errorsOf(validateCombos([combo(), combo()], clothes))).toContain('combos[1].id: "navidad" está repetido');
    expect(errorsOf(validateCombos([combo({ name: 1, reaction: undefined })], clothes))).toContain('combos[0].name: debe ser texto');
    expect(errorsOf(validateCombos({}, clothes))).toContain('combos: debe ser un arreglo');
    expect(errorsOf(validateCombos([null], clothes))).toContain('combos[0]: debe ser un objeto');
  });
});

describe('validateCatalog / assertCatalog', () => {
  it('validates the three files together', () => {
    const r = validateCatalog({ cats: [cat], clothes: [cloth(), secret], combos: [combo()] });
    expect(r.ok).toBe(true);
  });

  it('collects the errors of every file', () => {
    const r = validateCatalog({ cats: {}, clothes: {}, combos: [] });
    expect(errorsOf(r)).toContain('cats: debe ser un arreglo');
    expect(errorsOf(r)).toContain('clothes: debe ser un arreglo');
  });

  it('assertCatalog throws a CatalogError with a readable message', () => {
    expect(() => assertCatalog({ cats: [], clothes: [], combos: [{}] })).toThrow(CatalogError);
    try {
      assertCatalog({ cats: {}, clothes: [], combos: [] });
    } catch (e) {
      expect((e as CatalogError).errors).toContain('cats: debe ser un arreglo');
      expect((e as Error).message).toContain('Catálogo inválido');
    }
  });

  it('assertCatalog returns the catalog when valid', () => {
    const raw = { cats: [cat], clothes: [cloth(), secret], combos: [combo()] };
    expect(assertCatalog(raw)).toEqual(raw);
  });
});
