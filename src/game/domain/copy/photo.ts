// Pure TS. Texts of the photo mode.
import type { BrandDef, PhotoUnlock } from '../types';
import { withBrand } from './template';

export const photoLines = {
  /** Signature of the photo, from brand.json ("Xoxo, mau!"). */
  signature: (brand: BrandDef): string => withBrand(brand).signature,
  save: 'Guardar',
  keepDressing: 'Seguir vistiendo',
  saved: '¡Foto lista!',
  /** Names of the trays (the tabs of the photo table). */
  tabs: { backgrounds: 'Fondos', frames: 'Marcos', poses: 'Poses', stickers: 'Stickers' },
  full:'¡Ya no caben más stickers!',
  /** How to unlock a piece that is still locked; `setName` gives the name of a set by id. */
  unlockHint: (unlock: PhotoUnlock, setName: (id: string) => string | undefined): string => {
    if (unlock === 'starter') return '';
    if ('set' in unlock) return `Completa ${setName(unlock.set) ? `el set ${setName(unlock.set)}` : 'un set'}`;
    if ('albumPct' in unlock) return `Llena el ${unlock.albumPct} % del álbum`;
    return 'Consigue 5 estrellas';
  },
  caption: (catName: string): string => `${catName}, versión foto`,
};
