import { describe, expect, it } from 'vitest';
import anchorsJson from '../../src/game/data/anchors.json';
import { CAT_SIZE, WORN_TAG, wornTagOffset } from '../../src/game/objects/dressup/layout';
import { SLOT_ORDER, anchorForSlot } from '../../src/game/domain/slots';
import type { AnchorsDef } from '../../src/game/domain/types';

const anchors = anchorsJson as unknown as AnchorsDef;
const k = CAT_SIZE / anchors.canvas.width;
/** The art of the tag is 120 x 184 with the thread tip at (60, 6). */
const TAG = { halfW: (120 / 2) * WORN_TAG.scale, h: (184 - 6) * WORN_TAG.scale };
/** A generous eye: 40 canvas px around its center, in each direction. */
const EYE = 40 * k;

const rectOf = (slot: (typeof SLOT_ORDER)[number]) => {
  const a = anchors.anchors[anchorForSlot(slot)];
  const o = wornTagOffset(slot);
  const x = (a.x - anchors.canvas.width / 2) * k + o.dx;
  const y = (a.y - anchors.canvas.width / 2) * k + o.dy;
  return { left: x - TAG.halfW, right: x + TAG.halfW, top: y, bottom: y + TAG.h };
};
const eyeRects = () =>
  ['eyeLeft', 'eyeRight'].map((n) => {
    const p = anchors.details[n]!;
    const x = (p.x - anchors.canvas.width / 2) * k;
    const y = (p.y - anchors.canvas.width / 2) * k;
    return { left: x - EYE, right: x + EYE, top: y - EYE, bottom: y + EYE };
  });
const overlaps = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe('the tag of a worn item does not cover the eyes of the cat (A5)', () => {
  it.each(['head', 'face'] as const)('slot %s', (slot) => {
    for (const eye of eyeRects()) expect(overlaps(rectOf(slot), eye), `${slot} tag over an eye`).toBe(false);
  });

  it('the other slots keep the old side spot', () => {
    for (const slot of SLOT_ORDER.filter((s) => s !== 'head' && s !== 'face')) {
      expect(wornTagOffset(slot)).toEqual({ dx: WORN_TAG.dx, dy: WORN_TAG.dy });
    }
  });
});
