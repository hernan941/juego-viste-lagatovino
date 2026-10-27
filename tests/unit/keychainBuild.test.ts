// F19.2: the pure parts of building a keychain texture (ADR 0021): its cache key, the "hand painted" matrix, where the
// hardware goes, where a pose moves the head and the swing of each motion profile.
import { describe, expect, it } from 'vitest';
import photo from '../../src/game/data/photo.json';
import { topOfColumns } from '../../src/game/domain/imageBounds';
import {
  hardwareScale,
  keychainLayout,
  pendulumDuration,
  poseTransform,
  porcelainMatrix,
  recipeKey,
  ringFor,
} from '../../src/game/domain/keychain';
import { catPose } from '../../src/game/domain/catPose';
import { motionProfile } from '../../src/game/systems/motion';
import type { KeychainRecipe, Stars } from '../../src/game/domain/types';

const recipe = (extra: Partial<KeychainRecipe> = {}): KeychainRecipe => ({
  catId: 'gato-naranja', catName: 'Luna', outfit: { sweater: 'sweater-rayas', head: 'head-gorro' }, itemDye: { 'sweater-rayas': 'lila' },
  pose: 'sentadito', stars: 3, photo: { background: 'a', frame: 'b', stickers: [{ id: 's', x: 1, y: 2, angle: 3 }] },
  createdAt: '2026-10-25T10:00:00.000Z', ...extra,
});

describe('recipeKey', () => {
  it('names the texture keychain~<catId>~<hash>~<px>', () => {
    expect(recipeKey(recipe(), 512)).toMatch(/^keychain~gato-naranja~[0-9a-f]+~512$/);
  });

  it('is the same for the same render, whatever the order of the keys', () => {
    const swapped = recipe({ outfit: { head: 'head-gorro', sweater: 'sweater-rayas' } });
    expect(recipeKey(swapped, 512)).toBe(recipeKey(recipe(), 512));
  });

  it('ignores what does not change the picture of the keychain: the name, the photo and the date', () => {
    const other = recipe({ catName: 'Otro', createdAt: '2027-01-01T00:00:00.000Z', photo: { background: 'x', frame: 'y', stickers: [] } });
    expect(recipeKey(other, 512)).toBe(recipeKey(recipe(), 512));
  });

  it('changes with the outfit, the dye, the pose, the cat and the size', () => {
    const base = recipeKey(recipe(), 512);
    const variants = [
      recipe({ outfit: { sweater: 'sweater-rayas' } }),
      recipe({ itemDye: { 'sweater-rayas': 'rosa' } }),
      recipe({ itemDye: {} }),
      recipe({ pose: 'coqueto' }),
      recipe({ stars: 4 }),
      recipe({ catId: 'gato-gris' }),
    ];
    for (const v of variants) expect(recipeKey(v, 512)).not.toBe(base);
    expect(recipeKey(recipe(), 256)).not.toBe(base);
  });

  it('keeps one texture for the 1 to 3 star silver rings (the ring is the same)', () => {
    expect(recipeKey(recipe({ stars: 1 }), 512)).toBe(recipeKey(recipe({ stars: 3 }), 512));
  });
});

describe('porcelainMatrix', () => {
  it('is the identity with no desaturation and no warmth', () => {
    const id = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
    porcelainMatrix(1, 0).forEach((v, i) => expect(v).toBeCloseTo(id[i], 9));
  });

  it('turns everything gray with saturation 0', () => {
    const m = porcelainMatrix(0, 0);
    expect(m.slice(0, 3)).toEqual(m.slice(5, 8));
    expect(m.slice(5, 8)).toEqual(m.slice(10, 13));
  });

  it('keeps white and gray as they are when it only desaturates (each color row adds up to 1)', () => {
    const m = porcelainMatrix(photo.keychain.saturation, 0);
    for (const row of [0, 5, 10]) expect(m[row] + m[row + 1] + m[row + 2]).toBeCloseTo(1, 9);
  });

  it('is warmer: more red and less blue', () => {
    const m = porcelainMatrix(1, 0.05);
    expect(m[0]).toBeGreaterThan(1);
    expect(m[12]).toBeLessThan(1);
  });

  it('has 20 numbers and leaves the alpha alone', () => {
    const m = porcelainMatrix(photo.keychain.saturation, 0.03);
    expect(m).toHaveLength(20);
    expect(m.slice(15)).toEqual([0, 0, 0, 1, 0]);
  });

});

describe('poseTransform', () => {
  const top = { x: 256, y: 60 };
  it('does nothing in the sitting pose', () => {
    const p = poseTransform(catPose('sentadito')!, top);
    expect(p.x).toBeCloseTo(256);
    expect(p.y).toBeCloseTo(60);
  });

  it('lifts the point with the jump', () => {
    expect(poseTransform(catPose('saltito')!, top).y).toBeCloseTo(60 - 24);
  });

  it('tilts the head to the right around the feet with the coy pose (clockwise)', () => {
    const p = poseTransform(catPose('coqueto')!, top);
    expect(p.x).toBeGreaterThan(256 + 40);
    expect(p.y).toBeGreaterThan(60);
    // Same distance to the feet: it only turned.
    expect(Math.hypot(p.x - 256, p.y - 490)).toBeCloseTo(Math.hypot(0, 60 - 490), 6);
  });

  it('squashes around the feet with the sleepy pose', () => {
    const p = poseTransform(catPose('dormilon')!, top);
    expect(p.y).toBeCloseTo(490 - (490 - 60) * 0.97);
  });
});

