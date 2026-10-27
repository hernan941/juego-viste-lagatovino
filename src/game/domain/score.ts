// Pure TS, no Phaser (ADR 0010, 0017). How the judge scores a look (docs/design/segunda-etapa.md, S1).
// Every weight, cap and threshold comes from EconomyRules (economy.json -> scoring).
import { findCompletedCombos } from './combos';
import { SLOT_ORDER, type Slot } from './slots';
import type {
  BreakdownKind, BreakdownLine, CatDef, ClothingDef, ComboDef, EconomyRules, ItemDye, Outfit, RatingResult, ScoringRules, Stars,
} from './types';

/** Raw counts of a look; `parts` turns them into points. */
interface Tally {
  /** Sum over tags of max(0, items with the tag - 1). */
  style: number;
  loveItems: number;
  hateItems: number;
  favoriteItem: boolean;
  /** Items worn (slots filled). */
  worn: number;
  combos: number;
  /** Worn items dyed with the cat's favorite dye. */
  dyedFavorite: number;
}

/** Points of each rule, caps applied. */
function parts(t: Tally, s: ScoringRules): Record<BreakdownKind, number> {
  const w = s.weights;
  return {
    style: Math.min(s.caps.style, t.style * w.style),
    love: Math.min(s.caps.love, t.loveItems * w.love),
    // The rules may write the weight with either sign: a dislike always subtracts.
    dislike: -Math.abs(w.dislike) * t.hateItems,
    favoriteItem: t.favoriteItem ? w.favoriteItem : 0,
    complete: t.worn >= 4 ? 2 * w.complete : t.worn >= 3 ? w.complete : 0,
    combo: Math.min(s.caps.combo ?? 2 * w.combo, t.combos * w.combo),
    favoriteDye: Math.min(s.caps.color ?? 2 * w.favoriteDye, t.dyedFavorite * w.favoriteDye),
  };
}

const KIND_ORDER: readonly BreakdownKind[] = ['style', 'love', 'dislike', 'favoriteItem', 'complete', 'combo', 'favoriteDye'];

const sum = (p: Record<BreakdownKind, number>): number => KIND_ORDER.reduce((n, k) => n + p[k], 0);

/** Stars for a score: nothing is below 1, and the thresholds are the minimum for 2, 3, 4 and 5. */
export function starsFor(points: number, rules: EconomyRules): Stars {
  const stars = 1 + rules.scoring.starThresholds.filter((min) => points >= min).length;
  return stars as Stars;
}

const firstOf = (wanted: readonly string[], present: ReadonlySet<string>): string | undefined =>
  wanted.find((t) => present.has(t));

/**
 * Scores a look. The breakdown has one line per rule that gave or took points (never zero lines),
 * in the order of the judge's card; `ref` names the tag, item or combo that caused it.
 */
