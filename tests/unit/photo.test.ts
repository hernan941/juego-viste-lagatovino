import { describe, expect, it } from 'vitest';
import {
  FRAME_ANGLE_MAX,
  FRAME_ANGLE_MIN,
  PHOTO_PREFIX,
  STICKER_LIMIT,
  clampSticker,
  framePlacement,
  photoFileName,
  photoLayout,
  initialPieces,
  resolveLook,
  stickerLimit,
} from '../../src/game/domain/photo';
import { emptySession } from '../../src/game/domain/session';
import type { PhotoUnlocks } from '../../src/game/domain/album';
import type { PhotoCatalog, RatingResult } from '../../src/game/domain/types';

describe('photoFileName', () => {
  it('uses the prefix, the lowercase name and .png', () => {
    expect(photoFileName('Bigotes')).toBe('viste-lagato-bigotes.png');
    expect(PHOTO_PREFIX).toBe('viste-lagato-');
  });

  it('removes accents and turns spaces into single dashes', () => {
    expect(photoFileName('Doña   Gata')).toBe('viste-lagato-dona-gata.png');
    expect(photoFileName('Ñoño')).toBe('viste-lagato-nono.png');
  });

  it('removes characters that are not safe in a file name', () => {
    expect(photoFileName('a/b\\c:d*e?"f<g>h|i')).toBe('viste-lagato-abcdefghi.png');
    expect(photoFileName('Mimi 🐱!')).toBe('viste-lagato-mimi.png');
    expect(photoFileName('../../etc')).toBe('viste-lagato-etc.png');
  });

  it('falls back to "gatito" when nothing is left', () => {
    expect(photoFileName('')).toBe('viste-lagato-gatito.png');
    expect(photoFileName('🐱🐱')).toBe('viste-lagato-gatito.png');
    expect(photoFileName('---')).toBe('viste-lagato-gatito.png');
  });

  it('keeps letters of other alphabets', () => {
    expect(photoFileName('Мурка')).toBe('viste-lagato-мурка.png');
  });
});

describe('photoLayout', () => {
  const l = photoLayout();
  const inside = (r: { x: number; y: number; width: number; height: number }, o: { x: number; y: number; width: number; height: number }) =>
    r.x >= o.x && r.y >= o.y && r.x + r.width <= o.x + o.width && r.y + r.height <= o.y + o.height;
  const overlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  it('is a portrait picture with whole numbers', () => {
    expect(l.height).toBeGreaterThan(l.width);
    expect(Number.isInteger(l.width) && Number.isInteger(l.height)).toBe(true);
  });

  it('puts the frame inside the picture, and the cat, the logo and the name inside the frame', () => {
    const canvas = { x: 0, y: 0, width: l.width, height: l.height };
    expect(inside(l.frame, canvas)).toBe(true);
    for (const r of [l.cat, l.logo, l.name]) expect(inside(r, l.frame)).toBe(true);
  });

  it('does not overlap the logo, the cat and the name', () => {
    expect(overlap(l.logo, l.cat)).toBe(false);
    expect(overlap(l.name, l.cat)).toBe(false);
    expect(overlap(l.logo, l.name)).toBe(false);
  });

  it('centers the cat and gives the feet position for the Cat container', () => {
    expect(l.cat.x + l.cat.width / 2).toBe(l.width / 2);
    expect(l.feet.x).toBe(l.width / 2);
    expect(l.feet.y).toBeLessThanOrEqual(l.cat.y + l.cat.height);
    expect(l.feet.y).toBeGreaterThan(l.cat.y);
  });

  it('keeps every sparkle inside the frame and outside the cat', () => {
    expect(l.sparkles.length).toBeGreaterThanOrEqual(6);
    for (const p of l.sparkles) {
      const r = { x: p.x - 20, y: p.y - 20, width: 40, height: 40 };
      expect(inside(r, l.frame)).toBe(true);
      expect(overlap(r, l.cat)).toBe(false);
    }
  });
});

describe('framePlacement', () => {
  it('is stable for the same seed', () => {
    expect(framePlacement('luna-2026')).toEqual(framePlacement('luna-2026'));
    expect(framePlacement(42)).toEqual(framePlacement(42));
  });

  it('always tilts between 1 and 8 degrees, either way', () => {
    expect(FRAME_ANGLE_MIN).toBe(1);
    expect(FRAME_ANGLE_MAX).toBe(8);
    const signs = new Set<number>();
    const angles = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const { angle } = framePlacement(`seed-${i}`);
      expect(Math.abs(angle)).toBeGreaterThanOrEqual(FRAME_ANGLE_MIN);
      expect(Math.abs(angle)).toBeLessThanOrEqual(FRAME_ANGLE_MAX);
      signs.add(Math.sign(angle));
      angles.add(angle);
    }
    expect(signs).toEqual(new Set([-1, 1]));
    expect(angles.size).toBeGreaterThan(50);
  });

  it('gives different tilts for different seeds', () => {
    expect(framePlacement('a').angle).not.toBe(framePlacement('b').angle);
  });
});

