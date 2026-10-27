// F19.3: the hardware parts of a keychain (where each piece goes, for the live pieces of the transformation and for the PNG) and the
// operations that draw the kraft packaging (S8, ADR 0021). Pure: the scene runs them into a RenderTexture.
import { describe, expect, it } from 'vitest';
import { HARDWARE_ART, hardwareParts, keychainLayout, packagingLayout, ringFor } from '../../src/game/domain/keychain';
import { CARD_SIZE, fitKeychain, packageOps, splitAtKeychain } from '../../src/game/domain/keychainPackage';
import { FRAME_ANGLE_MAX, FRAME_ANGLE_MIN, framePlacement } from '../../src/game/domain/photo';
import { PHOTO_SIZE } from '../../src/game/domain/photoComposition';
import type { SheetOp } from '../../src/game/domain/photoSheet';

describe('hardwareParts', () => {
  const top = { x: 256, y: 80 };
  const silver = ringFor(2);
  const charm = ringFor(5);

  it('lists the eyelet then the ring, back to front, for a keychain without charm', () => {
    const parts = hardwareParts(keychainLayout(512, top, silver, 14), silver);
    expect(parts.map((p) => p.part)).toEqual(['eyelet', 'ring-silver']);
  });

  it('puts the chain and the charm behind the ring with 5 stars, and a gold ring from 4', () => {
    const parts = hardwareParts(keychainLayout(512, top, charm, 14), charm);
    expect(parts.map((p) => p.part)).toEqual(['chain', 'charm', 'eyelet', 'ring-gold']);
    expect(hardwareParts(keychainLayout(512, top, ringFor(4), 14), ringFor(4)).map((p) => p.part)).toEqual(['eyelet', 'ring-gold']);
  });

  it('takes the places and scales of the layout and the pivots from the art', () => {
    const layout = keychainLayout(512, top, charm, 14);
    const parts = hardwareParts(layout, charm);
    const eyelet = parts.find((p) => p.part === 'eyelet')!;
    expect(eyelet).toMatchObject({ x: layout.eyelet.x, y: layout.eyelet.y, scale: layout.eyelet.scale });
    expect(eyelet.origin.x).toBeCloseTo(HARDWARE_ART.eyelet.root.x / HARDWARE_ART.eyelet.width);
    expect(eyelet.origin.y).toBeCloseTo(HARDWARE_ART.eyelet.root.y / HARDWARE_ART.eyelet.height);
    const ring = parts.find((p) => p.part === 'ring-gold')!;
    expect(ring.origin).toEqual({ x: 0.5, y: 0.5 });
    expect(parts.find((p) => p.part === 'chain')!.angle).toBe(layout.chain!.angle);
  });
});

describe('fitKeychain', () => {
  it('scales the texture so it fits the rectangle hanging from its top, keeping the shape', () => {
    const rect = { x: 0, y: 100, width: 300, height: 200 };
    const k = fitKeychain(rect, { width: 600, height: 700 }, { x: 300, y: 20 });
    expect(600 * k).toBeLessThanOrEqual(300 + 1e-9);
    expect((700 - 20) * k).toBeLessThanOrEqual(200 + 1e-9);
    // One of the two sides touches the limit.
    expect(Math.max((600 * k) / 300, ((700 - 20) * k) / 200)).toBeCloseTo(1, 5);
  });
});

