// Catalog queries for the wardrobe tabs and grid. Secret items stay out until unlocked (game-design.md).
import { CATEGORIES, type Category, type ClothingDef } from './types';

const isVisible = (c: ClothingDef) => c.secret !== true;

/** Categories that have at least one visible item, in the canonical tab order. */
export function visibleCategories(catalog: readonly ClothingDef[]): Category[] {
  return CATEGORIES.filter((cat) => catalog.some((c) => c.category === cat && isVisible(c)));
}

export function itemsInCategory(catalog: readonly ClothingDef[], category: Category): ClothingDef[] {
  return catalog.filter((c) => c.category === category && isVisible(c));
}
