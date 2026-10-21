import { describe, expect, it } from 'vitest';
import { GiftReveal } from '../../src/game/domain/giftReveal';

describe('GiftReveal (the prize is felt only when it lands)', () => {
  it('starts with nothing hidden and the real count', () => {
    const r = new GiftReveal();
    expect(r.isHidden('crown')).toBe(false);
    expect(r.shownCount(['royal'])).toBe(1);
  });

  it('hides the cell and holds the counter back while the prize flies', () => {
    const r = new GiftReveal();
    r.begin('royal', 'crown');
    expect(r.isHidden('crown')).toBe(true);
    expect(r.hiddenItems()).toEqual(['crown']);
    expect(r.shownCount(['snow', 'royal'])).toBe(1);
    expect(r.shownUnlocked(['snow', 'royal'])).toEqual(['snow']);
    expect(r.active).toBe(1);
  });

  it('shows the cell and raises the counter once it lands', () => {
    const r = new GiftReveal();
    r.begin('royal', 'crown');
    r.land('royal');
    expect(r.isHidden('crown')).toBe(false);
    expect(r.shownCount(['royal'])).toBe(1);
    expect(r.active).toBe(0);
  });

  it('landing something that never flew is harmless', () => {
    const r = new GiftReveal();
    r.land('nope');
    expect(r.active).toBe(0);
  });
});
