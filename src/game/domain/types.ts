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
}

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
