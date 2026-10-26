import { describe, expect, expectTypeOf, it } from 'vitest';
import { DressUpEvents, RegistryKeys, SceneKeys, TextureKeys } from '../../src/game/constants';
import type {
  BreakdownLine,
  CatDef,
  CatPrefs,
  CharacterDef,
  ClothingDef,
  DyeDef,
  EconomyRules,
  ItemDye,
  ItemTier,
  KeychainRecipe,
  PhotoCatalog,
  Progress,
  ProgressEvent,
  RatingResult,
  SetDef,
  Stars,
  StoredProgress,
} from '../../src/game/domain/types';
import { SAVE_VERSION } from '../../src/game/domain/types';

describe('second stage types (F11.8, ADR 0017)', () => {
  it('adds optional fields to the existing definitions without breaking them', () => {
    expectTypeOf<ClothingDef['tier']>().toEqualTypeOf<ItemTier | undefined>();
    expectTypeOf<ClothingDef['starter']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ClothingDef['dyeable']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<CatDef['prefs']>().toEqualTypeOf<CatPrefs | undefined>();
  });

  it('describes tiers, stars and dyes', () => {
    expectTypeOf<ItemTier>().toEqualTypeOf<'basica' | 'linda' | 'lujo'>();
    expectTypeOf<Stars>().toEqualTypeOf<1 | 2 | 3 | 4 | 5>();
    expectTypeOf<ItemDye>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<DyeDef>().toHaveProperty('hex').toBeString();
  });

  it('describes cat tastes', () => {
    expectTypeOf<CatPrefs>().toHaveProperty('loves').toEqualTypeOf<string[]>();
    expectTypeOf<CatPrefs>().toHaveProperty('dislikes').toEqualTypeOf<string[]>();
    expectTypeOf<CatPrefs>().toHaveProperty('favoriteItem').toBeString();
    expectTypeOf<CatPrefs>().toHaveProperty('favoriteDye').toBeString();
    expectTypeOf<CatPrefs>().toHaveProperty('hint').toBeString();
  });

  it('describes the rule files', () => {
    expectTypeOf<EconomyRules>().toHaveProperty('startWallet').toBeNumber();
    expectTypeOf<EconomyRules>().toHaveProperty('scoring');
    expectTypeOf<EconomyRules>().toHaveProperty('prices');
    expectTypeOf<EconomyRules>().toHaveProperty('payout');
    expectTypeOf<EconomyRules>().toHaveProperty('milestones');
    expectTypeOf<EconomyRules>().toHaveProperty('novelty');
    expectTypeOf<EconomyRules>().toHaveProperty('discoveryBonus').toBeNumber();
    expectTypeOf<EconomyRules>().toHaveProperty('comboBonus').toBeNumber();
    expectTypeOf<SetDef>().toHaveProperty('requires');
    expectTypeOf<SetDef>().toHaveProperty('reward');
    expectTypeOf<PhotoCatalog>().toHaveProperty('backgrounds');
    expectTypeOf<PhotoCatalog>().toHaveProperty('frames');
    expectTypeOf<PhotoCatalog>().toHaveProperty('stickers');
    expectTypeOf<PhotoCatalog>().toHaveProperty('poses');
    expectTypeOf<PhotoCatalog>().toHaveProperty('keychain');
    expectTypeOf<CharacterDef>().toHaveProperty('name').toBeString();
  });

  it('describes progress, ratings and their events', () => {
    expectTypeOf<Progress>().toHaveProperty('wallet').toBeNumber();
    expectTypeOf<Progress>().toHaveProperty('owned').toEqualTypeOf<string[]>();
    expectTypeOf<Progress>().toHaveProperty('keychains').toEqualTypeOf<Record<string, KeychainRecipe>>();
    expectTypeOf<StoredProgress['wallet']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<RatingResult>().toHaveProperty('stars').toEqualTypeOf<Stars>();
    expectTypeOf<RatingResult>().toHaveProperty('breakdown').toEqualTypeOf<BreakdownLine[]>();
    expectTypeOf<ProgressEvent['type']>().toEqualTypeOf<
      'coins' | 'milestone' | 'tasteFound' | 'comboFirst' | 'setCompleted' | 'unlock'
    >();
  });

  it('uses the v2 save format (F11.11)', () => {
    expect(SAVE_VERSION).toBe(2);
  });
});

describe('second stage keys (F11.8)', () => {
  it('adds the new scenes', () => {
    expect(SceneKeys.Album).toBe('Album');
    expect(SceneKeys.PhotoMode).toBe('PhotoMode');
  });

  it('adds the registry keys of the progress', () => {
    expect(RegistryKeys.ItemDye).toBe('itemDye');
    expect(RegistryKeys.Progress).toBe('progress');
    expect(RegistryKeys.LastRating).toBe('lastRating');
  });

  it('adds the DressUp scene events of ADR 0019', () => {
    // Features add their own events later (the wallet's), so the ADR set is checked as a subset.
    expect(DressUpEvents).toMatchObject({
      ItemDropped: 'item-dropped',
      ItemRemoved: 'item-removed',
      ReadyPressed: 'ready-pressed',
      OutfitChanged: 'outfit-changed',
      CatChanged: 'cat-changed',
    });
    expect(new Set(Object.values(DressUpEvents)).size).toBe(Object.values(DressUpEvents).length);
  });

  it('adds unique texture keys for the new UI', () => {
    const values = Object.values(TextureKeys);
    expect(new Set(values).size).toBe(values.length);
    expect(TextureKeys.Coin).toBeTypeOf('string');
    expect(TextureKeys.PriceTag).toBeTypeOf('string');
  });
});
