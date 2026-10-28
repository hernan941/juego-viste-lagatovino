// F18.5: what the saved picture of the photo mode draws (domain/photoSheet.ts), in the coordinates of the sheet (its middle is 0, 0).
import { describe, expect, it } from 'vitest';
import { PHOTO_SIZE, STICKER_SIZE } from '../../src/game/domain/photoComposition';
import { SHEET_LAYOUT, captionPlan, sheetOps, starRow, type SheetOp } from '../../src/game/domain/photoSheet';

const photo = {
  backgrounds: [{ id: 'bg-a', texture: 'tex-bg-a' }, { id: 'bg-b', texture: 'tex-bg-b' }],
  frames: [{ id: 'frame-polaroid', texture: 'tex-frame-a' }, { id: 'frame-dorado', texture: 'tex-frame-d' }],
  stickers: [{ id: 'st-1', texture: 'tex-st-1' }, { id: 'st-2', texture: 'tex-st-2' }],
};
const base = { background: 'bg-b', frame: 'frame-polaroid', pose: 'pose-sentadito', stickers: [] as { id: string; x: number; y: number; angle: number }[] };
const input = (over: Partial<Parameters<typeof sheetOps>[0]> = {}) => ({
  photo, composition: base, catName: 'Mochi', stars: 3, signature: 'Xoxo, mau!', ...over,
});
const kinds = (ops: SheetOp[]) => ops.map((o) => (o.kind === 'image' ? `image:${o.texture}` : o.kind === 'text' ? `text:${o.text}` : o.kind));

describe('starRow', () => {
  it('always has 5 slots, the first `stars` of them filled', () => {
    expect(starRow(3).map((s) => s.filled)).toEqual([true, true, true, false, false]);
    expect(starRow(5).every((s) => s.filled)).toBe(true);
    expect(starRow(0).some((s) => s.filled)).toBe(false);
  });

  it('is centered on x = 0 and evenly spaced', () => {
    const xs = starRow(2).map((s) => s.x);
    expect(xs[0]).toBeCloseTo(-xs[4]!);
    expect(xs[2]).toBeCloseTo(0);
    expect(xs[1]! - xs[0]!).toBeCloseTo(xs[2]! - xs[1]!);
  });
});

describe('sheetOps', () => {
  it('draws, back to front: background, frame, name, the cat, the stickers, the stars and the signature', () => {
    const ops = sheetOps(input({ composition: { ...base, stickers: [{ id: 'st-1', x: 10, y: 20, angle: 5 }, { id: 'st-2', x: -30, y: -40, angle: -7 }] } }));
    const list = kinds(ops);
    expect(list.slice(0, 4)).toEqual(['image:tex-bg-b', 'image:tex-frame-a', 'text:Mochi', 'cat']);
    expect(list.slice(4, 6)).toEqual(['image:tex-st-1', 'image:tex-st-2']);
    expect(list[list.length - 1]).toBe('text:Xoxo, mau!');
  });

  it('cuts the background to the window of the frame, so its square corners never show past the rounded frame (F1)', () => {
    const bg = sheetOps(input({ composition: { ...base, frame: 'frame-polaroid' } }))[0];
    expect(bg).toMatchObject({ kind: 'image', texture: 'tex-bg-b', crop: { x: 36, y: 36, width: 468, height: 531 } });
    // The frame is whole: it is not cut.
    expect(sheetOps(input())[1]).not.toHaveProperty('crop');
  });

  it('puts the cat where the table puts it and the art of the sheet 1:1 around the middle', () => {
    const ops = sheetOps(input());
    const cat = ops.find((o) => o.kind === 'cat');
    expect(cat).toMatchObject({ x: SHEET_LAYOUT.cat.x, y: SHEET_LAYOUT.cat.feetY, size: SHEET_LAYOUT.cat.size });
    expect(ops[0]).toMatchObject({ x: 0, y: 0 });
    expect(SHEET_LAYOUT.cat.feetY).toBeLessThan(PHOTO_SIZE.height / 2);
  });

  it('draws each sticker where it was put, with its angle and the table size', () => {
    const ops = sheetOps(input({ composition: { ...base, stickers: [{ id: 'st-2', x: -30, y: -40, angle: -7 }] } }));
    expect(ops.find((o) => o.kind === 'image' && o.texture === 'tex-st-2')).toMatchObject({ x: -30, y: -40, angle: -7, height: STICKER_SIZE });
  });

  it('skips a piece or a sticker that is not in the catalog', () => {
    const ops = sheetOps(input({ composition: { background: 'nope', frame: null, pose: null, stickers: [{ id: 'ghost', x: 0, y: 0, angle: 0 }] } }));
    expect(kinds(ops)).not.toContain('image:tex-bg-b');
    expect(ops.some((o) => o.kind === 'image' && o.texture === 'ghost')).toBe(false);
    expect(ops.some((o) => o.kind === 'cat')).toBe(true);
  });

  it('adds the "zzz" only with the sleepy pose', () => {
    const zzz = (pose: string) => sheetOps(input({ composition: { ...base, pose } })).some((o) => o.kind === 'image' && o.texture === SHEET_LAYOUT.zzz.texture);
    expect(zzz('pose-dormilon')).toBe(true);
    expect(zzz('pose-coqueto')).toBe(false);
  });

  it('draws the 5 stars (filled ones solid, the rest faded) and none without a rating', () => {
    const stars = (n: number | null) => sheetOps(input({ stars: n })).filter((o) => o.kind === 'image' && o.texture.startsWith('ui-stamp'));
    const three = stars(3);
    expect(three).toHaveLength(5);
    expect(three.filter((o) => o.kind === 'image' && o.alpha === undefined)).toHaveLength(3);
    expect(stars(null)).toHaveLength(0);
  });

  it('writes the name inside the sheet and shrinks one that is too long', () => {
    const name = (text: string) => sheetOps(input({ catName: text })).find((o) => o.kind === 'text' && o.text === text) as Extract<SheetOp, { kind: 'text' }>;
    expect(Math.abs(name('Mochi').x) + 1).toBeLessThan(PHOTO_SIZE.width / 2);
    expect(name('Mochi').maxWidth).toBeLessThanOrEqual(PHOTO_SIZE.width - 100);
  });
});

