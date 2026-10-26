// Asset manifest derived from the catalog (ADR 0010): the Preloader loads exactly this list,
// so a new cat or clothing item only needs its JSON entry and its SVG in art/ (then `npm run art`).
import { SfxKeys } from '../constants';
import { EXPRESSIONS } from '../domain/expressions';
import type { BrandDef, CatDef, ClothingDef, DyeDef, PhotoCatalog } from '../domain/types';

export interface AssetEntry {
  key: string;
  /** Path relative to public/. */
  path: string;
  /** Rasterization width in px (and height too, unless `height` is given). */
  size: number;
  /** Rasterization height in px, for art that is not square (UI, photo). */
  height?: number;
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

/** Cache key of the SVG source text of a dyeable item (loaded with `load.text`, ADR 0018). */
export const dyeSvgKey = (texture: string) => `${texture}:svg`;

/** The SVG texts the DyePlugin recolors: only the dyeable items. Paths are relative to public/. */
export function buildDyeSourceEntries(clothes: readonly ClothingDef[]): { key: string; path: string }[] {
  return clothes
    .filter((c) => c.dyeable)
    .map((c) => ({ key: dyeSvgKey(c.texture), path: `assets/clothes/${c.slot}/${clothingAssetName(c)}.svg` }));
}

/** Pieces of the photo mode by section: key prefix of the textures and folder of the files (art/photo/). */
export const PHOTO_SECTIONS = {
  backgrounds: { prefix: 'photo-bg-', dir: 'backgrounds', width: 540, height: 675 },
  frames: { prefix: 'photo-frame-', dir: 'frames', width: 540, height: 675 },
  stickers: { prefix: 'photo-sticker-', dir: 'stickers', width: 128, height: 128 },
} as const;

/** Pieces whose art is wider than the canvas of their section ("Xoxo, mau!" is a wide sticker). */
const WIDE_PHOTO_PIECES: Record<string, number> = { 'photo-sticker-xoxo': 144 };

/** Texture key prefix of the characters of brand.json (art/characters/<name>.svg). */
export const CHARACTER_PREFIX = 'char-';
export const CHARACTER_TEXTURE_SIZE = 256;

/** Id of the water tool: it clears a dye and is not a bottle, so dyes.json cannot use it (ADR 0017). */
export const WATER_ID = 'agua';

/** Texture key of a dye bottle (art/ui/dyes/dye-<id>.svg); the water tool is `dyeKey(WATER_ID)`. */
export const dyeKey = (id: string) => `ui-dye-${id}`;

interface UiArt {
  key: string;
  /** Path under art/ without the extension, e.g. `ui/shop/coin`. */
  file: string;
  width: number;
  height: number;
}
const ui = (key: string, file: string, width: number, height: number): UiArt => ({ key, file, width, height });

/** Fixed second-stage UI art (sizes are the viewBox of each SVG, checked in tests). Bottles and photo pieces come from the JSON. */
export const UI_ART: readonly UiArt[] = [
  ui('ui-coin', 'ui/shop/coin', 64, 64),
  ui('ui-price-tag', 'ui/shop/price-tag', 120, 184),
  ui('ui-purse', 'ui/shop/purse', 128, 160),
  ui('ui-scissors', 'ui/shop/scissors', 168, 120),
  ui('ui-drop', 'ui/dyes/drop', 48, 64),
  ui('ui-splash', 'ui/dyes/splash', 160, 160),
  ui('ui-dot', 'ui/dyes/dot', 24, 24),
  ui('ui-keychain-ring-eyelet', 'ui/keychain/ring-eyelet', 64, 80),
  ui('ui-keychain-ring-silver', 'ui/keychain/ring-silver', 128, 128),
  ui('ui-keychain-ring-gold', 'ui/keychain/ring-gold', 128, 128),
  ui('ui-keychain-charm-star', 'ui/keychain/charm-star', 96, 128),
  ui('ui-keychain-chain', 'ui/keychain/chain', 48, 192),
  ui('ui-keychain-varnish', 'ui/keychain/varnish', 512, 512),
  ui('ui-keychain-varnish-streak', 'ui/keychain/varnish-streak', 220, 512),
  ui('ui-keychain-package-card', 'ui/keychain/package-card', 540, 675),
  ui('ui-keychain-hanger-board', 'ui/keychain/hanger-board', 960, 540),
  ui('ui-notebook', 'ui/album/cover', 560, 700),
  ui('ui-album-page', 'ui/album/page', 1120, 620),
  ...['prendas', 'gatos', 'looks', 'tintes', 'colgador'].map((t) => ui(`ui-album-tab-${t}`, `ui/album/tab-${t}`, 220, 96)),
  ui('ui-paper-card', 'ui/runway/paper-card', 420, 392),
  ui('ui-stamp', 'ui/runway/stamp-star', 128, 128),
  ui('ui-stamp-sol', 'ui/runway/stamp-star-sol', 128, 128),
  ui('ui-pencil-mark', 'ui/runway/pencil-mark', 120, 44),
  ui('ui-note-polaroid', 'ui/runway/note-polaroid', 260, 300),
  ui('photo-jar', 'photo/jar', 144, 176),
];

/** Extra data the second-stage manifest is derived from (dyes.json, photo.json and brand.json). */
export interface ManifestExtras {
  dyes: readonly DyeDef[];
  photo: Pick<PhotoCatalog, 'backgrounds' | 'frames' | 'stickers'>;
  brand: Pick<BrandDef, 'judge' | 'seller'>;
}

function buildExtraEntries({ dyes, photo, brand }: ManifestExtras): AssetEntry[] {
  const entries: AssetEntry[] = UI_ART.map((a) => ({ key: a.key, path: `assets/${a.file}.svg`, size: a.width, height: a.height }));
  for (const id of [...dyes.map((d) => d.id), WATER_ID]) {
    entries.push({ key: dyeKey(id), path: `assets/ui/dyes/dye-${id}.svg`, size: 128, height: 176 });
  }
  for (const [section, def] of Object.entries(PHOTO_SECTIONS) as [keyof typeof PHOTO_SECTIONS, (typeof PHOTO_SECTIONS)[keyof typeof PHOTO_SECTIONS]][]) {
    for (const p of photo[section]) {
      const width = WIDE_PHOTO_PIECES[p.texture] ?? def.width;
      entries.push({ key: p.texture, path: `assets/photo/${def.dir}/${p.texture.slice(def.prefix.length)}.svg`, size: width, height: def.height });
    }
  }
  for (const c of [brand.judge, brand.seller]) {
    if (c.texture) entries.push({ key: c.texture, path: `assets/characters/${c.texture.slice(CHARACTER_PREFIX.length)}.svg`, size: CHARACTER_TEXTURE_SIZE });
  }
  return entries;
}

export function buildManifest(cats: readonly CatDef[], clothes: readonly ClothingDef[], extras?: ManifestExtras): AssetEntry[] {
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
  if (extras) entries.push(...buildExtraEntries(extras));
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
