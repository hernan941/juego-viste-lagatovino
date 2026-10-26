import { describe, expect, it } from 'vitest';
import { rateLook, photoArgs, runwayLines } from '../../src/game/domain/runway';
import { emptyProgress } from '../../src/game/domain/progress';
import { lookSignature } from '../../src/game/domain/economy';
import { scoreLook } from '../../src/game/domain/score';
import { assertGameData } from '../../src/game/data/schema';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import economy from '../../src/game/data/economy.json';
import dyes from '../../src/game/data/dyes.json';
import sets from '../../src/game/data/sets.json';
import photo from '../../src/game/data/photo.json';
import brand from '../../src/game/data/brand.json';

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand });
const cat = catalog.cats[0]!;
const sweater = catalog.clothes.find((c) => c.slot === 'sweater')!;
const look = { catId: cat.id, catName: 'Luna', outfit: { sweater: sweater.id }, itemDye: {} };
const coins = (events: readonly { type: string; amount?: number }[]) =>
  events.filter((e) => e.type === 'coins').reduce((n, e) => n + (e.amount ?? 0), 0);

describe('rateLook', () => {
  it('scores the look and applies the rating to the progress, once', () => {
    const progress = emptyProgress(catalog.economy.startWallet);
    const r = rateLook(progress, look, catalog);
    const expected = scoreLook(look.outfit, look.itemDye, cat, catalog.clothes, catalog.combos, catalog.economy);
    expect(r.result).toEqual(expected);
    expect(r.events[0]).toMatchObject({ type: 'coins' });
    expect(r.progress.wallet).toBeGreaterThan(progress.wallet);
    expect(r.progress.ratedLooks[cat.id]).toEqual([lookSignature(look.outfit, look.itemDye)]);
    expect(r.progress.bestStars[cat.id]).toBe(expected.stars);
    expect(progress.wallet).toBe(catalog.economy.startWallet);
  });

  it('pays less for a look that was already rated (the tip)', () => {
    const first = rateLook(emptyProgress(0), look, catalog);
    const again = rateLook(first.progress, look, catalog);
    expect(coins(again.events)).toBeLessThan(coins(first.events));
  });

  it('falls back to the first cat when the cat is unknown', () => {
    const r = rateLook(emptyProgress(0), { ...look, catId: 'no-existe' }, catalog);
    expect(r.result.stars).toBeGreaterThanOrEqual(1);
    expect(r.progress.ratedLooks[cat.id]).toHaveLength(1);
  });
});

describe('photoArgs', () => {
  it('hands the look and the rating to the photo mode', () => {
    const rating = { points: 3, stars: 2 as const, breakdown: [] };
    expect(photoArgs(look, rating)).toEqual({ look: { catId: cat.id, catName: 'Luna', outfit: look.outfit }, rating });
    expect(photoArgs(look, null)).toEqual({ look: { catId: cat.id, catName: 'Luna', outfit: look.outfit } });
  });
});

describe('runwayLines', () => {
  it('asks to tap in the right words for each input', () => {
    expect(runwayLines.skip(false)).toBe('Clic para seguir');
    expect(runwayLines.skip(true)).toBe('Toca para seguir');
  });
  it('names the three exits', () => {
    expect(runwayLines.photo).toBe('Modo foto');
    expect(runwayLines.keepDressing).toBe('Seguir vistiendo');
    expect(runwayLines.change).toBe('Otro gato');
  });
});
