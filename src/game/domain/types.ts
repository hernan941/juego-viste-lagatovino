// Pure TS domain types, no Phaser (ADR 0010).
import type { Slot } from './slots';

/** Catalog categories (tabs of the wardrobe). Each one maps to a slot of the same name. */
export const CATEGORIES = ['sweater', 'head', 'neck', 'face', 'paws', 'accessory', 'bottom'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Point {
  x: number;
  y: number;
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

export interface SaveData {
  version: number;
  catId: string | null;
  catName: string;
  outfit: Outfit;
  /** Ids of the combos whose secret reward is already unlocked. */
  secrets: string[];
  muted: boolean;
}
