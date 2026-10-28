import { describe, expect, it } from 'vitest';
import { mapPointsDeep, pageMapper, splitMapped } from '../../src/game/systems/pagePoints';

const map = pageMapper({ left: 100, top: 56, width: 640 }, 1280);

describe('pageMapper', () => {
  it('scales by the canvas width and offsets by the canvas corner (header and letterbox included)', () => {
    expect(map({ x: 0, y: 0 })).toEqual({ x: 100, y: 56 });
    expect(map({ x: 1280, y: 720 })).toEqual({ x: 740, y: 416 });
    expect(map({ x: 200, y: 100 })).toEqual({ x: 200, y: 106 });
  });
});

describe('mapPointsDeep', () => {
  it('converts every {x, y} found at any depth, in objects and arrays', () => {
    const out = mapPointsDeep({ buttons: { take: { x: 200, y: 100 } }, removes: [{ x: 0, y: 0 }], sign: { x: 400, y: 200 } }, map);
    expect(out).toEqual({ buttons: { take: { x: 200, y: 106 } }, removes: [{ x: 100, y: 56 }], sign: { x: 300, y: 156 } });
  });

  it('leaves rects, numbers, strings, nulls and booleans alone', () => {
    const rect = { x: 10, y: 10, width: 5, height: 5 };
    const src = { open: true, price: 3, name: 'a', none: null, rect, list: ['a', 1] };
    expect(mapPointsDeep(src, map)).toEqual(src);
  });

  it('does not mutate its input', () => {
    const src = { p: { x: 200, y: 100 } };
    mapPointsDeep(src, map);
    expect(src.p).toEqual({ x: 200, y: 100 });
  });
});

describe('splitMapped', () => {
  it('removes the keys the caller already converts by hand', () => {
    expect(splitMapped({ a: 1, cells: 2, b: 3 }, ['cells'])).toEqual({ a: 1, b: 3 });
  });
});
