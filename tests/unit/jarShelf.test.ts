import { describe, expect, it } from 'vitest';
import dyes from '../../src/game/data/dyes.json';
import { JAR_NAME_FONT, JAR_TAG_SPOT, jarRects, shelfCenters, SHELF } from '../../src/game/domain/jarShelf';
import type { Rect } from '../../src/game/domain/types';

const names = [...dyes.map((d) => d.name), 'Agua'];
const hit = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('jarShelf: the bottles on the dye shelf (T1)', () => {
  const centers = shelfCenters(names.length);
  const all = centers.map((c, i) => ({ name: names[i], ...jarRects(c, names[i]) }));

  it('lays the bottles in rows of the panel columns', () => {
    expect(centers).toHaveLength(names.length);
    expect(centers[1].x - centers[0].x).toBe(SHELF.step);
    expect(centers[SHELF.columns].y - centers[0].y).toBe(SHELF.rowStep);
  });

  it('hangs the tag at the neck, to the left of the bottle, and the names are small', () => {
    expect(JAR_TAG_SPOT.x).toBeLessThan(0);
    expect(JAR_TAG_SPOT.y).toBeLessThan(0);
    expect(JAR_NAME_FONT).toBeLessThanOrEqual(20);
  });

  it('no name, tag or bottle crosses another one (neighbors included)', () => {
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      expect(hit(a.label, a.tag), `${a.name}: tag over name`).toBe(false);
      for (let j = 0; j < all.length; j++) {
        if (i === j) continue;
        const b = all[j];
        expect(hit(a.label, b.label), `${a.name} / ${b.name}: names`).toBe(false);
        expect(hit(a.label, b.tag), `${a.name} name / ${b.name} tag`).toBe(false);
        expect(hit(a.tag, b.tag), `${a.name} / ${b.name}: tags`).toBe(false);
        expect(hit(a.tag, b.bottle), `${a.name} tag / ${b.name} bottle`).toBe(false);
        expect(hit(a.label, b.bottle), `${a.name} name / ${b.name} bottle`).toBe(false);
      }
    }
  });

  it('nothing leaves the 404 px panel', () => {
    for (const r of all) {
      for (const rect of [r.label, r.tag, r.bottle]) {
        expect(rect.x + SHELF.panelOffset).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width + SHELF.panelOffset).toBeLessThanOrEqual(404);
      }
    }
  });
});
