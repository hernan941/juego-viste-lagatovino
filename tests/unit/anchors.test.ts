import { describe, expect, it } from 'vitest';
import artAnchors from '../../art/anchors.json';
import anchors from '../../src/game/data/anchors.json';
import { validateAnchors } from '../../src/game/data/schema';
import { SLOT_ORDER, anchorForSlot, hitBoxForSlot } from '../../src/game/domain/slots';

describe('anchors.json', () => {
  it('is a valid anchors definition', () => {
    expect(validateAnchors(anchors).ok).toBe(true);
  });

  it('is an exact copy of art/anchors.json (single source of truth is the art folder)', () => {
    expect(anchors).toEqual(artAnchors);
  });
});

describe('validateAnchors', () => {
  const good = () => structuredClone(anchors) as unknown as Record<string, unknown>;

  it('rejects a non object', () => {
    expect(validateAnchors(null).ok).toBe(false);
  });

  it('names the missing anchor', () => {
    const bad = good();
    delete (bad.anchors as Record<string, unknown>).torso;
    const r = validateAnchors(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain('anchors.torso');
  });

  it('rejects non numeric points and rects', () => {
    const bad = good();
    (bad.anchors as Record<string, unknown>).head = { x: 'a', y: 1 };
    bad.dropZone = { x: 0, y: 0, width: 10 };
    const r = validateAnchors(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join()).toContain('anchors.head');
      expect(r.errors.join()).toContain('dropZone');
    }
  });

  it('rejects a missing canvas or box', () => {
    const bad = good();
    bad.canvas = { width: 0, height: 512 };
    delete (bad.boxes as Record<string, unknown>).head;
    const r = validateAnchors(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join()).toContain('canvas');
      expect(r.errors.join()).toContain('boxes.head');
    }
  });
});

describe('slot to anchor and hit box', () => {
  it('maps every slot to an existing anchor and box', () => {
    for (const slot of SLOT_ORDER) {
      expect(anchors.anchors).toHaveProperty(anchorForSlot(slot));
      expect(anchors.boxes).toHaveProperty(hitBoxForSlot(slot));
    }
  });

  it('uses the expected regions', () => {
    expect(anchorForSlot('sweater')).toBe('torso');
    expect(anchorForSlot('head')).toBe('head');
    expect(anchorForSlot('face')).toBe('eyes');
    expect(hitBoxForSlot('head')).toBe('head');
    expect(hitBoxForSlot('sweater')).toBe('torso');
    expect(hitBoxForSlot('paws')).toBe('paws');
  });
});
