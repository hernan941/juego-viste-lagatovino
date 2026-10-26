import { describe, expect, it } from 'vitest';
import {
  PENDULUM_REST,
  borderCopiesFor,
  borderOffsets,
  defaultReplace,
  hangKeychain,
  keychainRecipe,
  needsConfirm,
  packagingLayout,
  pendulum,
  pendulumDuration,
  ringFor,
  sanitizeRecipe,
  type KnownIds,
} from '../../src/game/domain/keychain';
import type { KeychainRecipe, Rect, Stars } from '../../src/game/domain/types';

const recipe = (catId: string, stars: Stars, extra: Partial<KeychainRecipe> = {}): KeychainRecipe => ({
  catId, catName: catId.toUpperCase(), outfit: { sweater: 'rayas' }, itemDye: { rayas: 'lila' }, pose: 'sentadito', stars,
  photo: { background: 'cuadriculado', frame: 'polaroid', stickers: [] }, createdAt: '2026-10-25T10:00:00.000Z', ...extra,
});

describe('ringFor', () => {
  it('is silver with 1 to 3 stars', () => {
    for (const s of [1, 2, 3] as Stars[]) expect(ringFor(s)).toEqual({ metal: 'silver', charm: false });
  });

  it('is gold with 4 stars and gold with the charm with 5', () => {
    expect(ringFor(4)).toEqual({ metal: 'gold', charm: false });
    expect(ringFor(5)).toEqual({ metal: 'gold', charm: true });
  });

  it('follows the thresholds of the rules', () => {
    expect(ringFor(3, { goldFrom: 3, charmFrom: 4 })).toEqual({ metal: 'gold', charm: false });
    expect(ringFor(4, { goldFrom: 3, charmFrom: 4 })).toEqual({ metal: 'gold', charm: true });
  });
});

describe('borderOffsets', () => {
  it('gives `count` points on a circle of that radius', () => {
    const pts = borderOffsets(12, 14);
    expect(pts).toHaveLength(12);
    for (const p of pts) expect(Math.hypot(p.x, p.y)).toBeCloseTo(14, 6);
  });

  it('spreads them evenly, starting to the right', () => {
    const pts = borderOffsets(4, 10);
    expect(pts[0].x).toBeCloseTo(10);
    expect(pts[0].y).toBeCloseTo(0);
    expect(pts[1].x).toBeCloseTo(0);
    expect(pts[1].y).toBeCloseTo(10);
    expect(pts[2].x).toBeCloseTo(-10);
  });

  it('has no points when asked for none', () => {
    expect(borderOffsets(0, 10)).toEqual([]);
    expect(borderOffsets(-3, 10)).toEqual([]);
  });
});

describe('borderCopiesFor', () => {
  it('uses 12 copies per ring at 512 px and 8 on 256 px thumbnails', () => {
    expect(borderCopiesFor(512)).toBe(12);
    expect(borderCopiesFor(1080)).toBe(12);
    expect(borderCopiesFor(256)).toBe(8);
  });
});

describe('keychainRecipe', () => {
  const look = { catId: 'luna', catName: 'Luna', outfit: { sweater: 'rayas', head: 'beanie' }, itemDye: { rayas: 'lila', gone: 'rosa' }, pose: 'coqueto' };
  const choice = { background: 'cielo', frame: 'dorado', stickers: [{ id: 'estrella', x: 10, y: 20, angle: 5 }] };

  it('builds the recipe with an ISO date', () => {
    const r = keychainRecipe(look, choice, 4, new Date('2026-10-25T10:30:00Z'));
    expect(r).toEqual({
      catId: 'luna', catName: 'Luna', outfit: { sweater: 'rayas', head: 'beanie' }, itemDye: { rayas: 'lila' },
      pose: 'coqueto', stars: 4, photo: choice, createdAt: '2026-10-25T10:30:00.000Z',
    });
  });

  it('keeps the dye only of the worn items', () => {
    expect(keychainRecipe(look, choice, 1, new Date(0)).itemDye).toEqual({ rayas: 'lila' });
  });

  it('copies everything: later changes do not touch the recipe', () => {
    const outfit = { sweater: 'rayas' };
    const stickers = [{ id: 'estrella', x: 1, y: 2, angle: 0 }];
    const r = keychainRecipe({ ...look, outfit }, { ...choice, stickers }, 2, new Date(0));
    outfit.sweater = 'otro';
    stickers[0].x = 99;
    expect(r.outfit.sweater).toBe('rayas');
    expect(r.photo.stickers[0].x).toBe(1);
  });

  it('is the same for the same input', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(keychainRecipe(look, choice, 3, d)).toEqual(keychainRecipe(look, choice, 3, d));
  });
});