// F20.R A2: a frame with no margin of its own (the golden one) gets a paper label over the stickers.
describe('captionPlan', () => {
  it('draws no label where the frame has its own bottom margin (polaroid, notebook, kofi)', () => {
    for (const f of ['frame-polaroid', 'frame-cuaderno', 'frame-kofi']) expect(captionPlan(f).label, f).toBeNull();
  });

  it('draws a label where the margin is thin (golden, watercolor, no frame)', () => {
    for (const f of ['frame-dorado', 'frame-acuarela', null]) expect(captionPlan(f).label, String(f)).not.toBeNull();
  });

  it('keeps everything of the label inside the sheet and the signature apart from the stars', () => {
    const plan = captionPlan('frame-dorado');
    const l = plan.label!;
    expect(l.y + l.height / 2).toBeLessThanOrEqual(PHOTO_SIZE.height / 2);
    expect(Math.abs(l.x) + l.width / 2).toBeLessThan(PHOTO_SIZE.width / 2);
    const starsRight = Math.max(...starRow(5, plan.stars.x).map((s) => s.x)) + SHEET_LAYOUT.stars.size / 2;
    expect(plan.signature.x - plan.signature.maxWidth / 2).toBeGreaterThan(starsRight);
    expect(plan.signature.x + plan.signature.maxWidth / 2).toBeLessThanOrEqual(l.x + l.width / 2);
  });
});

describe('sheetOps with a label', () => {
  const gold = (over = {}) => input({ composition: { ...base, frame: 'frame-dorado', stickers: [{ id: 'st-1', x: 0, y: 250, angle: 0 }] }, ...over });

  it('puts the label, the name, the stars and the signature in front of the stickers', () => {
    const list = kinds(sheetOps(gold()));
    const sticker = list.indexOf('image:tex-st-1');
    expect(list.indexOf('label')).toBeGreaterThan(sticker);
    expect(list.indexOf('text:Mochi')).toBeGreaterThan(list.indexOf('label'));
    expect(list.indexOf('text:Xoxo, mau!')).toBeGreaterThan(list.indexOf('label'));
    expect(list.indexOf('image:ui-stamp-sol')).toBeGreaterThan(list.indexOf('label'));
  });

  it('keeps the old order (name behind the cat) and no label with a margin frame', () => {
    const list = kinds(sheetOps(input()));
    expect(list).not.toContain('label');
    expect(list.indexOf('text:Mochi')).toBeLessThan(list.indexOf('cat'));
  });
});
