import { describe, expect, it } from 'vitest';
import {
  classifyGesture, clampScroll, contentHeight, maxScroll, offsetToReveal, scrollbarThumb, smoothStep, wheelTarget,
} from '../../src/game/domain/scroll';

describe('contentHeight', () => {
  it('is 0 without items', () => {
    expect(contentHeight(0, 3, 104, 22, 8)).toBe(0);
  });
  it('counts the rows, the gaps between them and the padding on both sides', () => {
    expect(contentHeight(1, 3, 104, 22, 8)).toBe(104 + 16);
    expect(contentHeight(3, 3, 104, 22, 8)).toBe(104 + 16);
    expect(contentHeight(4, 3, 104, 22, 8)).toBe(2 * 104 + 22 + 16);
    expect(contentHeight(16, 3, 104, 22, 0)).toBe(6 * 104 + 5 * 22);
  });
});

describe('maxScroll and clampScroll', () => {
  it('cannot scroll when the content fits', () => {
    expect(maxScroll(300, 470)).toBe(0);
    expect(maxScroll(470, 470)).toBe(0);
    expect(clampScroll(50, 300, 470)).toBe(0);
  });
  it('allows scrolling up to content minus view', () => {
    expect(maxScroll(750, 470)).toBe(280);
    expect(clampScroll(-30, 750, 470)).toBe(0);
    expect(clampScroll(120, 750, 470)).toBe(120);
    expect(clampScroll(900, 750, 470)).toBe(280);
  });
});

describe('wheelTarget', () => {
  it('moves the target by the wheel delta and keeps it inside the limits', () => {
    expect(wheelTarget(0, 100, 750, 470)).toBe(100);
    expect(wheelTarget(250, 100, 750, 470)).toBe(280);
    expect(wheelTarget(20, -100, 750, 470)).toBe(0);
  });
  it('applies a speed factor', () => {
    expect(wheelTarget(0, 100, 750, 470, 0.5)).toBe(50);
  });
});

describe('smoothStep', () => {
  it('moves toward the target without overshooting', () => {
    const a = smoothStep(0, 100, 16.7);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(100);
  });
  it('does not depend on the frame rate', () => {
    let fast = 0;
    for (let i = 0; i < 6; i++) fast = smoothStep(fast, 100, 10);
    const slow = smoothStep(0, 100, 60);
    expect(fast).toBeCloseTo(slow, 5);
  });
  it('snaps to the target when it is closer than half a pixel and when dt is huge', () => {
    expect(smoothStep(99.8, 100, 16)).toBe(100);
    expect(smoothStep(0, 100, 100000)).toBe(100);
  });
  it('returns the current value when there is nothing to do', () => {
    expect(smoothStep(40, 40, 16)).toBe(40);
    expect(smoothStep(0, 100, 0)).toBe(0);
  });
});

describe('offsetToReveal', () => {
  // 3 columns, cells of 104, gap 22, padding 8: row r spans [8 + 126r, 8 + 126r + 104].
  const args = [3, 104, 22, 8] as const;
  it('keeps the offset when the row is already visible', () => {
    expect(offsetToReveal(4, ...args, 0, 470)).toBe(0);
  });
  it('scrolls down just enough to show a row below the view', () => {
    // item 15 is on row 5: bottom at 8 + 630 + 104 = 742; view 470 -> offset 272 + padding 8.
    expect(offsetToReveal(15, ...args, 0, 470)).toBe(742 + 8 - 470);
  });
  it('scrolls up to show a row above the view', () => {
    expect(offsetToReveal(0, ...args, 200, 470)).toBe(0);
    expect(offsetToReveal(3, ...args, 280, 470)).toBe(134 - 8);
  });
});

describe('classifyGesture', () => {
  it('waits until the pointer moved past the threshold', () => {
    expect(classifyGesture(2, 3, 8)).toBe('pending');
    expect(classifyGesture(0, 0, 8)).toBe('pending');
  });
  it('a mostly vertical move scrolls the grid', () => {
    expect(classifyGesture(2, 12, 8)).toBe('scroll');
    expect(classifyGesture(-3, -20, 8)).toBe('scroll');
  });
  it('a horizontal or diagonal move drags the item', () => {
    expect(classifyGesture(14, 2, 8)).toBe('item');
    expect(classifyGesture(-12, 10, 8)).toBe('item');
    expect(classifyGesture(10, 12, 8)).toBe('item');
  });
});

describe('scrollbarThumb', () => {
  it('hides when there is nothing to scroll', () => {
    expect(scrollbarThumb(0, 300, 470, 470, 40)).toBeNull();
  });
  it('sizes the thumb by the visible fraction and keeps a minimum', () => {
    expect(scrollbarThumb(0, 940, 470, 470, 40)).toEqual({ y: 0, height: 235 });
    expect(scrollbarThumb(0, 47000, 470, 470, 40)?.height).toBe(40);
  });
  it('moves the thumb along the track with the offset', () => {
    const end = scrollbarThumb(280, 750, 470, 470, 40)!;
    expect(end.y + end.height).toBeCloseTo(470, 5);
    const mid = scrollbarThumb(140, 750, 470, 470, 40)!;
    expect(mid.y).toBeGreaterThan(0);
    expect(mid.y).toBeLessThan(end.y);
  });
});
