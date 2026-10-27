// Pure TS, no Phaser (ADR 0010, 0017). What the cat sheet and the discovery chip show about a taste (S2, F14.3 and F14.4).
import { tasteLines } from './copy';
import { tasteKeys } from './tastes';
import type { CatDef, TasteKey } from './types';

export type ChipKind = 'love' | 'dislike' | 'favorite' | 'color';

/** What a chip writes: the glyph of its kind and the thing the cat likes (a tag, an item or a dye). */
export interface ChipText {
  kind: ChipKind;
  glyph: string;
  label: string;
}

/** Names of the things a taste points to, from the catalog (the domain does not know the JSON). */
export interface NameLookup {
  /** The readable name of a tag (tags.json `label`). */
  tag(id: string): string;
  item(id: string): string;
  dye(id: string): string;
}

export interface SheetEntry extends ChipText {
  key: TasteKey;
  found: boolean;
}

const GLYPHS: Record<ChipKind, string> = { love: '♥', dislike: '✕', favorite: '★', color: '●' };

/** The chip of a taste key (`love:estrellas`, `dislike:frutal`, `favorite`, `color`). `cat` is needed for favorite and color. */
export function tasteChip(key: TasteKey, names: NameLookup, cat?: CatDef): ChipText {
  const [kind, tag = ''] = key.split(':');
  if (kind === 'favorite') return { kind, glyph: GLYPHS.favorite, label: names.item(cat?.prefs?.favoriteItem ?? '') };
  if (kind === 'color') return { kind, glyph: GLYPHS.color, label: names.dye(cat?.prefs?.favoriteDye ?? '') };
  const k: ChipKind = kind === 'dislike' ? 'dislike' : 'love';
  return { kind: k, glyph: GLYPHS[k], label: names.tag(tag) };
}

/** The five tastes of a cat in sheet order (loves, dislike, favorite, color), each marked found or not. */
export function catSheetEntries(cat: CatDef, found: readonly TasteKey[], names: NameLookup): SheetEntry[] {
  return tasteKeys(cat).map((key) => ({ key, found: found.includes(key), ...tasteChip(key, names, cat) }));
}

/** The hint in Gaegu while something is still missing; once the five are known, the cat says so. */
export function catSheetHint(cat: CatDef, found: readonly TasteKey[]): string {
  const keys = tasteKeys(cat);
  if (keys.length > 0 && keys.every((k) => found.includes(k))) return tasteLines.knowsYou();
  return cat.prefs?.hint ?? tasteLines.generic();
}
