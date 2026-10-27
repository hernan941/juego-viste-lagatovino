import { describe, expect, it } from 'vitest';
import {
  FRAME_WINDOWS, PHOTO_SIZE, STICKER_ANGLE_MAX, STICKER_HALF, backgroundCrop, canPick, composition, frameWindow, photoArea, pieceStates,
  placeSticker, removeSticker, stickerAngle,
} from '../../src/game/domain/photoComposition';
import photoJson from '../../src/game/data/photo.json';
import { photoLines } from '../../src/game/domain/copy/photo';
import { STICKER_LIMIT } from '../../src/game/domain/photo';

describe('photoArea', () => {
  it('is inside the 540 x 675 sheet, centered on its middle', () => {
    const a = photoArea();
    expect(a.x + a.width / 2).toBe(0);
    expect(a.y + a.height / 2).toBe(0);
    expect(a.width).toBeLessThan(PHOTO_SIZE.width);
    expect(a.height).toBeLessThan(PHOTO_SIZE.height);
  });
});

describe('placeSticker', () => {
  it('adds the sticker on top and keeps the angle it was given', () => {
    const r = placeSticker([], { id: 'sticker-estrella', x: 10, y: 20 }, 7);
    expect(r.placed).toBe(true);
    expect(r.stickers).toEqual([{ id: 'sticker-estrella', x: 10, y: 20, angle: 7 }]);
  });

  it('keeps the whole sticker inside the photo area (clampSticker)', () => {
    const a = photoArea();
    const r = placeSticker([], { id: 'sticker-luna', x: 9999, y: -9999 }, 0);
    expect(r.stickers[0]!.x).toBe(a.x + a.width - STICKER_HALF);
    expect(r.stickers[0]!.y).toBe(a.y + STICKER_HALF);
  });

  it('refuses the ninth sticker and leaves the list as it was', () => {
    let list = [] as ReturnType<typeof placeSticker>['stickers'];
    for (let i = 0; i < STICKER_LIMIT; i++) list = placeSticker(list, { id: 'sticker-corazon', x: i, y: 0 }, 0).stickers;
    expect(list).toHaveLength(STICKER_LIMIT);
    const r = placeSticker(list, { id: 'sticker-corazon', x: 0, y: 0 }, 0);
    expect(r.placed).toBe(false);
    expect(r.stickers).toBe(list);
  });

  it('does not mutate the list it got', () => {
    const list = Object.freeze([]) as never[];
    expect(() => placeSticker(list, { id: 'a', x: 0, y: 0 }, 0)).not.toThrow();
  });
});

describe('removeSticker', () => {
  const list = [
    { id: 'a', x: 0, y: 0, angle: 0 },
    { id: 'b', x: 1, y: 1, angle: 0 },
  ];
  it('removes the one at the index', () => {
    expect(removeSticker(list, 0).map((s) => s.id)).toEqual(['b']);
    expect(list).toHaveLength(2);
  });
  it('ignores an index that does not exist', () => {
    expect(removeSticker(list, 5)).toEqual(list);
    expect(removeSticker(list, -1)).toEqual(list);
  });
});

describe('stickerAngle', () => {
  it('stays within plus or minus the max, whatever the random number', () => {
    expect(stickerAngle(() => 0)).toBe(-STICKER_ANGLE_MAX);
    expect(stickerAngle(() => 0.5)).toBe(0);
    expect(stickerAngle(() => 0.999999)).toBeLessThanOrEqual(STICKER_ANGLE_MAX);
  });
});

describe('pieceStates and canPick', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const open = new Set(['a', 'c']);
  it('marks each piece open or locked, in order', () => {
    expect(pieceStates(list, open)).toEqual([{ id: 'a', open: true }, { id: 'b', open: false }, { id: 'c', open: true }]);
  });
  it('only an unlocked piece that exists can be picked', () => {
    expect(canPick('a', list, open)).toBe(true);
    expect(canPick('b', list, open)).toBe(false);
    expect(canPick('zzz', list, open)).toBe(false);
  });
});

describe('composition', () => {
  it('is a copy of what is on the table: pieces, pose and stickers in z order', () => {
    const stickers = [{ id: 's', x: 1, y: 2, angle: 3 }];
    const c = composition({ background: 'bg-cielo', frame: 'frame-polaroid', pose: 'pose-coqueto', stickers });
    expect(c).toEqual({ background: 'bg-cielo', frame: 'frame-polaroid', pose: 'pose-coqueto', stickers });
    expect(c.stickers).not.toBe(stickers);
    expect(c.stickers[0]).not.toBe(stickers[0]);
  });
});

describe('unlockHint', () => {
  const sets = (id: string) => (id === 'abriguito' ? 'Abriguito' : undefined);
  it('says how to get each kind of piece', () => {
    expect(photoLines.unlockHint({ set: 'abriguito' }, sets)).toBe('Completa el set Abriguito');
    expect(photoLines.unlockHint({ albumPct: 50 }, sets)).toBe('Llena el 50 % del cuaderno');
    expect(photoLines.unlockHint({ firstFiveStar: true }, sets)).toBe('Consigue 5 estrellas');
  });
  it('does not break with a set it does not know', () => {
    expect(photoLines.unlockHint({ set: 'nada' }, sets)).toBe('Completa un set');
  });
  it('has a line for the full sheet', () => {
    expect(photoLines.full.length).toBeGreaterThan(0);
  });
});

describe('frameWindow (F1: the background is cut to the window of the frame)', () => {

  it('has a window for every frame of the catalog, inside the sheet and big enough for the cat', () => {
    for (const f of photoJson.frames) {
      expect(FRAME_WINDOWS[f.id], f.id).toBeDefined();
      const w = frameWindow(f.id);
      expect(w.x).toBeGreaterThanOrEqual(-PHOTO_SIZE.width / 2);
      expect(w.y).toBeGreaterThanOrEqual(-PHOTO_SIZE.height / 2);
      expect(w.x + w.width).toBeLessThanOrEqual(PHOTO_SIZE.width / 2);
      expect(w.y + w.height).toBeLessThanOrEqual(PHOTO_SIZE.height / 2);
      expect(w.width).toBeGreaterThan(PHOTO_SIZE.width * 0.7);
      expect(w.height).toBeGreaterThan(PHOTO_SIZE.height * 0.7);
    }
  });

  it('reads the polaroid window from its art: (36, 36) to (504, 567) in the 540 x 675 sheet', () => {
    expect(frameWindow('frame-polaroid')).toEqual({ x: 36 - 270, y: 36 - 337.5, width: 468, height: 531 });
  });

  it('falls back to a safe window for a frame that is unknown or missing', () => {
    expect(frameWindow(null)).toEqual(frameWindow('nope'));
    expect(frameWindow('nope').width).toBeGreaterThan(0);
  });

  it('the crop of the background in texture px is the window moved by half the sheet', () => {
    const w = frameWindow('frame-cuaderno');
    expect(backgroundCrop('frame-cuaderno')).toEqual({ x: w.x + 270, y: w.y + 337.5, width: w.width, height: w.height });
  });
});
