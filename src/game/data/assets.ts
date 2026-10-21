// Asset manifest derived from the catalog (ADR 0010): the Preloader loads exactly this list,
// so a new cat or clothing item only needs its JSON entry and its SVG in art/ (then `npm run art`).
import { SfxKeys } from '../constants';
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

/** Texture key of a cat's tail layer (the body texture is loaded without its tail). */
export const catTailKey = (cat: Pick<CatDef, 'texture'>) => `${cat.texture}-tail`;

/** File name of an item without the slot prefix: `sweater-rayas` in slot `sweater` is `rayas`. */
export function clothingAssetName(item: Pick<ClothingDef, 'id' | 'slot'>): string {
  const prefix = `${item.slot}-`;
  return item.id.startsWith(prefix) ? item.id.slice(prefix.length) : item.id;
}

export function buildManifest(cats: readonly CatDef[], clothes: readonly ClothingDef[]): AssetEntry[] {
  const entries: AssetEntry[] = [];
  // Cats are loaded without face and tail: the Cat object overlays the expression layers and
  // animates the tail as its own layer behind the body.
  for (const c of cats) {
    entries.push({ key: c.texture, path: `assets/cats/noface/${c.id}.svg`, size: CAT_TEXTURE_SIZE });
    entries.push({ key: catTailKey(c), path: `assets/cats/tail/${c.id}.svg`, size: CAT_TEXTURE_SIZE });
  }
  for (const e of EXPRESSIONS) entries.push({ key: faceKey(e), path: `assets/cats/base/face-${e}.svg`, size: CAT_TEXTURE_SIZE });
  for (const c of clothes) {
    const dir = `assets/clothes/${c.slot}/${clothingAssetName(c)}`;
    entries.push({ key: c.texture, path: `${dir}.svg`, size: CLOTHING_TEXTURE_SIZE });
    entries.push({ key: c.icon, path: `${dir}.icon.svg`, size: ICON_TEXTURE_SIZE });
  }
  return entries;
}

export interface AudioEntry {
  key: string;
  /** Paths relative to public/, in order of preference (ogg first, mp3 as fallback). */
  urls: [string, string];
}

/** Every sound effect the Preloader loads (ADR 0009). */
export function buildAudioManifest(): AudioEntry[] {
  return Object.values(SfxKeys).map((key) => ({ key, urls: [`assets/audio/${key}.ogg`, `assets/audio/${key}.mp3`] }));
}
