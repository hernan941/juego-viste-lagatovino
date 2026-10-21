import { describe, expect, it } from 'vitest';
import {
  IRIS_SHAPES, coverRects, heartOutline, innerRadius, irisHoleScale, pointInPolygon,
} from '../../src/game/systems/irisShapes';

describe('heartOutline', () => {
  const pts = heartOutline(96);

  it('is normalized: centered on the origin with 1 as its farthest point', () => {
    expect(Math.max(...pts.map((p) => Math.hypot(p.x, p.y)))).toBeCloseTo(1, 5);
  });

  it('is seen from the center in a single turn (star shaped), so a ray never crosses it twice', () => {
    const angles = pts.map((p) => Math.atan2(p.y, p.x));
    let turns = 0;
    for (let i = 0; i < angles.length; i++) {
      let d = angles[(i + 1) % angles.length] - angles[i];
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      expect(Math.abs(d)).toBeLessThan(0.5);
      turns += d;
    }
    expect(Math.abs(turns)).toBeCloseTo(2 * Math.PI, 3);
  });

  it('looks like a heart: wider than tall and with the point down (y grows downward)', () => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(Math.max(...ys) - Math.min(...ys) * 0.9);
    const bottom = pts.reduce((a, b) => (b.y > a.y ? b : a));
    expect(Math.abs(bottom.x)).toBeLessThan(0.05);
  });
});

describe('pointInPolygon', () => {
  const square = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];
  it('tells inside from outside', () => {
    expect(pointInPolygon(0, 0, square)).toBe(true);
    expect(pointInPolygon(2, 0, square)).toBe(false);
  });
});

describe('iris shapes', () => {
  it('both contain their center and nothing far away', () => {
    for (const shape of [IRIS_SHAPES.heart, IRIS_SHAPES.paw]) {
      expect(shape.contains(0, 0)).toBe(true);
      expect(shape.contains(3, 3)).toBe(false);
    }
  });

  it('the paw is a pad with four toes around the top, with gaps between them', () => {
    expect(IRIS_SHAPES.paw.parts.length).toBe(5);
    expect(IRIS_SHAPES.paw.contains(0, 0.1)).toBe(true);
    // the gap between the toes and the pad is empty
    expect(IRIS_SHAPES.paw.contains(0, -0.3)).toBe(false);
  });

  it('innerRadius is the closest empty point: the hole must grow past it to cover the screen', () => {
    expect(innerRadius(() => true, 1.5, 0.05)).toBeGreaterThan(1.4);
    expect(innerRadius((x, y) => Math.hypot(x, y) < 0.5, 1.5, 0.01)).toBeCloseTo(0.5, 1);
    expect(IRIS_SHAPES.heart.inner).toBeGreaterThan(0.3);
    expect(IRIS_SHAPES.paw.inner).toBeGreaterThan(0.2);
    expect(IRIS_SHAPES.paw.inner).toBeLessThan(IRIS_SHAPES.paw.outer);
  });
});

describe('irisHoleScale', () => {
  const inner = 0.4;
  const maxR = 800;
  it('closes to nothing and opens until the inner radius passes the farthest corner', () => {
    expect(irisHoleScale(0, 'close', inner, maxR)).toBeGreaterThanOrEqual(maxR / inner);
    expect(irisHoleScale(1, 'close', inner, maxR)).toBe(0);
    expect(irisHoleScale(0, 'open', inner, maxR)).toBe(0);
    expect(irisHoleScale(1, 'open', inner, maxR) * inner).toBeGreaterThanOrEqual(maxR);
  });

  it('is monotonic', () => {
    let last = -1;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const s = irisHoleScale(t, 'open', inner, maxR);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });

  it('clamps the progress', () => {
    expect(irisHoleScale(-3, 'open', inner, maxR)).toBe(0);
    expect(irisHoleScale(9, 'open', inner, maxR)).toBe(irisHoleScale(1, 'open', inner, maxR));
  });
});

describe('coverRects', () => {
  const W = 1280;
  const H = 720;
  const inRects = (rs: ReturnType<typeof coverRects>, x: number, y: number) =>
    rs.some((r) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height);

  it('covers everything outside the square image and nothing inside', () => {
    const rs = coverRects(640, 360, 200, W, H);
    for (const [x, y] of [[10, 10], [1270, 710], [640, 100], [640, 650], [300, 360], [1000, 360]]) expect(inRects(rs, x, y)).toBe(true);
    for (const [x, y] of [[640, 360], [500, 250], [790, 450]]) expect(inRects(rs, x, y)).toBe(false);
  });

  it('is a single full rect when the image is gone, and empty when it covers the screen', () => {
    expect(coverRects(640, 360, 0, W, H)).toEqual([{ x: 0, y: 0, width: W, height: H }]);
    expect(coverRects(640, 360, 2000, W, H)).toEqual([]);
  });
});