describe('sanitizeRecipe', () => {
  const known: KnownIds = {
    catIds: ['luna', 'tom'], itemIds: ['rayas', 'beanie'], dyeIds: ['lila', 'rosa'], stickerIds: ['estrella', 'zzz'],
    poseIds: ['sentadito', 'coqueto'], backgroundIds: ['cuadriculado', 'cielo'], frameIds: ['polaroid', 'dorado'],
  };

  it('keeps a valid recipe as it is', () => {
    const r = recipe('luna', 3, { outfit: { sweater: 'rayas', head: 'beanie' }, itemDye: { rayas: 'lila' } });
    expect(sanitizeRecipe(r, known)).toEqual(r);
  });

  it('drops a recipe whose cat does not exist', () => {
    expect(sanitizeRecipe(recipe('ghost', 3), known)).toBeNull();
  });

  it('drops a recipe with bad stars', () => {
    expect(sanitizeRecipe(recipe('luna', 9 as Stars), known)).toBeNull();
    expect(sanitizeRecipe(recipe('luna', 0 as Stars), known)).toBeNull();
    expect(sanitizeRecipe(recipe('luna', 2.5 as Stars), known)).toBeNull();
  });

  it('omits unknown items, and the dye of items that are not worn or dyes that do not exist', () => {
    const r = recipe('luna', 3, { outfit: { sweater: 'rayas', head: 'ghost' }, itemDye: { rayas: 'tinta-vieja', ghost: 'lila', beanie: 'rosa' } });
    const clean = sanitizeRecipe(r, known);
    expect(clean?.outfit).toEqual({ sweater: 'rayas' });
    expect(clean?.itemDye).toEqual({});
  });

  it('omits unknown stickers', () => {
    const r = recipe('luna', 3, { photo: { background: 'cielo', frame: 'dorado', stickers: [{ id: 'estrella', x: 1, y: 2, angle: 3 }, { id: 'ghost', x: 0, y: 0, angle: 0 }] } });
    expect(sanitizeRecipe(r, known)?.photo.stickers).toEqual([{ id: 'estrella', x: 1, y: 2, angle: 3 }]);
  });

  it('falls back to the first background, frame and pose when they are gone', () => {
    const r = recipe('luna', 3, { pose: 'ghost', photo: { background: 'ghost', frame: 'ghost', stickers: [] } });
    const clean = sanitizeRecipe(r, known);
    expect(clean?.pose).toBe('sentadito');
    expect(clean?.photo.background).toBe('cuadriculado');
    expect(clean?.photo.frame).toBe('polaroid');
  });

  it('keeps the value when the known list is empty', () => {
    const none: KnownIds = { ...known, poseIds: [], backgroundIds: [], frameIds: [] };
    const r = recipe('luna', 3, { pose: 'x', photo: { background: 'y', frame: 'z', stickers: [] } });
    expect(sanitizeRecipe(r, none)).toMatchObject({ pose: 'x', photo: { background: 'y', frame: 'z' } });
  });

  it('does not change the input', () => {
    const r = recipe('luna', 3, { outfit: { sweater: 'ghost' } });
    sanitizeRecipe(r, known);
    expect(r.outfit).toEqual({ sweater: 'ghost' });
  });
});

