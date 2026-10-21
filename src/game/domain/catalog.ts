// Catalog queries for the wardrobe tabs and grid. Secret items stay out until unlocked (game-design.md).
import { CATEGORIES, type Category, type ClothingDef } from './types';

const isVisible = (c: ClothingDef) => c.secret !== true;

/** Categories that have at least one visible item, in the canonical tab order. */
export function visibleCategories(catalog: readonly ClothingDef[]): Category[] {
  return CATEGORIES.filter((cat) => catalog.some((c) => c.category === cat && isVisible(c)));
}

/** Items of a tab; `unlocked` are the secret item ids already won (they show up in catalog order). */
export function itemsInCategory(
  catalog: readonly ClothingDef[],
  category: Category,
  unlocked: ReadonlySet<string> = new Set(),
): ClothingDef[] {
  return catalog.filter((c) => c.category === category && (isVisible(c) || unlocked.has(c.id)));
}
