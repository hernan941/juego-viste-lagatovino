import { describe, expect, it } from 'vitest';
import { isInsideDropZone, magnetSnap, resolveDrop } from '../../src/game/domain/dropZone';

const zone = { x: 100, y: 100, width: 200, height: 300 };

describe('isInsideDropZone', () => {
  it('is true inside the zone and on its edges', () => {
    expect(isInsideDropZone({ x: 150, y: 200 }, zone, 0)).toBe(true);
    expect(isInsideDropZone({ x: 100, y: 100 }, zone, 0)).toBe(true);
    expect(isInsideDropZone({ x: 300, y: 400 }, zone, 0)).toBe(true);
  });

  it('is false outside without margin', () => {
    expect(isInsideDropZone({ x: 99, y: 200 }, zone, 0)).toBe(false);
    expect(isInsideDropZone({ x: 150, y: 401 }, zone, 0)).toBe(false);
  });

  it('the margin forgives drops near the body', () => {
    expect(isInsideDropZone({ x: 70, y: 200 }, zone, 40)).toBe(true);
    expect(isInsideDropZone({ x: 70, y: 200 }, zone, 20)).toBe(false);
    expect(isInsideDropZone({ x: 150, y: 430 }, zone, 40)).toBe(true);
  });
});

describe('magnetSnap', () => {
  const anchor = { x: 200, y: 150 };

  it('snaps to the anchor within the radius', () => {
    expect(magnetSnap({ x: 210, y: 160 }, anchor, 30)).toEqual({ point: anchor, snapped: true });
  });

  it('snaps exactly at the radius', () => {
    expect(magnetSnap({ x: 230, y: 150 }, anchor, 30).snapped).toBe(true);
  });

  it('keeps the point when too far', () => {
    const p = { x: 300, y: 300 };
    expect(magnetSnap(p, anchor, 30)).toEqual({ point: p, snapped: false });
  });
});

describe('resolveDrop', () => {
  it('equips when dropped on the cat', () => {
    expect(resolveDrop({ x: 150, y: 200 }, zone, 20, false)).toBe('equip');
    expect(resolveDrop({ x: 150, y: 200 }, zone, 20, true)).toBe('equip');
  });

  it('returns a grid item dropped outside the cat', () => {
    expect(resolveDrop({ x: 900, y: 600 }, zone, 20, false)).toBe('return');
  });

  it('unequips a worn item dragged outside the cat', () => {
    expect(resolveDrop({ x: 900, y: 600 }, zone, 20, true)).toBe('unequip');
  });
});
