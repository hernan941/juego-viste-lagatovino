// Single source of keys and tokens (ADR 0010). No magic strings elsewhere.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const FONT_FAMILY = 'Fredoka';

export const SceneKeys = {
  Boot: 'Boot',
  Preloader: 'Preloader',
  Title: 'Title',
  CatSelect: 'CatSelect',
  ShopEntrance: 'ShopEntrance',
  DressUp: 'DressUp',
  Showcase: 'Showcase',
} as const;
export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

// Palette tokens from docs/art-direction.md.
export const Palette = {
  rosa50: '#FFF0F6',
  rosa200: '#FFD1E3',
  rosa400: '#FF8FB8',
  rosa600: '#E2578B',
  crema: '#FFF7EC',
  menta: '#BDEFD8',
  lavanda: '#D8CCFF',
  cielo: '#C4E6FF',
  mantequilla: '#FFF0A8',
  texto: '#5A3A48',
  contorno: '#4A3036',
} as const;
export type PaletteToken = keyof typeof Palette;

/** Hex string "#RRGGBB" to the number Phaser expects for fills. */
export function colorToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

export const Events = {
  SceneReady: 'scene-ready',
} as const;

export const RegistryKeys = {
  CatId: 'catId',
  CatName: 'catName',
  Outfit: 'outfit',
} as const;