describe('packageOps', () => {
  const layout = packagingLayout({ x: -CARD_SIZE.width / 2, y: -CARD_SIZE.height / 2, width: CARD_SIZE.width, height: CARD_SIZE.height });
  const photo = {
    backgrounds: [{ id: 'bg-a', texture: 'tex-bg-a' }],
    frames: [{ id: 'frame-a', texture: 'tex-frame-a' }],
    stickers: [{ id: 'st-1', texture: 'tex-st-1' }],
  };
  const input = () => ({
    photo,
    composition: { background: 'bg-a', frame: 'frame-a', pose: 'pose-dormilon', stickers: [{ id: 'st-1', x: 100, y: -120, angle: 4 }] },
    catName: 'Mochi',
    stars: 4,
    brand: { shopSign: 'Lagatovino · hecho a mano', signature: 'Xoxo, mau!' },
    cardTexture: 'card-art',
    chainTexture: 'chain-art',
    keychain: { width: 560, height: 640, hang: { x: 280, y: 30 } },
  });
  const ops = () => packageOps(input());
  const text = (list: SheetOp[], value: string) => list.find((o) => o.kind === 'text' && o.text === value) as Extract<SheetOp, { kind: 'text' }> | undefined;

  it('starts with the card art, centered, and has no cat', () => {
    const list = ops();
    expect(list[0]).toMatchObject({ kind: 'image', texture: 'card-art', x: 0, y: 0 });
    expect(list.some((o) => o.kind === 'cat')).toBe(false);
  });

  it('writes the sign of the shop, the name and the signature where the layout says', () => {
    const list = ops();
    const sign = text(list, 'Lagatovino · hecho a mano')!;
    expect(sign.x).toBeCloseTo(layout.sign.x + layout.sign.width / 2);
    expect(sign.y).toBeCloseTo(layout.sign.y + layout.sign.height / 2);
    expect(sign.maxWidth).toBeLessThanOrEqual(layout.sign.width + 1e-9);
    const name = text(list, 'Mochi')!;
    expect(name.y).toBeCloseTo(layout.name.y + layout.name.height / 2);
    const tag = text(list, 'Xoxo, mau!')!;
    expect(tag.y).toBeCloseTo(layout.tagline.y + layout.tagline.height / 2);
  });

  const image = (list: SheetOp[], texture: string) => list.find((o) => o.kind === 'image' && o.texture === texture) as Extract<SheetOp, { kind: 'image' }>;
  const rad = (deg: number) => (deg * Math.PI) / 180;

  it('puts the photo (background, frame and stickers, the sheet at a smaller size) in the window, tilted like a polaroid pinned by hand (F2)', () => {
    const list = ops();
    const bg = image(list, 'tex-bg-a');
    const frame = image(list, 'tex-frame-a');
    const k = bg.scale!;
    // The window is the box of the photo, whatever the tilt: the sheet fits inside it.
    expect(PHOTO_SIZE.width * k).toBeLessThanOrEqual(layout.window.width + 1e-9);
    expect(PHOTO_SIZE.height * k).toBeLessThanOrEqual(layout.window.height + 1e-9);
    // Between 1 and 8 degrees either way, never straight, and the same for every piece of the sheet.
    const a = bg.angle!;
    expect(Math.abs(a)).toBeGreaterThanOrEqual(FRAME_ANGLE_MIN);
    expect(Math.abs(a)).toBeLessThanOrEqual(FRAME_ANGLE_MAX);
    expect(frame.angle).toBe(a);
    expect(a).toBe(framePlacement('Mochi|frame-a').angle);
    // The middle of the sheet is the middle of the window (the tilt turns it around its middle).
    expect(bg.x).toBeCloseTo(layout.window.x + layout.window.width / 2);
    expect(bg.y).toBeCloseTo(layout.window.y + layout.window.height / 2);
    // A sticker keeps its place on the sheet: its offset turns with it, and so does its own angle.
    const sticker = image(list, 'tex-st-1');
    const dx = 100 * k;
    const dy = -120 * k;
    expect(sticker.x).toBeCloseTo(bg.x + dx * Math.cos(rad(a)) - dy * Math.sin(rad(a)));
    expect(sticker.y).toBeCloseTo(bg.y + dx * Math.sin(rad(a)) + dy * Math.cos(rad(a)));
    expect(sticker.angle).toBeCloseTo(4 + a);
  });

  it('tilts the same photo the same way every time', () => {
    expect(image(ops(), 'tex-bg-a').angle).toBe(image(ops(), 'tex-bg-a').angle);
  });

  it('hangs a chain from the hole to the ring, over the card and under the keychain (F2)', () => {
    const list = ops();
    const chain = image(list, 'chain-art');
    const len = layout.chain.to.y - layout.chain.from.y;
    expect(chain.x).toBeCloseTo(layout.hole.x);
    expect(chain.y).toBeCloseTo(layout.chain.from.y + len / 2);
    expect(chain.height).toBeCloseTo(len);
    expect(list.findIndex((o) => o === chain)).toBeGreaterThan(0);
    expect(list.findIndex((o) => o === chain)).toBeLessThan(list.findIndex((o) => o.kind === 'keychain'));
  });

  it('hangs the keychain from the end of the chain, fitted, over the paper of the photo', () => {
    const list = ops();
    const kc = list.find((o) => o.kind === 'keychain') as Extract<SheetOp, { kind: 'keychain' }>;
    expect(kc.x).toBeCloseTo(layout.hang.x);
    expect(kc.y).toBeCloseTo(layout.hang.y);
    expect(kc.scale).toBeCloseTo(fitKeychain(layout.keychain, { width: 560, height: 640 }, { x: 280, y: 30 }));
    const at = (o: SheetOp | undefined) => list.findIndex((x) => x === o);
    expect(list.findIndex((o) => o.kind === 'keychain')).toBeGreaterThan(at(image(list, 'tex-frame-a')));
  });

  it('shows every sticker of the photo, in front of the keychain and inside the window (K3: they used to hide behind it)', () => {
    const two = [{ id: 'st-1', x: 100, y: -120, angle: 4 }, { id: 'st-1', x: -80, y: 150, angle: -6 }];
    const list = packageOps({ ...input(), composition: { ...input().composition, stickers: two } });
    const stickers = list.filter((o): o is Extract<SheetOp, { kind: 'image' }> => o.kind === 'image' && o.texture === 'tex-st-1');
    expect(stickers).toHaveLength(2);
    const kc = list.findIndex((o) => o.kind === 'keychain');
    for (const st of stickers) {
      expect(list.indexOf(st)).toBeGreaterThan(kc);
      expect(st.x).toBeGreaterThanOrEqual(layout.window.x);
      expect(st.x).toBeLessThanOrEqual(layout.window.x + layout.window.width);
      expect(st.y).toBeGreaterThanOrEqual(layout.window.y);
      expect(st.y).toBeLessThanOrEqual(layout.window.y + layout.window.height);
    }
  });

  it('draws the 5 stars of the rating under the name, 4 of them filled', () => {
    const stars = ops().filter((o) => o.kind === 'image' && o.texture.startsWith('ui-stamp')) as Extract<SheetOp, { kind: 'image' }>[];
    expect(stars).toHaveLength(5);
    expect(stars.filter((s) => s.texture === 'ui-stamp-sol')).toHaveLength(4);
    for (const s of stars) {
      expect(s.y).toBeGreaterThanOrEqual(layout.stars.y - 1e-9);
      expect(s.y).toBeLessThanOrEqual(layout.stars.y + layout.stars.height + 1e-9);
      expect(s.x).toBeGreaterThanOrEqual(layout.stars.x - 1e-9);
      expect(s.x).toBeLessThanOrEqual(layout.stars.x + layout.stars.width + 1e-9);
    }
  });

  it('draws no stars when the look was not rated', () => {
    expect(packageOps({ ...input(), stars: null }).some((o) => o.kind === 'image' && o.texture.startsWith('ui-stamp'))).toBe(false);
  });
});

describe('splitAtKeychain (the screen draws what is behind the live keychain and what is in front of it apart)', () => {
  it('splits the list at the keychain, which belongs to neither part', () => {
    const a: SheetOp = { kind: 'image', texture: 'a', x: 0, y: 0 };
    const b: SheetOp = { kind: 'image', texture: 'b', x: 0, y: 0 };
    const kc: SheetOp = { kind: 'keychain', x: 0, y: 0, scale: 1 };
    expect(splitAtKeychain([a, kc, b])).toEqual({ behind: [a], front: [b] });
  });
  it('has nothing in front when there is no keychain', () => {
    const a: SheetOp = { kind: 'image', texture: 'a', x: 0, y: 0 };
    expect(splitAtKeychain([a])).toEqual({ behind: [a], front: [] });
  });
});
