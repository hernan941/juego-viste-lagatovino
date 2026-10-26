// Pure TS domain types, no Phaser (ADR 0010).
import type { Slot } from './slots';

/** Catalog categories (tabs of the wardrobe). Each one maps to a slot of the same name. */
export const CATEGORIES = ['sweater', 'head', 'neck', 'face', 'paws', 'accessory', 'bottom'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Anchor names of the cat template (art/anchors.json). */
export const ANCHOR_NAMES = ['head', 'eyes', 'neck', 'torso', 'paws'] as const;
export type AnchorName = (typeof ANCHOR_NAMES)[number];

/** Box names of the cat template, used as hit areas of worn items. */
export const BOX_NAMES = ['head', 'torso', 'paws', 'tail'] as const;
export type BoxName = (typeof BOX_NAMES)[number];

/** Shared canvas geometry of every cat and item (ADR 0003), in px of the 512 canvas. */
export interface AnchorsDef {
  canvas: { width: number; height: number };
  anchors: Record<AnchorName, Point>;
  details: Record<string, Point>;
  boxes: Record<BoxName, Rect>;
  dropZone: Rect;
}

export interface CatDef {
  id: string;
  name: string;
  /** Human readable coat description (art-direction.md section 2). */
  coat: string;
  texture: string;
  /** Tastes of the cat (ADR 0017, cats.json). Optional until F11.10 fills the 12 cats. */
  prefs?: CatPrefs;
}

/** What a cat loves and hates; discovering them pays coins (ADR 0017). */
export interface CatPrefs {
  /** Tags of the items it loves. */
  loves: string[];
  /** Tags of the items it dislikes. */
  dislikes: string[];
  favoriteItem: string;
  favoriteDye: string;
  /** Short hint shown in the cat card. */
  hint: string;
}

/** Price tier of a visible item (economy.json -> prices). Secret items have none. */
export type ItemTier = 'basica' | 'linda' | 'lujo';

export interface ClothingDef {
  id: string;
  name: string;
  slot: Slot;
  category: Category;
  texture: string;
  icon: string;
  /** Per-item nudge applied on top of the slot anchor (ADR 0003). */
  offset?: Point;
  /** Secret items are hidden from the grid until a combo unlocks them. */
  secret?: boolean;
  /** Price tier. Every visible item has `tier` or `starter`, never both (ADR 0017). */
  tier?: ItemTier;
  /** Free from the start. */
  starter?: boolean;
  /** Can be dyed (the SVG has data-dye marks, ADR 0018). */
  dyeable?: boolean;
  tags: string[];
}

/** A combo requirement: a specific item, or any item carrying a tag in a given slot. */
export type ComboRequirement = { itemId: string } | { slot: Slot; tag: string };

export interface ComboDef {
  id: string;
  name: string;
  requires: ComboRequirement[];
  reaction: string;
  rewardItemId: string;
}

/** Equipped item ids by slot. At most one item per slot (ADR 0003). */
export type Outfit = Readonly<Partial<Record<Slot, string>>>;

// Stays 1 until F11.11 brings the v2 save (ADR 0017).
export const SAVE_VERSION = 1;

/** Motion preference (ADR 0013): 'auto' follows the browser, the other two are the player's choice and win over it. */
export type MotionPref = 'auto' | 'reduce' | 'full';

export interface SaveData {
  version: number;
  catId: string | null;
  catName: string;
  outfit: Outfit;
  /** Ids of the combos whose secret reward is already unlocked. */
  secrets: string[];
  muted: boolean;
  /** ADR 0013. Missing or invalid in old saves: read as 'auto', so no migration. */
  motion: MotionPref;
}

// ---- Second stage (ADRs 0015, 0017, 0019, 0021) ----

export type Stars = 1 | 2 | 3 | 4 | 5;

/** Dye applied to each worn item: itemId -> dyeId. The color lives on the item, not the slot (ADR 0018). */
export type ItemDye = Record<string, string>;

/** A dye bottle (dyes.json). The price comes from economy.json. */
export interface DyeDef {
  id: string;
  name: string;
  /** "#RRGGBB" */
  hex: string;
  starter?: boolean;
}

/** Judge and seller (brand.json). Data lives in brand.json, not in characters (ADR 0017). */
export interface CharacterDef {
  name: string;
  /** Optional texture key; it must exist in the manifest. */
  texture?: string;
}

export interface BrandDef {
  judge: CharacterDef;
  seller: CharacterDef;
  shopSign: string;
  packagingLine: string;
  reverseLine: string;
  signature: string;
}

/** Scoring rules (economy.json -> scoring). */
export interface ScoringRules {
  weights: {
    style: number;
    love: number;
    dislike: number;
    complete: number;
    combo: number;
    favoriteItem: number;
    favoriteDye: number;
  };
  /** Point caps. `combo` and `color` are optional: they default to two combos and two dyed items. */
  caps: { style: number; love: number; combo?: number; color?: number };
  /** Minimum points for 2, 3, 4 and 5 stars (strictly increasing). */
  starThresholds: [number, number, number, number];
  /** Technical tags that never count as style. */
  ignoredTags: string[];
}

/** Game balance (economy.json). */
export interface EconomyRules {
  startWallet: number;
  scoring: ScoringRules;
  prices: Record<ItemTier, number> & { dye: number };
  payout: {
    /** Coins by stars for a new look. */
    byStars: Record<Stars, number>;
    /** Factor for a look that changes in one slot only. */
    nearFactor: number;
    /** Tip for a repeated look. */
    tip: number;
  };
  /** First time a cat reaches 3, 4 and 5 stars. */
  milestones: { threeStars: number; fourStars: number; fiveStars: number };
  novelty: {
    /** How many recent rated looks per cat are compared. */
    window: number;
  };
  discoveryBonus: number;
  comboBonus: number;
}

/** Requirements and reward of a collection set (sets.json). */
export interface SetDef {
  id: string;
  name: string;
  requires: {
    items?: string[];
    dyes?: string[];
    combos?: string[];
    keychains?: { count: number; minStars: Stars };
  };
  /** Ids of photo.json entries unlocked by the set. */
  reward: string[];
}

/** How a photo-mode piece unlocks (derived, never stored). */
export type PhotoUnlock = 'starter' | { set: string } | { albumPct: number } | { firstFiveStar: true };

export interface PhotoPiece {
  id: string;
  name: string;
  texture: string;
  unlock: PhotoUnlock;
}

/** Keychain rules (photo.json -> keychain, ADR 0021). */
export interface KeychainRules {
  /** Stars from which the ring is gold, and from which it also has the charm. */
  goldFrom: Stars;
  charmFrom: Stars;
  borderCopies: number;
  borderRadius: number;
  borderColor: string;
  varnishAlpha: number;
}

export interface PhotoCatalog {
  backgrounds: PhotoPiece[];
  frames: PhotoPiece[];
  stickers: PhotoPiece[];
  poses: PhotoPiece[];
  keychain: KeychainRules;
}

export interface PlacedSticker {
  id: string;
  x: number;
  y: number;
  angle: number;
}

/** Saved keychain: a recipe, not an image (ADR 0021). The ring is derived from the stars. */
export interface KeychainRecipe {
  catId: string;
  catName: string;
  outfit: Outfit;
  itemDye: ItemDye;
  pose: string;
  stars: Stars;
  photo: { background: string; frame: string; stickers: PlacedSticker[] };
  /** ISO date. */
  createdAt: string;
}

/** 'love:<tag>' | 'dislike:<tag>' | 'favorite' | 'color' */
export type TasteKey = string;

/** Progress as stored (ADR 0017). A missing wallet means economy.json -> startWallet. */
export interface StoredProgress {
  wallet?: number;
  /** Bought items (not starters nor secrets, which are derived). */
  owned: string[];
  /** Bought bottles (not starters). */
  dyesOwned: string[];
  /** Combos won. */
  secrets: string[];
  tastesFound: Record<string, TasteKey[]>;
  bestStars: Record<string, Stars>;
  /** Last signatures per cat, newest last. */
  ratedLooks: Record<string, string[]>;
  keychains: Record<string, KeychainRecipe>;
  albumSeen: string[];
}

/** Progress in memory, immutable: every change makes a new object (ADR 0017). */
export type Progress = Required<StoredProgress>;

export type BreakdownKind = 'style' | 'love' | 'dislike' | 'complete' | 'combo' | 'favoriteItem' | 'favoriteDye';

/** One line of the judge's card. */
export interface BreakdownLine {
  kind: BreakdownKind;
  points: number;
  /** Tag, item or combo id that caused the line. */
  ref?: string;
}

export interface RatingResult {
  points: number;
  stars: Stars;
  breakdown: BreakdownLine[];
}

/** Things the ceremony replays after the progress was applied (ADR 0017). */
export type ProgressEvent =
  | { type: 'coins'; amount: number }
  | { type: 'milestone'; stars: 3 | 4 | 5; amount: number }
  | { type: 'tasteFound'; taste: TasteKey; amount: number }
  | { type: 'comboFirst'; comboId: string; amount: number }
  | { type: 'setCompleted'; setId: string }
  | { type: 'unlock'; ids: string[] };
