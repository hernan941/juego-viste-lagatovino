// The names a taste chip needs (items, dyes and the readable tags), read from the catalog the DressUp controllers share.
import type { NameLookup } from '../../domain/catSheet';
import { tagLabel } from '../../domain/copy';
import type { DressUpContext } from './DressUpController';
import type { DyeDef, TagNames } from '../../domain/types';

export function nameLookup({ catalog }: Pick<DressUpContext, 'catalog'>): NameLookup {
  // The catalog is the whole GameData at runtime; small fixtures may lack dyes or tags.
  const extra = catalog as unknown as { dyes?: DyeDef[]; tags?: TagNames };
  const dyes = extra.dyes ?? [];
  return {
    tag: (id) => tagLabel(extra.tags, id),
    item: (id) => catalog.clothes.find((c) => c.id === id)?.name ?? id,
    dye: (id) => dyes.find((d) => d.id === id)?.name ?? id,
    dyeHex: (id) => dyes.find((d) => d.id === id)?.hex,
  };
}
