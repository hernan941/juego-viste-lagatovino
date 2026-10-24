import { describe, expect, it } from 'vitest';
import {
  MIN_TOUCH_CSS, applyLift, dragThreshold, isDragPointer, landscapeScale, liftOffset, minHitExtent, shouldShowFullscreen, shouldShowRotateHint,
} from '../../src/game/systems/touch';

describe('landscapeScale', () => {
  it('is the FIT scale of the 1280 x 720 canvas in landscape, whatever way the phone is held', () => {
    expect(landscapeScale(1280, 720)).toBe(1);
    expect(landscapeScale(863, 360)).toBeCloseTo(0.5);
    expect(landscapeScale(360, 863)).toBeCloseTo(0.5);
    expect(landscapeScale(1920, 1080)).toBeCloseTo(1.5);
  });

  it('never returns zero or NaN for a window with no size', () => {
    expect(landscapeScale(0, 0)).toBeGreaterThan(0);
  });
});

describe('minHitExtent', () => {
  it('grows a small drawing to 44 css px (about 88 game units on a 0.5 phone)', () => {
    expect(MIN_TOUCH_CSS).toBe(44);
    expect(minHitExtent(54, 0.5)).toBeCloseTo(88);
  });

  it('keeps a drawing that is already big enough', () => {
    expect(minHitExtent(104, 0.5)).toBe(104);
  });

  it('does not exceed the cap (so neighbours do not overlap)', () => {
    expect(minHitExtent(54, 0.5, 64)).toBe(64);
  });

  it('a big cap below the drawing never shrinks it', () => {
    expect(minHitExtent(70, 0.5, 64)).toBe(70);
  });
});

describe('liftOffset', () => {
  it('is zero with the mouse', () => {
    expect(liftOffset(false, 0.5)).toEqual({ x: 0, y: 0 });
  });

  it('lifts the garment above the finger by about 64 css px', () => {
    expect(liftOffset(true, 0.5).x).toBe(0);
    expect(liftOffset(true, 0.5).y).toBeCloseTo(-128);
  });

  it('stays in a sane range on very small and very big screens', () => {
    expect(liftOffset(true, 0.1).y).toBe(-160);
    expect(liftOffset(true, 3).y).toBe(-60);
  });
});

describe('applyLift', () => {
  it('moves the point by the offset', () => {
    expect(applyLift({ x: 500, y: 400 }, { x: 0, y: -100 }, { width: 1280, height: 720 })).toEqual({ x: 500, y: 300 });
  });

  it('keeps the garment inside the canvas', () => {
    expect(applyLift({ x: 500, y: 40 }, { x: 0, y: -100 }, { width: 1280, height: 720 })).toEqual({ x: 500, y: 0 });
    expect(applyLift({ x: 1300, y: 400 }, { x: 0, y: 0 }, { width: 1280, height: 720 })).toEqual({ x: 1280, y: 400 });
  });
});

describe('dragThreshold', () => {
  it('is 8 game px with the mouse', () => {
    expect(dragThreshold(false, 0.5)).toBe(8);
  });

  it('is about 10 css px with a finger, so a shaky tap is not a drag', () => {
    expect(dragThreshold(true, 0.5)).toBeCloseTo(20);
  });

  it('never goes under the mouse threshold', () => {
    expect(dragThreshold(true, 3)).toBe(8);
  });
});

describe('isDragPointer', () => {
  it('only the pointer that grabbed owns the drag; a second finger is ignored', () => {
    expect(isDragPointer(1, 1)).toBe(true);
    expect(isDragPointer(1, 2)).toBe(false);
    expect(isDragPointer(null, 1)).toBe(false);
  });
});

describe('shouldShowRotateHint', () => {
  it('shows only on a coarse pointer held in portrait', () => {
    expect(shouldShowRotateHint({ coarse: true, portrait: true })).toBe(true);
    expect(shouldShowRotateHint({ coarse: true, portrait: false })).toBe(false);
    expect(shouldShowRotateHint({ coarse: false, portrait: true })).toBe(false);
  });
});

describe('shouldShowFullscreen', () => {
  it('needs a touch device and the Fullscreen API', () => {
    expect(shouldShowFullscreen({ touch: true, available: true })).toBe(true);
    expect(shouldShowFullscreen({ touch: true, available: false })).toBe(false);
    expect(shouldShowFullscreen({ touch: false, available: true })).toBe(false);
  });
});
