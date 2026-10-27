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
  Album: 'Album',
  PhotoMode: 'PhotoMode',
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

// Tokens v2 (ADR 0016, art-direction §4). Own namespace until F20.7 removes `Palette`:
// `cielo` differs between both (Palette.cielo #C4E6FF, Ink.cielo #CFE0F3).
export const Ink = {
  // Paper, ink and cards
  cremaPapel: '#FFFCF5',
  lineaCuadricula: '#C9DBF1',
  tarjeta: '#FFFFFF',
  borde: '#E8E0D2',
  sombraTarjeta: '#F4EEE3',
  tinta: '#1F1B1A',
  mutedTexto: '#6A5F57',
  lineaLapiz: '#8FA8E3',
  kraft: '#F1D1C0',
  // Brand colors
  cielo: '#CFE0F3',
  rosa: '#F6BFD0',
  sol: '#F3C04A',
  lila: '#D9CDF3',
  durazno: '#F1D1C0',
  naranjo: '#E98A2B',
  lapiz: '#3A5FC4',
  frambuesa: '#C2306B',
  tomate: '#C8372F',
  hoja: '#3F7D3B',
  // Face
  brilloOjo: '#FFFFFF',
  nariz: '#D9A48C',
} as const;
export type InkToken = keyof typeof Ink;

/**
 * Font stacks (ADR 0016). Gaegu has no accented Latin glyphs (á, é, ñ, ¡, ¿), so Voice falls back to
 * "Londrina Acentos": an alias of Londrina Solid that only covers those glyphs and is shrunk (`size-adjust`) to match
 * Gaegu, so one accented letter in the middle of a word does not look like a typo (F12.R M2).
 */
export const Fonts = {
  Title: "'Londrina Solid', sans-serif",
  Voice: "Gaegu, 'Londrina Acentos', 'Londrina Solid', sans-serif",
  Body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
} as const;

/** Self-hosted faces (`public/fonts/`, declared with @font-face in `public/style.css`). */
export const FontFaces = [
  { family: 'Londrina Solid', weight: 400, file: 'LondrinaSolid-400.woff2' },
  { family: 'Londrina Solid', weight: 900, file: 'LondrinaSolid-900.woff2' },
  { family: 'Gaegu', weight: 400, file: 'Gaegu-400.woff2' },
  { family: 'Gaegu', weight: 700, file: 'Gaegu-700.woff2' },
  { family: 'Londrina Acentos', weight: 400, file: 'LondrinaSolid-400.woff2' },
  { family: 'Londrina Acentos', weight: 700, file: 'LondrinaSolid-400.woff2' },
] as const;

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
  /** AlbumTabs: (id) a disabled tab was pressed */
  TabLocked: 'tab-locked',
  /** LayersPanel: (item: ClothingDef) */
  LayerRemove: 'layer-remove',
  /** GiftBox: (box, itemImage) the bow was pulled and the prize came out */
  GiftOpened: 'gift-opened',
  /** Button: pressed and released on it */
  ButtonClick: 'button-click',
  /** MuteButton: (muted: boolean) after toggling */
  MuteToggle: 'mute-toggle',
  /** FullscreenButton: (entering: boolean) after the tap */
  FullscreenToggle: 'fullscreen-toggle',
  /** NotebookButton: pressed and released on it */
  NotebookPress: 'notebook-press',
  /** MotionButton: (reduced: boolean) after toggling */
  MotionToggle: 'motion-toggle',
  /** Cat: the player petted it (a click on its body, with a cooldown) */
  CatPet: 'cat-pet',
  /** Cat: (item: ClothingDef, at: Point) the pointer entered a worn item */
  LayerHover: 'layer-hover',
  /** PriceTag: (tag) the player pressed and released the tag */
  PriceTagPress: 'price-tag-press',
  /** PurchaseSheet: [Llevar] was pressed; CheckoutSheet: [Llevar todo] was pressed and the wallet reaches */
  SheetConfirm: 'sheet-confirm',
  /** PurchaseSheet: [Todavia no] or a tap outside; CatSheet: a tap outside */
  SheetCancel: 'sheet-cancel',
  /** CheckoutSheet: [Llevar todo] was pressed but the wallet is short */
  SheetShort: 'sheet-short',
  /** CheckoutSheet: [Sacarme lo que no tengo] was pressed */
  SheetLeaveOut: 'sheet-leave-out',
  /** CheckoutSheet: the cross of a line was pressed (with the `CartLineRef` of the line) */
  SheetRemoveLine: 'sheet-remove-line',
  /** NameSign: (sign) the player touched the sign (the cat sheet opens) */
  SignPress: 'sign-press',
  /** Keychain: the flattened texture is ready and showing */
  KeychainReady: 'keychain-ready',
  /** Keychain: (strength: 0..1) the swing reached one end: the "tink" of the porcelain */
  KeychainTink: 'keychain-tink',
  /** Keychain: the swing came to rest */
  KeychainSwingEnd: 'keychain-swing-end',
  /** DyeJar: (jar, pointer) a dye bottle is being dragged */
  JarDragStart: 'jar-drag-start',
  JarDrag: 'jar-drag',
  JarDragEnd: 'jar-drag-end',
  /** DyeJar: (jar) pressed and released without dragging */
  JarClick: 'jar-click',
  /** PhotoTray: (kind, id) an unlocked piece was chosen */
  TrayPick: 'tray-pick',
  /** PhotoTray: (kind, id) a locked piece was pressed (it is only a sketch) */
  TrayLocked: 'tray-locked',
  /** PhotoTray: (stickerId, pointer) a sticker was pulled off the sheet */
  TrayStickerGrab: 'tray-sticker-grab',
  /** Sticker: (sticker, pointer) a sticker on the photo was picked up again */
  StickerGrab: 'sticker-grab',
} as const;

