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

/** Events emitted by the game objects (Cat, ItemGrid, Tabs, LayersPanel). */
export const ObjectEvents = {
  /** ItemGrid: (cell) pressed and released without dragging */
  ItemClick: 'item-click',
  /** ItemGrid / Cat: (item: ClothingDef, pointer) */
  ItemDragStart: 'item-drag-start',
  ItemDrag: 'item-drag',
  ItemDragEnd: 'item-drag-end',
  /** Tabs: (category) */
  TabSelect: 'tab-select',
  /** LayersPanel: (item: ClothingDef) */
  LayerRemove: 'layer-remove',
  /** GiftBox: (box, itemImage) the bow was pulled and the prize came out */
  GiftOpened: 'gift-opened',
  /** Button: pressed and released on it */
  ButtonClick: 'button-click',
  /** MuteButton: (muted: boolean) after toggling */
  MuteToggle: 'mute-toggle',
} as const;

export const RegistryKeys = {
  CatId: 'catId',
  CatName: 'catName',
  Outfit: 'outfit',
  /** Validated catalog (cats, clothes, combos), set by the Preloader. */
  Catalog: 'catalog',
  /** Validated cat template anchors, set by the Preloader. */
  Anchors: 'anchors',
} as const;

/** Textures generated in code (particles). */
export const TextureKeys = {
  Heart: 'particle-heart',
  Sparkle: 'particle-sparkle',
  Snow: 'particle-snow',
  Petal: 'particle-petal',
  Confetti: 'particle-confetti',
} as const;

/** Global plugin keys (GameConfig.plugins.global). */
export const PluginKeys = {
  Audio: 'AudioPlugin',
  Save: 'SavePlugin',
} as const;

/** Sound effect keys (docs/art-direction.md section 9). Files: public/assets/audio/<key>.{ogg,mp3}. */
export const SfxKeys = {
  /** Pick up an item: soft wool rub. */
  Grab: 'sfx-grab',
  /** Dragging: barely-there whisper (optional). */
  Drag: 'sfx-drag',
  /** Drop on the cat: padded pop (pair it with Purr). */
  Drop: 'sfx-drop',
  /** Short purr after dropping an item or petting the cat. */
  Purr: 'sfx-purr',
  /** Item returns to its grid cell: soft boing. */
  Return: 'sfx-return',
  /** Remove with the X: cloth sliding. */
  Remove: 'sfx-remove',
  Hover: 'sfx-hover',
  Click: 'sfx-click',
  /** Entering the shop: door bell. */
  Doorbell: 'sfx-doorbell',
  /** Downloading the photo: soft shutter. */
  Shutter: 'sfx-shutter',
  /** Typing the cat's name. */
  Key: 'sfx-key',
  /** Gift reveal: paper and ribbon (F8). */
  Gift: 'sfx-gift',
  Meow1: 'sfx-meow-1',
  Meow2: 'sfx-meow-2',
  Meow3: 'sfx-meow-3',
} as const;
export type SfxKey = (typeof SfxKeys)[keyof typeof SfxKeys];

/** Short meows to pick from at random for reactions. */
export const MEOW_KEYS: readonly SfxKey[] = [SfxKeys.Meow1, SfxKeys.Meow2, SfxKeys.Meow3];

/** Tab labels by catalog category (UI text in Spanish). */
export const CATEGORY_LABELS = {
  sweater: 'Sweaters',
  head: 'Gorros',
  neck: 'Bufandas',
  face: 'Lentes',
  paws: 'Patitas',
  accessory: 'Accesorios',
  bottom: 'Abajo',
} as const;
