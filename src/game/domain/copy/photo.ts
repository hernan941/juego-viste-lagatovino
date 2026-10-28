// Pure TS. Texts of the photo mode.
import type { BrandDef, PhotoUnlock } from '../types';
import { withBrand } from './template';

/** How far the player is toward a locked piece: the pieces of its set (and the ones missing), the percent of the notebook, the best stars. */
export interface UnlockProgress {
  set?: { got: number; total: number; missing: string[] };
  pct?: number;
  best?: number;
}

export const photoLines = {
  /** Signature of the photo, from brand.json ("Xoxo, mau!"). */
  signature: (brand: BrandDef): string => withBrand(brand).signature,
  save: 'Guardar',
  keepDressing: 'Seguir vistiendo',
  saved: 'Foto lista!',
  /** Names of the trays (the tabs of the photo table). */
  tabs: { backgrounds: 'Fondos', frames: 'Marcos', poses: 'Poses', stickers: 'Stickers' },
  full:'Foto llena de stickers!',
  /** How to unlock a piece that is still locked; `setName` gives the name of a set by id, and `progress` how far the player is (F4). */
  unlockHint: (unlock: PhotoUnlock, setName: (id: string) => string | undefined, progress: UnlockProgress = {}): string => {
    if (unlock === 'starter') return '';
    if ('set' in unlock) {
      const name = setName(unlock.set);
      const set = progress.set;
      // One piece left: the hint names it ("Te falta Mitones...").
      if (name && set && set.missing.length === 1) return `Te falta ${set.missing[0]} para el set ${name}`;
      const count = set ? ` (${set.got} de ${set.total})` : '';
      return `Completa ${name ? `el set ${name}` : 'un set'}${count}`;
    }
    if ('albumPct' in unlock) return `Llena el ${unlock.albumPct} % del cuaderno${progress.pct === undefined ? '' : ` (vas en ${progress.pct} %)`}`;
    return `Consigue 5 estrellas${progress.best ? ` (tu mejor: ${progress.best})` : ''}`;
  },
  caption: (catName: string): string => `${catName}, en modo foto`,
};
