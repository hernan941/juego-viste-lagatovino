import { describe, expect, it } from 'vitest';
import { SLOT_ORDER, compareSlots, slotZIndex } from '../../src/game/domain/slots';

describe('slots (ADR 0003)', () => {
  it('orders slots from back to front', () => {
    expect(SLOT_ORDER).toEqual(['body', 'bottom', 'sweater', 'neck', 'head', 'face', 'paws', 'accessory']);
  });

  it('compareSlots sorts by z order', () => {
    expect(compareSlots('body', 'sweater')).toBeLessThan(0);
    expect(compareSlots('accessory', 'paws')).toBeGreaterThan(0);
    expect(compareSlots('neck', 'neck')).toBe(0);
  });

  it('can sort a shuffled list of slots', () => {
    expect((['accessory', 'body', 'head', 'bottom'] as const).slice().sort(compareSlots)).toEqual([
      'body', 'bottom', 'head', 'accessory',
    ]);
  });

  it('slotZIndex follows the order and rises with each slot', () => {
    expect(slotZIndex('body')).toBeLessThan(slotZIndex('bottom'));
    expect(slotZIndex('sweater')).toBeLessThan(slotZIndex('neck'));
    expect(slotZIndex('paws')).toBeLessThan(slotZIndex('accessory'));
  });
});