describe('stickerLimit', () => {
  it('allows 8 stickers per photo', () => {
    expect(STICKER_LIMIT).toBe(8);
    expect(stickerLimit(0)).toEqual({ max: 8, left: 8, full: false });
    expect(stickerLimit(7)).toEqual({ max: 8, left: 1, full: false });
    expect(stickerLimit(8)).toEqual({ max: 8, left: 0, full: true });
  });

  it('never goes below zero', () => {
    expect(stickerLimit(12)).toEqual({ max: 8, left: 0, full: true });
  });
});

describe('clampSticker', () => {
  const frame = { x: 100, y: 50, width: 400, height: 300 };

  it('keeps a point that is inside', () => {
    expect(clampSticker({ x: 200, y: 120 }, frame)).toEqual({ x: 200, y: 120 });
  });

  it('pulls a point back onto the edge of the frame', () => {
    expect(clampSticker({ x: 0, y: 0 }, frame)).toEqual({ x: 100, y: 50 });
    expect(clampSticker({ x: 900, y: 900 }, frame)).toEqual({ x: 500, y: 350 });
  });

  it('keeps the whole sticker inside with a margin (half its size)', () => {
    expect(clampSticker({ x: 0, y: 999 }, frame, 30)).toEqual({ x: 130, y: 320 });
  });

  it('centers on the frame when the margin does not fit', () => {
    expect(clampSticker({ x: 0, y: 0 }, frame, 500)).toEqual({ x: 300, y: 200 });
  });

  it('does not change the input', () => {
    const p = { x: 0, y: 0 };
    clampSticker(p, frame);
    expect(p).toEqual({ x: 0, y: 0 });
  });
});

describe('resolveLook (F18.2, ADR 0019)', () => {
  const session = { ...emptySession(), catId: 'gato-02', catName: 'Luna', outfit: { sweater: 'sw-1' } };
  const rating: RatingResult = { points: 80, stars: 4, breakdown: [] };

  it('takes the look and the rating the Showcase hands over', () => {
    const look = resolveLook({ look: { catId: 'gato-05', catName: 'Kiwi', outfit: { head: 'h-1' } }, rating }, session, undefined);
    expect(look).toEqual({ catId: 'gato-05', catName: 'Kiwi', outfit: { head: 'h-1' }, rating });
  });

  it('without data (a ?start= link) uses the session and the last rating', () => {
    const last: RatingResult = { points: 10, stars: 2, breakdown: [] };
    expect(resolveLook(undefined, session, last)).toEqual({ catId: 'gato-02', catName: 'Luna', outfit: { sweater: 'sw-1' }, rating: last });
  });

  it('ignores data that is not valid and a rating that is not a rating', () => {
    const look = resolveLook({ look: 'x', rating: { stars: 'many' } }, session, { nope: true });
    expect(look).toEqual({ catId: 'gato-02', catName: 'Luna', outfit: { sweater: 'sw-1' }, rating: null });
  });

  it('fills the pieces of a partial look from the session', () => {
    expect(resolveLook({ look: { catName: 'Kiwi' } }, session, undefined)).toMatchObject({ catId: 'gato-02', catName: 'Kiwi', outfit: { sweater: 'sw-1' } });
  });
});

describe('initialPieces', () => {
  const piece = (id: string) => ({ id, name: id, texture: `t-${id}`, unlock: 'starter' as const });
  const photo = {
    backgrounds: [piece('b1'), piece('b2')], frames: [piece('f1'), piece('f2')], stickers: [], poses: [piece('p1'), piece('p2')], keychain: {},
  } as unknown as PhotoCatalog;
  const unlocks = (b: string[], f: string[], p: string[]): PhotoUnlocks => ({ backgrounds: new Set(b), frames: new Set(f), stickers: new Set(), poses: new Set(p) });

  it('starts with the first unlocked background, frame and pose', () => {
    expect(initialPieces(photo, unlocks(['b2', 'b1'], ['f1'], ['p1']))).toEqual({ background: 'b1', frame: 'f1', pose: 'p1' });
    expect(initialPieces(photo, unlocks(['b2'], ['f2'], ['p2']))).toEqual({ background: 'b2', frame: 'f2', pose: 'p2' });
  });

  it('is null for a section with nothing unlocked', () => {
    expect(initialPieces(photo, unlocks([], [], []))).toEqual({ background: null, frame: null, pose: null });
  });
});
