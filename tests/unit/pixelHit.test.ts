import { describe, expect, it } from 'vitest';
import { grabPoint, hitsAlpha, type AlphaMap } from '../../src/game/domain/pixelHit';

/** Map from rows of text: '#' opaque, '.' empty. */
function map(rows: string[]): AlphaMap {
  const width = rows[0].length;
  return { width, height: rows.length, data: Uint8Array.from(rows.join('').split('').map((c) => (c === '#' ? 255 : 0))) };
}

describe('hitsAlpha', () => {
  const m = map(['.....', '.###.', '.###.', '.....', '.....']);

  it('hits opaque pixels and misses empty ones', () => {
    expect(hitsAlpha(m, 2, 1)).toBe(true);
    expect(hitsAlpha(m, 0, 0)).toBe(false);
  });

  it('a reach makes thin shapes easier to grab', () => {
    expect(hitsAlpha(m, 4, 1)).toBe(false);
    expect(hitsAlpha(m, 4, 1, 32, 1)).toBe(true);
    expect(hitsAlpha(m, 4, 4, 32, 1)).toBe(false);
  });

  it('ignores the faint antialiasing below the tolerance', () => {
    const faint: AlphaMap = { width: 1, height: 1, data: Uint8Array.of(20) };
    expect(hitsAlpha(faint, 0, 0, 32)).toBe(false);
    expect(hitsAlpha(faint, 0, 0, 16)).toBe(true);
  });

  it('is false outside the map', () => {
    expect(hitsAlpha(m, -3, 2)).toBe(false);
    expect(hitsAlpha(m, 9, 9)).toBe(false);
  });
});

describe('grabPoint', () => {
  it('is a visible pixel of the item, near its middle', () => {
    const own = map(['.......', '.#####.', '.#####.', '.#####.', '.......']);
    expect(grabPoint(own, [])).toEqual({ x: 3, y: 2 });
  });

  it('is never on a pixel that an item above hides', () => {
    const own = map(['.........', '.#######.', '.#######.', '.#######.', '.........']);
    const above = map(['.........', '.........', '...###...', '...###...', '.........']);
    const p = grabPoint(own, [above], { reach: 0 })!;
    expect(hitsAlpha(own, p.x, p.y)).toBe(true);
    expect(hitsAlpha(above, p.x, p.y)).toBe(false);
  });

  it('keeps away from the edge of what covers it by the reach', () => {
    const own = map(['..........', '.########.', '.########.', '.########.', '..........']);
    const above = map(['..........', '..........', '....##....', '..........', '..........']);
    const p = grabPoint(own, [above], { reach: 1 })!;
    expect(hitsAlpha(above, p.x, p.y, 32, 1)).toBe(false);
  });

  it('keeps one more pixel away than the reach, because the pointer never lands exactly on the center of a pixel', () => {
    const own = map(['.........', '#########', '.........']);
    const above = map(['.........', '....#....', '.........']);
    const p = grabPoint(own, [above], { reach: 1 })!;
    expect(hitsAlpha(above, p.x, p.y, 32, 2)).toBe(false);
  });

  it('is null when the item is invisible or fully covered', () => {
    expect(grabPoint(map(['...', '...']), [])).toBeNull();
    const own = map(['##', '##']);
    expect(grabPoint(own, [own], { reach: 0 })).toBeNull();
  });
});