describe('topOfColumns', () => {
  const map = (rows: string[]) => ({
    width: rows[0].length, height: rows.length, data: rows.flatMap((r) => [...r].map((c) => (c === '#' ? 255 : 0))),
  });

  it('is the first visible row inside the columns, as a fraction of the height', () => {
    const m = map(['....', '.#..', '###.', '####']);
    expect(topOfColumns(m, 0.25, 0.5)).toBeCloseTo(1 / 4);
  });

  it('ignores what is outside the columns', () => {
    const m = map(['#...', '....', '.##.', '.##.']);
    expect(topOfColumns(m, 0.25, 0.75)).toBeCloseTo(2 / 4);
  });

  it('is null when the columns are empty', () => {
    expect(topOfColumns(map(['#..#', '#..#']), 0.3, 0.7)).toBeNull();
  });

  it('ignores the faint antialiasing fringe', () => {
    const m = { width: 2, height: 2, data: [10, 10, 255, 255] };
    expect(topOfColumns(m, 0, 1)).toBeCloseTo(0.5);
  });
});

describe('keychainLayout', () => {
  const top = { x: 256, y: 70 };
  const BORDER = 14;
  const at = (px: number, stars: Stars = 3, t = top) => keychainLayout(px, t, ringFor(stars), BORDER);

  it('hangs the eyelet on the head, the ring above it and the pivot at the top of the ring', () => {
    const l = at(512);
    expect(l.eyelet.x).toBeCloseTo(l.look.x + 256);
    expect(l.eyelet.y).toBeGreaterThan(l.look.y + 70);
    expect(l.ring.y).toBeLessThan(l.eyelet.y);
    expect(l.hang.x).toBeCloseTo(l.ring.x);
    expect(l.hang.y).toBeLessThan(l.ring.y);
  });

  it('keeps the look and the hardware inside the texture, with room for the border', () => {
    for (const px of [256, 512]) {
      for (const stars of [1, 4, 5] as Stars[]) {
        const l = at(px, stars);
        expect(l.look.x).toBeGreaterThanOrEqual(l.pad);
        expect(l.look.y).toBeGreaterThanOrEqual(l.pad);
        expect(l.look.x + px).toBeLessThanOrEqual(l.width - l.pad);
        expect(l.look.y + px).toBeLessThanOrEqual(l.height - l.pad);
        expect(l.hang.y).toBeGreaterThanOrEqual(0);
        expect(l.hang.x).toBeGreaterThan(0);
        expect(l.hang.x).toBeLessThan(l.width);
      }
    }
  });

  it('is the 256 px version of the 512 px one: half of the scale and the size', () => {
    const a = at(512);
    const b = at(256);
    expect(b.ring.scale).toBeCloseTo(a.ring.scale / 2, 9);
    expect(hardwareScale(256)).toBeCloseTo(hardwareScale(512) / 2, 9);
    expect(b.width).toBeLessThan(a.width * 0.6);
  });

  it('has the charm and its chain only with the star charm of 5 stars', () => {
    expect(at(512, 4).charm).toBeUndefined();
    expect(at(512, 4).chain).toBeUndefined();
    const five = at(512, 5);
    expect(five.charm).toBeDefined();
    expect(five.chain).toBeDefined();
    // The charm hangs from the end of the chain, beside the ring.
    expect(five.charm!.x).toBeGreaterThan(five.ring.x);
    expect(five.charm!.y).toBeGreaterThan(five.chain!.y);
  });

  it('puts the whole hardware higher when the head is higher (a tall hat)', () => {
    const low = at(512, 3, { x: 256, y: 90 });
    const high = at(512, 3, { x: 256, y: 20 });
    expect(high.eyelet.y - high.look.y).toBeLessThan(low.eyelet.y - low.look.y);
  });

  it('is never narrower than the look and its border', () => {
    const l = at(512, 1);
    expect(l.width).toBeGreaterThanOrEqual(512 + 2 * l.pad);
  });
});

describe('the swing of the motion profile (ADR 0021)', () => {
  it('is +-14 degrees that fade out in about 1.6 s', () => {
    const s = motionProfile(false).swing;
    expect(s.amp).toBe(14);
    expect(pendulumDuration(s)).toBeGreaterThan(1500);
    expect(pendulumDuration(s)).toBeLessThan(1700);
  });

  it('is +-3 degrees that stop in 0.6 s with reduced motion', () => {
    const s = motionProfile(true).swing;
    expect(s.amp).toBe(3);
    expect(pendulumDuration(s)).toBeGreaterThan(550);
    expect(pendulumDuration(s)).toBeLessThan(650);
  });
});
