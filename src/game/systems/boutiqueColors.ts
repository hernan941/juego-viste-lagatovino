// Which Ink token paints each part of the boutique and of the street behind it (art-direction section 10, F12.R M1).
// The brand is paper and ink with accents: the wall is paper, `rosa` is only the awning, `lila` only the door frame and the cornice.
import type { InkToken } from '../constants';

export const BOUTIQUE = {
  wall: 'tarjeta',
  brick: 'borde',
  plinth: 'durazno',
  cornice: 'lila',
  awningStripe: 'rosa',
  awningPaper: 'tarjeta',
  doorFrame: 'lila',
  doorLeaf: 'durazno',
  doorInside: 'durazno',
} as const satisfies Record<string, InkToken>;

/** Background buildings: what is drawn in pencil is decoration, what is drawn in ink is the important thing. */
export const STREET_SKETCH = { line: 'lineaLapiz', width: 3, fill: 'cremaPapel', fillAlpha: 0.6 } as const satisfies {
  line: InkToken; width: number; fill: InkToken; fillAlpha: number;
};
