import { describe, expect, it } from 'vitest';
import { PHOTO_PREFIX, photoFileName, photoLayout } from '../../src/game/domain/photo';

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