/** Scene events of DressUp that its controllers listen to (ADR 0019). */
export const DressUpEvents = {
  /** (item: ClothingDef) a worn item was dropped on the cat */
  ItemDropped: 'item-dropped',
  /** (item: ClothingDef) a worn item was removed */
  ItemRemoved: 'item-removed',
  /** the player pressed Ready */
  ReadyPressed: 'ready-pressed',
  /** (outfit: Outfit, cause: 'drop' | 'remove' | 'restore' | 'test') the outfit changed */
  OutfitChanged: 'outfit-changed',
  /** (catId: string) the cat changed */
  CatChanged: 'cat-changed',
  /** (flight: WalletFlight) a feature asks the wallet to fly buttons: into the purse (`in`) or out of it (`out`) */
  WalletFlight: 'wallet-flight',
  /** (item: ClothingDef) the player touched the price tag of an item that is not bought (on the cat or in its cell) */
  PriceTagPressed: 'price-tag-pressed',
  /** the player cannot pay: the purse shakes (blinks with reduced motion) */
  WalletShake: 'wallet-shake',
  /** (item: ClothingDef, dyeId: string) a dye bottle was dropped on a worn item and the color is on it (water included) */
  ItemDyed: 'item-dyed',
  /** (ids: string[]) items were just paid (a purchase or the till at Ready): a combo that waited for them can give its box */
  ItemsBought: 'items-bought',
} as const;

export const RegistryKeys = {
  CatId: 'catId',
  CatName: 'catName',
  Outfit: 'outfit',
  /** Validated catalog (cats, clothes, combos), set by the Preloader. */
  Catalog: 'catalog',
  /** Validated cat template anchors, set by the Preloader. */
  Anchors: 'anchors',
  /** Effective reduced motion (boolean), written by the MotionPlugin (ADR 0013). Scenes only read it. */
  ReducedMotion: 'reducedMotion',
  /** Dye by worn item (ItemDye), part of the session (ADR 0017). */
  ItemDye: 'itemDye',
  /** Immutable Progress; SavePlugin writes it on every change (ADR 0017). */
  Progress: 'progress',
  /** Last RatingResult, so Showcase and PhotoMode can recover it (ADR 0019). */
  LastRating: 'lastRating',
  /** Id of the cat whose look was last read on arrival (F14.5): only a different cat reads the look it finds. */
  ReadCat: 'readCat',
} as const;

