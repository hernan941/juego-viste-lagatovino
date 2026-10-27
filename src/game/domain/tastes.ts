// Pure TS, no Phaser (ADR 0010, 0017). The five hidden tastes of a cat and the reaction to a dropped item.
import { SLOT_ORDER } from './slots';
import { staggerDelays } from './stagger';
import type { CatDef, ClothingDef, ComboDef, ItemDye, Outfit, TasteKey } from './types';

/** Tags that are plumbing, not style: they never match a taste (same as economy.json -> scoring.ignoredTags). */
export const TECHNICAL_TAGS: readonly string[] = ['secreto', 'mece'];

export type TasteKind = 'combo' | 'favorite' | 'dislike' | 'love' | 'color' | 'neutral';

export interface TasteReaction {
  kind: TasteKind;
  /** The tag that matched, for love and dislike. */
  tag?: string;
}

const realTags = (item: ClothingDef): string[] => item.tags.filter((t) => !TECHNICAL_TAGS.includes(t));

/**
 * What the cat feels about an item just dropped. `dye` is the dye id on it (none = undefined) and
 * `combos` the combos this drop completed. Priority: combo > favorite > dislike > love > color > neutral.
 */
export function tasteReaction(
  item: ClothingDef,
  dye: string | undefined,
  cat: CatDef,
  combos: readonly ComboDef[] = [],
): TasteReaction {
  if (combos.length > 0) return { kind: 'combo' };
  const prefs = cat.prefs;
  if (!prefs) return { kind: 'neutral' };
  const tags = realTags(item);
  if (item.id === prefs.favoriteItem) return { kind: 'favorite' };
  const hated = prefs.dislikes.find((t) => tags.includes(t));
  if (hated !== undefined) return { kind: 'dislike', tag: hated };
  const loved = prefs.loves.find((t) => tags.includes(t));
  if (loved !== undefined) return { kind: 'love', tag: loved };
  if (dye !== undefined && dye === prefs.favoriteDye) return { kind: 'color' };
  return { kind: 'neutral' };
}

/** Every taste a drop touches (not just the one that wins the reaction), in priority order. */
export function activeTastes(item: ClothingDef, dye: string | undefined, cat: CatDef): TasteKey[] {
  const prefs = cat.prefs;
  if (!prefs) return [];
  const tags = realTags(item);
  return [
    ...(item.id === prefs.favoriteItem ? ['favorite'] : []),
    ...prefs.dislikes.filter((t) => tags.includes(t)).map((t) => `dislike:${t}`),
    ...prefs.loves.filter((t) => tags.includes(t)).map((t) => `love:${t}`),
    ...(dye !== undefined && dye === prefs.favoriteDye ? ['color'] : []),
  ];
}

/** The key stored in `tastesFound` for a reaction; null when it is not a taste (neutral, combo). */
export function tasteKeyOf(reaction: TasteReaction): TasteKey | null {
  switch (reaction.kind) {
    case 'love':
    case 'dislike': return `${reaction.kind}:${reaction.tag}`;
    case 'favorite':
    case 'color': return reaction.kind;
    default: return null;
  }
}

/** The five keys of a cat: two loves, one dislike, favorite and color. Empty without prefs. */
export function tasteKeys(cat: CatDef): TasteKey[] {
  const prefs = cat.prefs;
  if (!prefs) return [];
  return [
    ...prefs.loves.map((t) => `love:${t}`),
    ...prefs.dislikes.map((t) => `dislike:${t}`),
    'favorite',
    'color',
  ];
}

/** Notes a taste once per cat. Returns the same `found` object when it was already known. */
export function discoverTaste(
  found: Readonly<Record<string, TasteKey[]>>,
  catId: string,
  key: TasteKey,
): { found: Record<string, TasteKey[]>; isNew: boolean } {
  const known = found[catId] ?? [];
  if (known.includes(key)) return { found, isNew: false };
  return { found: { ...found, [catId]: [...known, key] }, isNew: true };
}

/** What a cat thinks of one worn item when it looks at the whole look (F14.5). */
export interface OutfitRead {
  item: ClothingDef;
  reaction: TasteReaction;
  /** When the reaction starts, in ms from the beginning of the chain (the same step as the pop of the layers). */
  delay: number;
}

/**
 * A cat that arrives with a look on reads it piece by piece: one reaction per worn item, in slot order, `stepMs` apart.
 * Combos are not read here (they have their own reaction, and the box only comes with a drop).
 */
export function readOutfit(
  outfit: Outfit,
  itemDye: ItemDye,
  cat: CatDef,
  catalog: readonly ClothingDef[],
  stepMs = 80,
): OutfitRead[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const worn = SLOT_ORDER.flatMap((slot) => {
    const item = byId.get(outfit[slot] ?? '');
    return item ? [item] : [];
  });
  const delays = staggerDelays(worn.length, stepMs);
  return worn.map((item, i) => ({ item, reaction: tasteReaction(item, itemDye[item.id], cat), delay: delays[i] }));
}

/**
 * How the cat feels about the whole look once it has read it, for the face it ends with: the favorite wins; otherwise the side
 * (love and color against dislike) with more reactions, a tie going to the happy one. Null when nothing moved it.
 */
export function readingFeel(reads: readonly Pick<OutfitRead['reaction'], 'kind'>[]): 'favorite' | 'love' | 'color' | 'dislike' | null {
  const count = (kind: TasteKind) => reads.filter((r) => r.kind === kind).length;
  if (count('favorite') > 0) return 'favorite';
  const happy = count('love') + count('color');
  const sad = count('dislike');
  if (happy === 0 && sad === 0) return null;
  if (sad > happy) return 'dislike';
  return count('love') > 0 ? 'love' : 'color';
}
