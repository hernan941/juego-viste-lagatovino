import { describe, expect, it } from 'vitest';
import { ALBUM_TABS, sectionOf } from '../../src/game/domain/albumPages';
import { albumLines } from '../../src/game/domain/copy';
import { ALBUM_MILESTONES } from '../../src/game/domain/album';

describe('sectionOf', () => {
  it('maps each tab to the section of the album it shows', () => {
    expect(ALBUM_TABS.map((t) => sectionOf(t.id))).toEqual(['items', 'tastes', 'combos', 'dyes', 'keychains']);
  });
});

describe('the cover and the milestones (F17.5)', () => {
  it('writes the percentage by hand and the sets', () => {
    expect(albumLines.coverTitle).toBe('Mi álbum');
    expect(albumLines.coverPercent(42)).toBe('Llevas el 42 %');
    expect(albumLines.coverSets(2, 7)).toBe('Sets: 2 de 7');
  });
  it('has a stamp and a prize line for every milestone', () => {
    for (const m of ALBUM_MILESTONES) {
      expect(albumLines.milestoneStamp(m)).toContain(`${m}`);
      expect(albumLines.milestonePrize(m).length).toBeGreaterThan(3);
    }
  });
});