/** Textures generated in code (particles). */
export const TextureKeys = {
  Heart: 'particle-heart',
  Sparkle: 'particle-sparkle',
  Snow: 'particle-snow',
  Petal: 'particle-petal',
  Confetti: 'particle-confetti',
  /** The four-point ink-outlined sparkle of the Lagatovino look (art-direction section 6.3). */
  InkSparkle: 'particle-ink-sparkle',
  /** The doodle cloud of ink that pops over a cat saying "puaj" (F12.R A1). */
  Scribble: 'particle-scribble',
  /** Second stage UI (F11.10 gives each one a placeholder SVG). */
  Coin: 'ui-coin',
  /** The jar of buttons of the wallet HUD. */
  Purse: 'ui-purse',
  PriceTag: 'ui-price-tag',
  /** The open scissors that cut the thread of a price tag. */
  Scissors: 'ui-scissors',
  Stamp: 'ui-stamp',
  StampSol: 'ui-stamp-sol',
  PencilMark: 'ui-pencil-mark',
  PaperCard: 'ui-paper-card',
  NotePolaroid: 'ui-note-polaroid',
  Notebook: 'ui-notebook',
  /** Dye art (white, tinted with the hex of the dye): a drop, the splash and the dot of color of a dyed item. */
  Drop: 'ui-drop',
  Splash: 'ui-splash',
  Dot: 'ui-dot',
} as const;

/** Textures of the keychain hardware and varnish (art/ui/keychain/, loaded by the Preloader from `UI_ART`, ADR 0021). */
export const KeychainTextures = {
  Eyelet: 'ui-keychain-ring-eyelet',
  RingSilver: 'ui-keychain-ring-silver',
  RingGold: 'ui-keychain-ring-gold',
  Charm: 'ui-keychain-charm-star',
  Chain: 'ui-keychain-chain',
  Varnish: 'ui-keychain-varnish',
  VarnishStreak: 'ui-keychain-varnish-streak',
} as const;

/** Global plugin keys (GameConfig.plugins.global). */
export const PluginKeys = {
  Audio: 'AudioPlugin',
  Save: 'SavePlugin',
  Motion: 'MotionPlugin',
  Dye: 'DyePlugin',
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
  /** Rating star stamped: soft "tump" (F12.11). */
  Stamp: 'sfx-stamp',
  /** Buttons flying into the purse: button against button (F12.11). */
  Clink: 'sfx-clink',
  /** Buying: scissors cutting the price tag thread (F12.11). */
  Snip: 'sfx-snip',
  /** Buying: very soft cash register (F12.11). */
  Register: 'sfx-register',
  /** Dyeing: picking up a dye bottle, the cork pops (F12.11). */
  Uncork: 'sfx-uncork',
  /** Dyeing: liquid "blup" when the color hits the garment (F12.11). */
  Blup: 'sfx-blup',
  /** Turning an album page (F12.11). */
  Paper: 'sfx-paper',
  /** Sticking washi tape (F12.11). */
  Tape: 'sfx-tape',
  /** Peeling a sticker off the sheet (F12.11). */
  Peel: 'sfx-peel',
  /** Keychain: the kiln "fuuu" (F12.11). */
  Oven: 'sfx-oven',
  /** Keychain: glassy "ching" of the varnish (F12.11). */
  Varnish: 'sfx-varnish',
  /** Keychain: metallic "tic" of the eyelet screwing in (F12.11). */
  Latch: 'sfx-latch',
  /** Keychain: little chain jingle (F12.11). */
  Chain: 'sfx-chain',
  /** Keychain: porcelain "tink" at each swing end (F12.11). */
  Porcelain: 'sfx-porcelain',
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