describe('hangKeychain', () => {
  it('hangs the first keychain of a cat and says it is the first', () => {
    const r = recipe('luna', 3);
    const out = hangKeychain({}, r);
    expect(out).toEqual({ collection: { luna: r }, replaced: false, isFirst: true });
  });

  it('does not change the collection it receives', () => {
    const col = { luna: recipe('luna', 3) };
    hangKeychain(col, recipe('luna', 5), true);
    expect(col.luna.stars).toBe(3);
  });

  it('keeps the other cats', () => {
    const tom = recipe('tom', 2);
    expect(hangKeychain({ tom }, recipe('luna', 1)).collection).toEqual({ tom, luna: recipe('luna', 1) });
  });

  it('replaces when the player confirms, even with fewer stars', () => {
    const next = recipe('luna', 1);
    const out = hangKeychain({ luna: recipe('luna', 5) }, next, true);
    expect(out).toEqual({ collection: { luna: next }, replaced: true, isFirst: false });
  });

  it('keeps the old one when the player refuses, even with more stars', () => {
    const old = recipe('luna', 1);
    const out = hangKeychain({ luna: old }, recipe('luna', 5), false);
    expect(out).toEqual({ collection: { luna: old }, replaced: false, isFirst: false });
  });

  it('without an answer keeps the one with more stars', () => {
    const old = recipe('luna', 4);
    expect(hangKeychain({ luna: old }, recipe('luna', 3)).collection.luna).toBe(old);
    const better = recipe('luna', 5);
    const out = hangKeychain({ luna: old }, better);
    expect(out.collection.luna).toBe(better);
    expect(out.replaced).toBe(true);
  });

  it('on a tie the new one wins by default', () => {
    const next = recipe('luna', 4, { catName: 'nueva' });
    expect(hangKeychain({ luna: recipe('luna', 4) }, next).collection.luna).toBe(next);
  });
});

describe('needsConfirm and defaultReplace', () => {
  it('asks only when the cat already has a keychain', () => {
    expect(needsConfirm({}, recipe('luna', 3))).toBe(false);
    expect(needsConfirm({ tom: recipe('tom', 3) }, recipe('luna', 3))).toBe(false);
    expect(needsConfirm({ luna: recipe('luna', 3) }, recipe('luna', 3))).toBe(true);
  });

  it('the highlighted option is to keep the one with more stars, the new one on a tie', () => {
    expect(defaultReplace(recipe('luna', 4), recipe('luna', 3))).toBe(false);
    expect(defaultReplace(recipe('luna', 3), recipe('luna', 4))).toBe(true);
    expect(defaultReplace(recipe('luna', 3), recipe('luna', 3))).toBe(true);
  });
});