export function scoreLook(
  outfit: Outfit,
  itemDye: ItemDye,
  cat: CatDef,
  catalog: readonly ClothingDef[],
  combos: readonly ComboDef[],
  rules: EconomyRules,
): RatingResult {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const ignored = new Set(rules.scoring.ignoredTags);
  const prefs = cat.prefs;
  const worn = SLOT_ORDER.flatMap((slot) => {
    const id = outfit[slot];
    const item = id === undefined ? undefined : byId.get(id);
    return item ? [item] : [];
  });

  const tagCount = new Map<string, number>();
  const lovedTags = new Set<string>();
  const hatedTags = new Set<string>();
  let loveItems = 0;
  let hateItems = 0;
  let dyedFavorite = 0;
  for (const item of worn) {
    const tags = new Set(item.tags.filter((t) => !ignored.has(t)));
    for (const t of tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const loved = prefs?.loves.filter((t) => tags.has(t)) ?? [];
    const hated = prefs?.dislikes.filter((t) => tags.has(t)) ?? [];
    if (loved.length > 0) loveItems++;
    if (hated.length > 0) hateItems++;
    loved.forEach((t) => lovedTags.add(t));
    hated.forEach((t) => hatedTags.add(t));
    if (prefs && itemDye[item.id] === prefs.favoriteDye) dyedFavorite++;
  }
  let style = 0;
  let styleRef: string | undefined;
  let styleRefExtra = 0;
  for (const [tag, n] of tagCount) {
    style += Math.max(0, n - 1);
    if (n - 1 > styleRefExtra) {
      styleRefExtra = n - 1;
      styleRef = tag;
    }
  }
  const done = findCompletedCombos(outfit, combos, catalog);
  const favorite = prefs !== undefined && worn.some((i) => i.id === prefs.favoriteItem);

  const points = parts(
    { style, loveItems, hateItems, favoriteItem: favorite, worn: worn.length, combos: done.length, dyedFavorite },
    rules.scoring,
  );
  const refs: Partial<Record<BreakdownKind, string | undefined>> = {
    style: styleRef,
    love: prefs ? firstOf(prefs.loves, lovedTags) : undefined,
    dislike: prefs ? firstOf(prefs.dislikes, hatedTags) : undefined,
    favoriteItem: prefs?.favoriteItem,
    combo: done[0]?.id,
    favoriteDye: prefs?.favoriteDye,
  };
  const breakdown: BreakdownLine[] = KIND_ORDER.filter((kind) => points[kind] !== 0).map((kind) => {
    const ref = refs[kind];
    return ref === undefined ? { kind, points: points[kind] } : { kind, points: points[kind], ref };
  });
  // The card is never blank: a placeholder line (worth 0) says why there is nothing to write.
  if (breakdown.length === 0) breakdown.push({ kind: worn.length === 0 ? 'bare' : 'plain', points: 0 });
  const total = sum(points);
  return { points: total, stars: starsFor(total, rules), breakdown };
}

export interface BestLook extends RatingResult {
  outfit: Outfit;
  itemDye: ItemDye;
}

export interface BestPossibleOptions {
  /** Ids of bought items. Given: only starters and these can be worn. Missing: every visible item. */
  owned?: readonly string[];
  /** Is the cat's favorite dye available? Default true; with false nothing is dyed. */
  dyeAvailable?: boolean;
}

/**
 * The best look a cat can get from a pool of items (exhaustive search with incremental counts).
 * Secret items are never used. Guards the balance: 5 stars must be reachable for every cat.
 */
export function bestPossible(
  cat: CatDef,
  catalog: readonly ClothingDef[],
  combos: readonly ComboDef[],
  rules: EconomyRules,
  options: BestPossibleOptions = {},
): BestLook {
  const { owned, dyeAvailable = true } = options;
  const prefs = cat.prefs;
  const s = rules.scoring;
  const ignored = new Set(s.ignoredTags);
  const usable = (c: ClothingDef) => c.secret !== true && (owned === undefined || c.starter === true || owned.includes(c.id));
  const bySlot = new Map<Slot, ClothingDef[]>();
  for (const c of catalog.filter(usable)) bySlot.set(c.slot, [...(bySlot.get(c.slot) ?? []), c]);
  const slots = SLOT_ORDER.filter((slot) => bySlot.has(slot));

  // Dye as many dyeable items as the color cap can pay for.
  const colorW = s.weights.favoriteDye;
  const dyeLimit = prefs && dyeAvailable && colorW > 0 ? Math.ceil((s.caps.color ?? 2 * colorW) / colorW) : 0;

  const tagCount = new Map<string, number>();
  const chosen: (ClothingDef | undefined)[] = slots.map(() => undefined);
  const t: Tally = { style: 0, loveItems: 0, hateItems: 0, favoriteItem: false, worn: 0, combos: 0, dyedFavorite: 0 };
  let dyeable = 0;
  let best = { points: -Infinity, picks: [] as (ClothingDef | undefined)[], dyed: 0 };

  const comboDone = (combo: ComboDef): boolean =>
    combo.requires.length > 0 &&
    combo.requires.every((r) =>
      'itemId' in r
        ? chosen.some((c) => c?.id === r.itemId)
        : chosen.some((c) => c?.slot === r.slot && c.tags.includes(r.tag)),
    );

  const visit = (i: number): void => {
    if (i === slots.length) {
      t.combos = combos.filter(comboDone).length;
      t.dyedFavorite = Math.min(dyeable, dyeLimit);
      const total = sum(parts(t, s));
      if (total > best.points) best = { points: total, picks: [...chosen], dyed: t.dyedFavorite };
      return;
    }
    chosen[i] = undefined;
    visit(i + 1);
    for (const item of bySlot.get(slots[i]) ?? []) {
      const tags = new Set(item.tags.filter((tag) => !ignored.has(tag)));
      const loved = prefs?.loves.some((tag) => tags.has(tag)) ?? false;
      const hated = prefs?.dislikes.some((tag) => tags.has(tag)) ?? false;
      let gained = 0;
      for (const tag of tags) {
        const n = tagCount.get(tag) ?? 0;
        if (n > 0) gained++;
        tagCount.set(tag, n + 1);
      }
      chosen[i] = item;
      t.style += gained;
      t.worn++;
      if (loved) t.loveItems++;
      if (hated) t.hateItems++;
      if (prefs?.favoriteItem === item.id) t.favoriteItem = true;
      if (item.dyeable) dyeable++;
      visit(i + 1);
      if (item.dyeable) dyeable--;
      if (prefs?.favoriteItem === item.id) t.favoriteItem = false;
      if (hated) t.hateItems--;
      if (loved) t.loveItems--;
      t.worn--;
      t.style -= gained;
      for (const tag of tags) tagCount.set(tag, (tagCount.get(tag) ?? 1) - 1);
      chosen[i] = undefined;
    }
  };
  visit(0);

  const outfit: Partial<Record<Slot, string>> = {};
  const itemDye: ItemDye = {};
  let toDye = best.dyed;
  best.picks.forEach((item, i) => {
    if (!item) return;
    outfit[slots[i]] = item.id;
    if (toDye > 0 && item.dyeable && prefs) {
      itemDye[item.id] = prefs.favoriteDye;
      toDye--;
    }
  });
  // Report through scoreLook so the breakdown is the same one the judge would write.
  return { ...scoreLook(outfit, itemDye, cat, catalog, combos, rules), outfit, itemDye };
}

/** Stars of the best look a cat can get from a pool. Shortcut of `bestPossible`. */
export function bestPossibleStars(
  cat: CatDef,
  catalog: readonly ClothingDef[],
  combos: readonly ComboDef[],
  rules: EconomyRules,
  options?: BestPossibleOptions,
): Stars {
  return bestPossible(cat, catalog, combos, rules, options).stars;
}
