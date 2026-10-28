import { describe, expect, it } from 'vitest';
import { KIT_MIN_HIT, STAMP_TILT, TAB_RISE, gridLines, hoverTarget, kitHitSize, pressTarget, stampColors, stampHover, tabLayout } from '../../src/game/systems/kit';

describe('stamp buttons (round v2, F12.R A3)', () => {
  it('rest: white disc with ink icon; hover inverts them', () => {
    expect(stampColors(false)).toEqual({ fill: 'tarjeta', icon: 'tinta' });
    expect(stampColors(true)).toEqual({ fill: 'tinta', icon: 'cremaPapel' });
  });

  it('hover adds 1 degree to the resting tilt, none with reduced motion', () => {
    expect(stampHover(-2, false)).toEqual({ scale: 1.04, angle: -1 });
    expect(stampHover(-2, true)).toEqual({ scale: 1.04, angle: -2 });
  });

  it('each stamp rests with its own small tilt', () => {
    expect(STAMP_TILT).toEqual({ mute: -2, motion: 1 });
  });
});

describe('kit feedback (art-direction §8)', () => {
  it('press scales to 0.95 and drops 2 px', () => {
    expect(pressTarget()).toEqual({ scale: 0.95, dy: 2, duration: 100 });
  });

  it('hover scales 1.04 and rotates 1 degree', () => {
    expect(hoverTarget(false)).toEqual({ scale: 1.04, angle: 1 });
  });

  it('hover has no rotation with reduced motion', () => {
    expect(hoverTarget(true)).toEqual({ scale: 1.04, angle: 0 });
  });
});

describe('kitHitSize', () => {
  it('is at least 80 although the drawing is smaller', () => {
    expect(kitHitSize(40, 30)).toEqual({ width: KIT_MIN_HIT, height: KIT_MIN_HIT });
  });
  it('keeps the drawing when it is bigger', () => {
    expect(kitHitSize(240, 92)).toEqual({ width: 240, height: 92 });
  });
});

describe('tabLayout', () => {
  it('lays tabs out left to right with a gap', () => {
    const l = tabLayout(3, 1, 60, 8);
    expect(l.map((t) => t.x)).toEqual([0, 68, 136]);
  });
  it('the active tab rises TAB_RISE px more', () => {
    const l = tabLayout(3, 1, 60, 8);
    expect(l[1]!.rise).toBe(TAB_RISE);
    expect(l[0]!.rise).toBe(0);
    expect(TAB_RISE).toBe(10);
  });
  it('no active tab (-1) raises none', () => {
    expect(tabLayout(2, -1, 60, 8).every((t) => t.rise === 0)).toBe(true);
  });
});

describe('gridLines (paper background)', () => {
  it('has a line every step from 0 up to the edge', () => {
    const g = gridLines(1280, 720, 24);
    expect(g.vertical[0]).toBe(0);
    expect(g.vertical).toHaveLength(54);
    expect(g.vertical[53]).toBe(1272);
    expect(g.horizontal).toHaveLength(31);
    expect(g.horizontal[30]).toBe(720);
  });
  it('is empty for a degenerate step', () => {
    expect(gridLines(100, 100, 0)).toEqual({ vertical: [], horizontal: [] });
  });
});
