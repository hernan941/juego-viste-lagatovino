import { describe, expect, it } from 'vitest';
import { albumLines } from '../../src/game/domain/copy';
import { ALBUM_TABS, pageTally, resolveTab, swipeDirection, turnTo } from '../../src/game/domain/albumPages';

describe('album tabs', () => {
  it('has the five tabs of the design in order, all of them open (the hanger came with F19.5)', () => {
    expect(ALBUM_TABS.map((t) => t.id)).toEqual(['prendas', 'gatos', 'looks', 'tintes', 'colgador']);
    expect(ALBUM_TABS.filter((t) => !t.enabled)).toEqual([]);
  });

  it('every tab names its icon after the loaded album art', () => {
    for (const t of ALBUM_TABS) expect(t.icon).toBe(`ui-album-tab-${t.id}`);
  });
});

describe('resolveTab', () => {
  it('keeps an enabled tab', () => {
    expect(resolveTab('tintes')).toBe('tintes');
  });
  it('opens the hanger when asked for it', () => {
    expect(resolveTab('colgador')).toBe('colgador');
  });
  it('falls back to the first tab when it is missing or unknown', () => {
    for (const bad of [undefined, null, 3, 'nope']) expect(resolveTab(bad)).toBe('prendas');
  });
});

describe('turnTo', () => {
  it('moves to the next and the previous enabled tab', () => {
    expect(turnTo('prendas', 1)).toBe('gatos');
    expect(turnTo('gatos', -1)).toBe('prendas');
  });
  it('stays at the ends, and the hanger is the last page', () => {
    expect(turnTo('prendas', -1)).toBe('prendas');
    expect(turnTo('tintes', 1)).toBe('colgador');
    expect(turnTo('colgador', 1)).toBe('colgador');
  });
});

describe('swipeDirection', () => {
  it('a drag to the left turns forward and to the right turns back', () => {
    expect(swipeDirection(-120)).toBe(1);
    expect(swipeDirection(120)).toBe(-1);
  });
  it('a short drag does not turn the page', () => {
    expect(swipeDirection(30)).toBe(0);
    expect(swipeDirection(-59)).toBe(0);
  });
});

describe('pageTally', () => {
  const sections = {
    items: { got: 12, total: 50 }, tastes: { got: 3, total: 60 }, combos: { got: 1, total: 6 },
    dyes: { got: 2, total: 10 }, keychains: { got: 0, total: 12 },
  };
  it('each page counts its own section of the completion', () => {
    expect(pageTally('prendas', sections)).toEqual({ got: 12, total: 50 });
    expect(pageTally('gatos', sections)).toEqual({ got: 3, total: 60 });
    expect(pageTally('looks', sections)).toEqual({ got: 1, total: 6 });
    expect(pageTally('tintes', sections)).toEqual({ got: 2, total: 10 });
    expect(pageTally('colgador', sections)).toEqual({ got: 0, total: 12 });
  });
});

describe('album voice', () => {
  it('writes the tally and the locked hanger in Spanish', () => {
    expect(albumLines.tally({ got: 12, total: 50 })).toBe('12 de 50');
    expect(albumLines.hangerSoon).toMatch(/colgador/i);
  });
});
