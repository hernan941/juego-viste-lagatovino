import { describe, expect, it } from 'vitest';
import { albumLines } from '../../src/game/domain/copy/album';
import { dyeLines } from '../../src/game/domain/copy';

describe('album copy (L6, L7, T9)', () => {
  it('L6: the count of the cats says it counts tastes, not cats', () => {
    expect(albumLines.tastesTally({ got: 6, total: 60 })).toBe('6 de 60 gustos');
  });

  it('L7: the card of a sketch invites to try it for free in the fitting room', () => {
    expect(albumLines.itemSketch(70)).toBe('Cuesta 70 botones. En el probador es gratis');
    expect(albumLines.dyeSketch(50)).toBe('Cuesta 50 botones. En el probador es gratis');
  });

  it('T9: the dye tip says "sweater" like the rest of the game', () => {
    expect(dyeLines.tip).toBe('Arrastra el frasco a un sweater');
  });
});
