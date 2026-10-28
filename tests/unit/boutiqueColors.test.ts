import { describe, expect, it } from 'vitest';
import { BOUTIQUE, STREET_SKETCH } from '../../src/game/systems/boutiqueColors';

describe('boutique palette (F12.R M1)', () => {
  it('the wall is paper, not rosa', () => {
    expect(BOUTIQUE.wall).toBe('tarjeta');
    expect(BOUTIQUE.brick).toBe('borde');
  });

  it('rosa lives only in the awning stripes', () => {
    const used = Object.entries(BOUTIQUE).filter(([, token]) => token === 'rosa').map(([part]) => part);
    expect(used).toEqual(['awningStripe']);
  });

  it('lila is for the door frame and the cornice; the plinth is durazno', () => {
    const used = Object.entries(BOUTIQUE).filter(([, token]) => token === 'lila').map(([part]) => part);
    expect(used.sort()).toEqual(['cornice', 'doorFrame']);
    expect(BOUTIQUE.plinth).toBe('durazno');
  });

  it('background buildings are a 3 px pencil sketch over 60% paper, with no color fill', () => {
    expect(STREET_SKETCH).toEqual({ line: 'lineaLapiz', width: 3, fill: 'cremaPapel', fillAlpha: 0.6 });
  });
});