describe('pendulum', () => {
  const p = { amp: 14, periodMs: 800, damping: 2 };

  it('starts at the full amplitude, as if it had just been pushed', () => {
    expect(pendulum(0, p)).toBeCloseTo(14, 6);
  });

  it('swings to the other side after half a period', () => {
    const half = pendulum(400, { ...p, damping: 0 });
    expect(half).toBeCloseTo(-14, 6);
    expect(pendulum(800, { ...p, damping: 0 })).toBeCloseTo(14, 6);
  });

  it('dies down: the extremes get smaller and it rests', () => {
    const peak = (k: number) => Math.abs(pendulum(k * 800, p));
    expect(peak(1)).toBeLessThan(peak(0));
    expect(peak(2)).toBeLessThan(peak(1));
    expect(Math.abs(pendulum(1600, p))).toBeLessThan(0.6);
    expect(Math.abs(pendulum(20000, p))).toBeLessThan(1e-9);
  });

  it('depends only on the time, never on how it was sampled', () => {
    const dense = Array.from({ length: 1001 }, (_, i) => pendulum(i * 1.6, p));
    const coarse = Array.from({ length: 11 }, (_, i) => pendulum(i * 160, p));
    for (let i = 0; i <= 10; i++) expect(dense[i * 100]).toBeCloseTo(coarse[i], 9);
    expect(pendulum(333, p)).toBe(pendulum(333, p));
  });

  it('rests at zero before it starts and with no amplitude or period', () => {
    expect(pendulum(-50, p)).toBe(0);
    expect(pendulum(100, { ...p, amp: 0 })).toBe(0);
    expect(pendulum(100, { ...p, periodMs: 0 })).toBe(0);
  });

  it('pendulumDuration is when the swing falls under the rest angle', () => {
    expect(PENDULUM_REST).toBeGreaterThan(0);
    const d = pendulumDuration(p);
    // the envelope at d is exactly the rest angle
    expect(14 * Math.exp((-2 * d) / 1000)).toBeCloseTo(PENDULUM_REST, 6);
  });

  it('pendulumDuration is 0 when already at rest and Infinity with no damping', () => {
    expect(pendulumDuration({ amp: PENDULUM_REST / 2, periodMs: 800, damping: 2 })).toBe(0);
    expect(pendulumDuration({ amp: 14, periodMs: 800, damping: 0 })).toBe(Infinity);
  });

  it('the reduced-motion swing (3 deg, 0.6 s) is quiet by then', () => {
    const reduced = { amp: 3, periodMs: 800, damping: 5 };
    expect(pendulumDuration(reduced)).toBeLessThanOrEqual(600);
  });
});

describe('packagingLayout', () => {
  const frame: Rect = { x: 100, y: 40, width: 600, height: 900 };
  const l = packagingLayout(frame);
  const inside = (r: Rect, o: Rect) => r.x >= o.x && r.y >= o.y && r.x + r.width <= o.x + o.width && r.y + r.height <= o.y + o.height;
  const overlap = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  it('keeps every piece inside the card', () => {
    for (const r of [l.sign, l.window, l.keychain, l.name, l.stars, l.tagline]) expect(inside(r, frame)).toBe(true);
    expect(l.hole.x - l.hole.radius).toBeGreaterThanOrEqual(frame.x);
    expect(l.hole.y - l.hole.radius).toBeGreaterThanOrEqual(frame.y);
  });

  it('puts the hole on the top center and the rest from top to bottom', () => {
    expect(l.hole.x).toBe(frame.x + frame.width / 2);
    expect(l.hole.y).toBeLessThan(l.sign.y);
    const order = [l.sign, l.window, l.name, l.stars, l.tagline];
    for (let i = 1; i < order.length; i++) expect(order[i].y).toBeGreaterThanOrEqual(order[i - 1].y + order[i - 1].height);
  });

  it('hangs the keychain inside the window of the picture', () => {
    expect(inside(l.keychain, l.window)).toBe(true);
    expect(l.hang.x).toBe(frame.x + frame.width / 2);
    expect(l.hang.y).toBeGreaterThanOrEqual(l.window.y);
  });

  it('has no overlaps between the text and the picture', () => {
    const parts = [l.sign, l.window, l.name, l.stars, l.tagline];
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlap(parts[i], parts[j])).toBe(false);
  });

  it('scales with the frame and moves with its origin', () => {
    const big = packagingLayout({ x: 0, y: 0, width: 1200, height: 1800 });
    const small = packagingLayout({ x: 0, y: 0, width: 600, height: 900 });
    expect(big.window.width).toBeCloseTo(small.window.width * 2);
    expect(big.name.y).toBeCloseTo(small.name.y * 2);
    expect(l.window.x).toBeCloseTo(small.window.x + frame.x);
    expect(l.window.y).toBeCloseTo(small.window.y + frame.y);
  });
});
