// The keychain against the real data (ADR 0021).
import { describe, expect, it } from 'vitest';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import dyes from '../../src/game/data/dyes.json';
import photo from '../../src/game/data/photo.json';
import { WATER_DYE } from '../../src/game/domain/dye';
import { borderCopiesFor, ringFor, sanitizeRecipe, type KnownIds } from '../../src/game/domain/keychain';
import type { KeychainRecipe, Stars } from '../../src/game/domain/types';

const rules = photo.keychain as { goldFrom: Stars; charmFrom: Stars; borderCopies: number; borderRadius: number };
const STARS: Stars[] = [1, 2, 3, 4, 5];

const known: KnownIds = {
  catIds: cats.map((c) => c.id),
  itemIds: clothes.map((c) => c.id),
  dyeIds: [...dyes.map((d) => d.id), WATER_DYE],
  stickerIds: photo.stickers.map((s) => s.id),
  poseIds: photo.poses.map((p) => p.id),
  backgroundIds: photo.backgrounds.map((b) => b.id),
  frameIds: photo.frames.map((f) => f.id),
};

describe('photo.json keychain rules', () => {
  it('has charmFrom >= goldFrom', () => {
    expect(rules.charmFrom).toBeGreaterThanOrEqual(rules.goldFrom);
  });

  it('feeds ringFor: silver below goldFrom, gold from it, charm from charmFrom', () => {
    for (const stars of STARS) {
      expect(ringFor(stars, rules), `${stars} stars`).toEqual({ metal: stars >= rules.goldFrom ? 'gold' : 'silver', charm: stars >= rules.charmFrom });
    }
    expect(ringFor(1, rules)).toEqual({ metal: 'silver', charm: false });
    expect(ringFor(5, rules)).toEqual({ metal: 'gold', charm: true });
  });

  it('keeps the "hand painted" saturation in photo.json (-15 to -20 %, ADR 0021), warmer but not orange', () => {
    const k = photo.keychain as { saturation: number; warmth: number };
    expect(k.saturation).toBeGreaterThanOrEqual(0.8);
    expect(k.saturation).toBeLessThanOrEqual(0.85);
    expect(k.warmth).toBeGreaterThan(0);
    expect(k.warmth).toBeLessThanOrEqual(0.1);
  });

  it('matches the ADR 0021 border copies: 12 at 512 px (8 at 256 px comes from borderCopiesFor)', () => {
    expect(rules.borderCopies).toBe(borderCopiesFor(512));
    expect(borderCopiesFor(256)).toBe(8);
    expect(rules.borderCopies).toBeGreaterThan(borderCopiesFor(256));
  });
});

describe('sanitizeRecipe with the real catalogs', () => {
  const sweater = clothes.find((c) => c.slot === 'sweater' && c.dyeable)!;
  const head = clothes.find((c) => c.slot === 'head')!;
  const valid: KeychainRecipe = {
    catId: cats[0].id,
    catName: 'Mau',
    outfit: { sweater: sweater.id, head: head.id },
    itemDye: { [sweater.id]: dyes[0].id },
    pose: photo.poses[0].id,
    stars: 4,
    photo: {
      background: photo.backgrounds[1].id,
      frame: photo.frames[0].id,
      stickers: [{ id: photo.stickers[0].id, x: 10, y: 20, angle: 5 }],
    },
    createdAt: '2026-10-26T00:00:00.000Z',
  };

  it('leaves a valid recipe intact', () => {
    expect(sanitizeRecipe(valid, known)).toEqual(valid);
  });

  it('keeps the water tool as a valid dye', () => {
    const water = { ...valid, itemDye: { [sweater.id]: WATER_DYE } };
    expect(sanitizeRecipe(water, known)).toEqual(water);
  });

  it('drops an unknown item, dye and sticker, and discards an unknown cat', () => {
    const dirty = { ...valid, outfit: { ...valid.outfit, paws: 'paws-no-existe' }, itemDye: { [sweater.id]: 'no-existe' } };
    const clean = sanitizeRecipe({ ...dirty, photo: { ...valid.photo, stickers: [{ id: 'sticker-no-existe', x: 0, y: 0, angle: 0 }] } }, known);
    expect(clean?.outfit).toEqual(valid.outfit);
    expect(clean?.itemDye).toEqual({});
    expect(clean?.photo.stickers).toEqual([]);
    expect(sanitizeRecipe({ ...valid, catId: 'no-existe' }, known)).toBeNull();
  });
});
