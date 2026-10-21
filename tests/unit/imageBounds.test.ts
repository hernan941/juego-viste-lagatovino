import { describe, expect, it } from 'vitest';
import { alphaBounds, ghostFit } from '../../src/game/domain/imageBounds';

/** RGBA buffer of w x h with the given opaque rectangles. */
function image(w: number, h: number, rects: [number, number, number, number][], alpha = 255): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (const [x0, y0, rw, rh] of rects) {
    for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) px[(y * w + x) * 4 + 3] = alpha;
  }
  return px;
}

describe('alphaBounds', () => {
  it('is null for a fully transparent image', () => {
    expect(alphaBounds(image(8, 8, []), 8, 8)).toBeNull();
  });
  it('wraps the opaque pixels', () => {
    expect(alphaBounds(image(16, 16, [[3, 5, 4, 2], [9, 8, 2, 3]]), 16, 16)).toEqual({ x: 3, y: 5, width: 8, height: 6 });
  });
  it('ignores almost transparent pixels (below the threshold)', () => {
    expect(alphaBounds(image(8, 8, [[2, 2, 3, 3]], 4), 8, 8)).toBeNull();
    expect(alphaBounds(image(8, 8, [[2, 2, 3, 3]], 40), 8, 8)).toEqual({ x: 2, y: 2, width: 3, height: 3 });
  });
});

describe('ghostFit', () => {
  it('centers the dragged picture on its bounds and scales the longest side to the target size', () => {
    const fit = ghostFit({ x: 100, y: 40, width: 200, height: 100 }, 512, 512, 150);
    expect(fit.scale).toBeCloseTo(0.75, 5);
    expect(fit.origin.x).toBeCloseTo(200 / 512, 5);
    expect(fit.origin.y).toBeCloseTo(90 / 512, 5);
  });
  it('falls back to the whole canvas when the image has no pixels', () => {
    const fit = ghostFit(null, 512, 512, 150);
    expect(fit.origin).toEqual({ x: 0.5, y: 0.5 });
    expect(fit.scale).toBeCloseTo(150 / 512, 5);
  });
});
