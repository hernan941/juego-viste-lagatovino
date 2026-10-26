import { describe, expect, it } from 'vitest';
import {
  CatalogError, assertCatalog, validateCats, validateCatalog, validateClothes, validateCombos,
  validateDyes, validateEconomy, validateShopRules,
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
    expect(errorsOf(validateCombos([combo({ reaction: 'dance' })], [cloth(), secret] as never))).toContain('combos[0].reaction: "dance" no existe');
  });

  it('rejects requirements that are secret items', () => {
    const msg = errorsOf(validateCombos([combo({ requires: [{ itemId: 'gift-hat' }] })], [cloth(), secret] as never));
    expect(msg).toContain('combos[0].requires[0]: "gift-hat" es secreta');
  });

  it('rejects a combo that no visible outfit can complete', () => {
    const msg = errorsOf(validateCombos([combo({ requires: [{ slot: 'neck', tag: 'nada' }] })], [cloth(), secret] as never));
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

// ---- F11.9: economy, dyes and the shop rules on the clothes (ADR 0017) ----
const economy = (over: Record<string, unknown> = {}) => ({
  startWallet: 100,
  scoring: {
    weights: { style: 1, love: 2, dislike: -3, complete: 1, combo: 3, favoriteItem: 2, favoriteDye: 1 },
    caps: { style: 6, love: 6, combo: 6, color: 2 },
    starThresholds: [3, 6, 10, 14],
    ignoredTags: ['secreto', 'mece'],
  },
  prices: { basica: 40, linda: 70, lujo: 110, dye: 50 },
  payout: { byStars: { 1: 5, 2: 10, 3: 18, 4: 28, 5: 40 }, nearFactor: 0.5, tip: 2 },
  milestones: { threeStars: 15, fourStars: 25, fiveStars: 50 },
  novelty: { window: 3 },
  discoveryBonus: 15,
  comboBonus: 40,
  ...over,
});
const dye = (over: Record<string, unknown> = {}) => ({ id: 'rosa', name: 'Rosa', hex: '#F6BFD0', starter: true, ...over });

describe('validateEconomy (F11.9)', () => {
  it('accepts a valid economy', () => {
    expect(validateEconomy(economy())).toEqual({ ok: true, value: economy() });
  });

  it('rejects non objects and missing blocks naming the path', () => {
    expect(errorsOf(validateEconomy(null))).toContain('economy: debe ser un objeto');
    const rest: Record<string, unknown> = economy();
    delete rest.scoring;
    delete rest.prices;
    const msg = errorsOf(validateEconomy(rest));
    expect(msg).toContain('economy.scoring: debe ser un objeto');
    expect(msg).toContain('economy.prices: debe ser un objeto');
  });

  it('rejects bad numbers with their path', () => {
    expect(errorsOf(validateEconomy(economy({ startWallet: -1 })))).toContain('economy.startWallet: debe ser un entero mayor o igual a 0');
    expect(errorsOf(validateEconomy(economy({ discoveryBonus: 1.5 })))).toContain('economy.discoveryBonus: debe ser un entero mayor o igual a 0');
    expect(errorsOf(validateEconomy(economy({ prices: { basica: 0, linda: 70, lujo: 110, dye: 50 } })))).toContain(
      'economy.prices.basica: debe ser un entero mayor que 0',
    );
    expect(errorsOf(validateEconomy(economy({ novelty: { window: 0 } })))).toContain('economy.novelty.window: debe ser un entero mayor que 0');
  });

  it('wants prices that grow with the tier', () => {
    expect(errorsOf(validateEconomy(economy({ prices: { basica: 80, linda: 70, lujo: 110, dye: 50 } })))).toContain(
      'economy.prices: los precios deben crecer con el nivel (basica < linda < lujo)',
    );
  });

  it('wants star thresholds that strictly increase', () => {
    const scoring = { ...economy().scoring, starThresholds: [3, 6, 6, 14] };
    expect(errorsOf(validateEconomy(economy({ scoring })))).toContain('economy.scoring.starThresholds: deben ser 4 números que crecen');
    const short = { ...economy().scoring, starThresholds: [3, 6, 10] };
    expect(errorsOf(validateEconomy(economy({ scoring: short })))).toContain('economy.scoring.starThresholds: deben ser 4 números que crecen');
  });

  it('wants payouts that do not shrink with the stars', () => {
    const payout = { ...economy().payout, byStars: { 1: 5, 2: 10, 3: 9, 4: 28, 5: 40 } };
    expect(errorsOf(validateEconomy(economy({ payout })))).toContain('economy.payout.byStars: el pago debe crecer con las estrellas');
    const missing = { ...economy().payout, byStars: { 1: 5, 2: 10, 3: 18, 4: 28 } };
    expect(errorsOf(validateEconomy(economy({ payout: missing })))).toContain('economy.payout.byStars.5: debe ser un entero mayor o igual a 0');
  });

  it('wants nearFactor between 0 and 1 and milestones that do not shrink', () => {
    const payout = { ...economy().payout, nearFactor: 1.5 };
    expect(errorsOf(validateEconomy(economy({ payout })))).toContain('economy.payout.nearFactor: debe estar entre 0 y 1');
    expect(errorsOf(validateEconomy(economy({ milestones: { threeStars: 30, fourStars: 25, fiveStars: 50 } })))).toContain(
      'economy.milestones: los hitos deben crecer (3 estrellas <= 4 estrellas <= 5 estrellas)',
    );
  });

  it('checks the scoring weights: bonuses are positive, the dislike penalty is negative', () => {
    const weights = { ...economy().scoring.weights, dislike: 3, love: -1 };
    const msg = errorsOf(validateEconomy(economy({ scoring: { ...economy().scoring, weights } })));
    expect(msg).toContain('economy.scoring.weights.dislike: debe ser un entero menor o igual a 0');
    expect(msg).toContain('economy.scoring.weights.love: debe ser un entero mayor o igual a 0');
  });

  it('checks caps and ignoredTags', () => {
    const scoring = { ...economy().scoring, caps: { style: 6, love: 6, combo: -1, color: 2 }, ignoredTags: ['ok', 3] };
    const msg = errorsOf(validateEconomy(economy({ scoring })));
    expect(msg).toContain('economy.scoring.caps.combo: debe ser un entero mayor o igual a 0');
    expect(msg).toContain('economy.scoring.ignoredTags: debe ser una lista de textos');
  });
});

describe('validateDyes (F11.9)', () => {
  it('accepts a valid list', () => {
    expect(validateDyes([dye(), dye({ id: 'cielo', name: 'Cielo', hex: '#CFE0F3', starter: undefined })]).ok).toBe(true);
  });

  it('rejects a bad hex, repeated ids and missing text', () => {
    expect(errorsOf(validateDyes([dye({ hex: 'rosa' })]))).toContain('dyes[0].hex: "rosa" debe ser un color #RRGGBB');
    expect(errorsOf(validateDyes([dye(), dye()]))).toContain('dyes[1].id: "rosa" está repetido');
    expect(errorsOf(validateDyes([dye({ name: '' })]))).toContain('dyes[0].name: debe ser texto');
  });

  it('wants at least one starter bottle', () => {
    expect(errorsOf(validateDyes([dye({ starter: undefined })]))).toContain('dyes: al menos un frasco debe ser starter');
  });

  it('keeps "agua" for the water tool, which is not a bottle', () => {
    expect(errorsOf(validateDyes([dye(), dye({ id: 'agua', name: 'Agua', hex: '#CFE0F3' })]))).toContain(
      'dyes[1].id: "agua" está reservado para la herramienta de agua',
    );
  });

  it('rejects a non boolean starter', () => {
    expect(errorsOf(validateDyes([dye({ starter: 'si' })]))).toContain('dyes[0].starter: debe ser true o false');
  });
});

describe('validateClothes: shop fields (F11.9)', () => {
  it('rejects an unknown tier and non boolean flags', () => {
    const msg = errorsOf(validateClothes([cloth({ tier: 'barata', starter: 'si', dyeable: 1 })]));
    expect(msg).toContain('clothes[0].tier: "barata" no existe (usa basica, linda, lujo)');
    expect(msg).toContain('clothes[0].starter: debe ser true o false');
    expect(msg).toContain('clothes[0].dyeable: debe ser true o false');
  });
});

describe('validateShopRules (F11.9)', () => {
  const starterA = cloth({ id: 'sweater-rayas', starter: true });
  const starterB = cloth({ id: 'face-gafas', slot: 'face', category: 'face', starter: true, tags: ['gala'] });
  const priced = cloth({ id: 'head-gorro', slot: 'head', category: 'head', tier: 'linda' });
  const gift = cloth({ id: 'gift-hat', slot: 'head', category: 'head', secret: true });
  const duo = combo({ requires: [{ itemId: 'sweater-rayas' }, { itemId: 'face-gafas' }] });

  it('accepts starters, priced items and secrets without tier', () => {
    expect(validateShopRules([starterA, starterB, priced, gift] as never, [duo] as never).ok).toBe(true);
  });

  it('wants tier or starter on every visible item', () => {
    const bare = cloth({ id: 'head-sin', slot: 'head', category: 'head' });
    expect(errorsOf(validateShopRules([starterA, starterB, bare, gift] as never, [duo] as never))).toContain(
      'clothes "head-sin": toda prenda visible necesita tier o starter',
    );
  });

  it('rejects an item with both tier and starter', () => {
    const both = cloth({ id: 'head-doble', slot: 'head', category: 'head', tier: 'lujo', starter: true });
    expect(errorsOf(validateShopRules([starterA, starterB, both, gift] as never, [duo] as never))).toContain(
      'clothes "head-doble": no puede tener tier y starter a la vez',
    );
  });

  it('keeps tier and starter off the secret items', () => {
    const rich = { ...gift, tier: 'lujo' };
    expect(errorsOf(validateShopRules([starterA, starterB, rich] as never, [duo] as never))).toContain(
      'clothes "gift-hat": las prendas secretas no se venden ni son iniciales',
    );
  });

  it('wants the starters to complete at least one combo', () => {
    const lockedB = cloth({ id: 'face-gafas', slot: 'face', category: 'face', tier: 'linda', tags: ['gala'] });
    expect(errorsOf(validateShopRules([starterA, lockedB, gift] as never, [duo] as never))).toContain(
      'combos: las prendas iniciales deben completar al menos un combo',
    );
  });
});
