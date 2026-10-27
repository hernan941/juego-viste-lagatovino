import { describe, expect, it } from 'vitest';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import economy from '../../src/game/data/economy.json';
import { validateDyes, validateEconomy, validateShopRules } from '../../src/game/data/schema';
import type { ClothingDef, ComboDef, ItemTier } from '../../src/game/domain/types';

// The shop numbers and lists of docs/design/segunda-etapa.md, sections 3 (S3, S4) and 4.
const items = clothes as ClothingDef[];
const visible = items.filter((c) => !c.secret);

const STARTERS = [
  'sweater-rayas', 'sweater-corazones', 'sweater-cohete', 'sweater-pescaditos', 'sweater-trenzado', 'sweater-fresa',
  'head-beanie-pompon', 'head-boina', 'neck-bufanda-rayas', 'neck-mono', 'face-lentes-estrella', 'face-lentes-redondos',
  'paws-mitones', 'paws-calcetines-rayas', 'accessory-flor-oreja', 'accessory-ovillo',
];
const TIERS: Record<ItemTier, string[]> = {
  basica: [
    'sweater-lunares', 'sweater-universitario', 'sweater-chaleco', 'sweater-huellitas', 'head-vincha-mono', 'head-gorro-chef',
    'neck-bufanda-larga', 'neck-collar-cascabel', 'neck-panuelo', 'paws-guantes-lana',
  ],
  linda: [
    'sweater-navideno', 'sweater-cuello-alto', 'sweater-hoodie-orejitas', 'sweater-oversize', 'sweater-nubes', 'head-gorrito-fresa',
    'head-gorro-rana', 'face-lentes-corazon', 'face-lentes-sol', 'paws-botitas', 'accessory-mochilita', 'accessory-taza-leche',
  ],
  lujo: ['sweater-arcoiris', 'head-sombrero-copa', 'head-corona-mini', 'neck-collar-perlas', 'face-monoculo', 'accessory-globo'],
};
const idsWhere = (pred: (c: ClothingDef) => boolean) => items.filter(pred).map((c) => c.id).sort();

describe('economy.json (F11.9)', () => {
  it('passes the schema', () => {
    const r = validateEconomy(economy);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('has the numbers of the design (section 4)', () => {
    expect(economy.startWallet).toBe(100);
    expect(economy.prices).toEqual({ basica: 40, linda: 70, lujo: 110, dye: 50 });
    expect(economy.payout).toEqual({ byStars: { 1: 3, 2: 5, 3: 8, 4: 10, 5: 14 }, nearFactor: 0.5, tip: 2 });
    expect(economy.milestones).toEqual({ threeStars: 15, fourStars: 25, fiveStars: 50 });
    expect(economy.novelty.window).toBe(3);
    expect(economy.discoveryBonus).toBe(15);
    expect(economy.comboBonus).toBe(40);
  });

  it('has the scoring table of the design (section 3, S1)', () => {
    const s = economy.scoring;
    expect(s.starThresholds).toEqual([3, 6, 10, 14]);
    expect(s.weights).toEqual({ style: 1, love: 2, dislike: -3, complete: 1, combo: 3, favoriteItem: 2, favoriteDye: 1 });
    expect(s.caps).toEqual({ style: 6, love: 6, combo: 6, color: 2 });
    expect(s.ignoredTags).toEqual(['secreto', 'mece']);
  });
});

describe('dyes.json (F11.9)', () => {
  it('passes the schema', () => {
    const r = validateDyes(dyes);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('has the 10 bottles of the brand, with rosa as the only starter', () => {
    expect(dyes.map((d) => d.id)).toEqual(['cielo', 'rosa', 'sol', 'lila', 'durazno', 'naranjo', 'lapiz', 'frambuesa', 'tomate', 'hoja']);
    expect(dyes.filter((d) => 'starter' in d && d.starter).map((d) => d.id)).toEqual(['rosa']);
  });
});

describe('clothes.json: shop fields (F11.9)', () => {
  it('passes the shop rules', () => {
    const r = validateShopRules(items, combos as ComboDef[]);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('has the 16 starters of the design', () => {
    expect(idsWhere((c) => c.starter === true)).toEqual([...STARTERS].sort());
  });

  it('has the 28 locked items in three tiers', () => {
    const locked = visible.filter((c) => c.starter !== true);
    expect(locked).toHaveLength(28);
    for (const tier of Object.keys(TIERS) as ItemTier[]) {
      expect(idsWhere((c) => c.tier === tier), tier).toEqual([...TIERS[tier]].sort());
    }
  });

  it('leaves the secret items out of the shop', () => {
    for (const c of items.filter((x) => x.secret)) {
      expect(c.tier, c.id).toBeUndefined();
      expect(c.starter, c.id).toBeUndefined();
    }
  });

  it('marks exactly the 16 visible sweaters as dyeable', () => {
    expect(idsWhere((c) => c.dyeable === true)).toEqual(idsWhere((c) => c.slot === 'sweater' && !c.secret));
    expect(items.filter((c) => c.dyeable === true)).toHaveLength(16);
  });
});
