// Asset manifest derived from the catalog (ADR 0010): the Preloader loads exactly this list,
// so a new cat or clothing item only needs its JSON entry and its SVG in art/ (then `npm run art`).
import { EXPRESSIONS } from '../domain/expressions';
import type { CatDef, ClothingDef } from '../domain/types';

export interface AssetEntry {
  key: string;
  /** Path relative to public/. */
  path: string;
  /** Rasterization size in px (square). */
  size: number;
}

export const CAT_TEXTURE_SIZE = 768;
export const CLOTHING_TEXTURE_SIZE = 768;
export const ICON_TEXTURE_SIZE = 256;

export const faceKey = (expression: string) => `face-${expression}`;

/** File name of an item without the slot prefix: `sweater-rayas` in slot `sweater` is `rayas`. */
export function clothingAssetName(item: Pick<ClothingDef, 'id' | 'slot'>): string {
  const prefix = `${item.slot}-`;
  return item.id.startsWith(prefix) ? item.id.slice(prefix.length) : item.id;
}

export function buildManifest(cats: readonly CatDef[], clothes: readonly ClothingDef[]): AssetEntry[] {
  const entries: AssetEntry[] = [];
  // Cats are loaded without a face: the Cat object overlays the expression layers.
  for (const c of cats) entries.push({ key: c.texture, path: `assets/cats/noface/${c.id}.svg`, size: CAT_TEXTURE_SIZE });
  for (const e of EXPRESSIONS) entries.push({ key: faceKey(e), path: `assets/cats/base/face-${e}.svg`, size: CAT_TEXTURE_SIZE });
  for (const c of clothes) {
    const dir = `assets/clothes/${c.slot}/${clothingAssetName(c)}`;
    entries.push({ key: c.texture, path: `${dir}.svg`, size: CLOTHING_TEXTURE_SIZE });
    entries.push({ key: c.icon, path: `${dir}.icon.svg`, size: ICON_TEXTURE_SIZE });
  }
  return entries;
}
