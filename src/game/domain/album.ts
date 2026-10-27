// Pure TS, no Phaser (ADR 0010, 0017). The album: what is got, which sets are complete and what the photo mode unlocks.
// Everything is derived from the progress; nothing here is stored (except `albumSeen`, the entries the player already saw).
import { WATER_DYE } from './dye';
import type { CatDef, ClothingDef, ComboDef, DyeDef, PhotoCatalog, PhotoPose, Progress, SetDef } from './types';

/** Percentages of the album that give a reward (25 % sticker pack, 50 % striped background, 75 % pose, 100 % Catalina's note). */
export const ALBUM_MILESTONES: readonly number[] = [25, 50, 75, 100];

export interface AlbumCatalogs {
  clothes: readonly ClothingDef[];
  cats: readonly CatDef[];
  combos: readonly ComboDef[];
  /** Includes the "agua" tool; it is skipped here. */
  dyes: readonly DyeDef[];
  sets: readonly SetDef[];
  photo: PhotoCatalog;
}

export interface Tally {
  got: number;
  total: number;
}

export interface AlbumCompletion extends Tally {
  /** Whole percent, rounded down: 100 only when everything is got. */
  pct: number;
  sections: { items: Tally; tastes: Tally; combos: Tally; dyes: Tally; keychains: Tally };
}

/** Every entry of the album as a namespaced id: `item:`, `taste:<cat>:<key>`, `combo:`, `dye:`, `keychain:<cat>`. */
export interface AlbumEntries {
  items: string[];
  tastes: string[];
  combos: string[];
  dyes: string[];
  keychains: string[];
}

/** The taste keys a cat can reveal: `love:<tag>`, `dislike:<tag>`, `favorite` and `color`. */
export function tasteKeys(cat: CatDef): string[] {
  const prefs = cat.prefs;
  if (!prefs) return [];
  return [...prefs.loves.map((t) => `love:${t}`), ...prefs.dislikes.map((t) => `dislike:${t}`), 'favorite', 'color'];
}

const pickDyes = (dyes: readonly DyeDef[]): DyeDef[] => dyes.filter((d) => d.id !== WATER_DYE);

function owns(progress: Progress, catalogs: AlbumCatalogs, item: ClothingDef): boolean {
  if (item.secret) return catalogs.combos.some((c) => c.rewardItemId === item.id && progress.secrets.includes(c.id));
  return item.starter === true || progress.owned.includes(item.id);
}

function ownsDye(progress: Progress, dye: DyeDef): boolean {
  return dye.starter === true || progress.dyesOwned.includes(dye.id);
}

function entries(progress: Progress, catalogs: AlbumCatalogs): { got: AlbumEntries; total: AlbumEntries } {
  const got: AlbumEntries = { items: [], tastes: [], combos: [], dyes: [], keychains: [] };
  const total: AlbumEntries = { items: [], tastes: [], combos: [], dyes: [], keychains: [] };
  for (const item of catalogs.clothes) {
    total.items.push(`item:${item.id}`);
    if (owns(progress, catalogs, item)) got.items.push(`item:${item.id}`);
  }
  for (const cat of catalogs.cats) {
    const found = progress.tastesFound[cat.id] ?? [];
    for (const key of tasteKeys(cat)) {
      total.tastes.push(`taste:${cat.id}:${key}`);
      if (found.includes(key)) got.tastes.push(`taste:${cat.id}:${key}`);
    }
    total.keychains.push(`keychain:${cat.id}`);
    if (progress.keychains[cat.id]) got.keychains.push(`keychain:${cat.id}`);
  }
  for (const combo of catalogs.combos) {
    total.combos.push(`combo:${combo.id}`);
    if (progress.secrets.includes(combo.id)) got.combos.push(`combo:${combo.id}`);
  }
  for (const dye of pickDyes(catalogs.dyes)) {
    total.dyes.push(`dye:${dye.id}`);
    if (ownsDye(progress, dye)) got.dyes.push(`dye:${dye.id}`);
  }
  return { got, total };
}

/** Ids of everything got, in album order (items, tastes, combos, dyes, keychains). */
export function gotEntries(progress: Progress, catalogs: AlbumCatalogs): string[] {
  const { got } = entries(progress, catalogs);
  return [...got.items, ...got.tastes, ...got.combos, ...got.dyes, ...got.keychains];
}

/** Entries got out of all entries (138 with the real catalog) and the whole percent. */
export function completion(progress: Progress, catalogs: AlbumCatalogs): AlbumCompletion {
  const { got, total } = entries(progress, catalogs);
  const tally = (k: keyof AlbumEntries): Tally => ({ got: got[k].length, total: total[k].length });
  const sections = { items: tally('items'), tastes: tally('tastes'), combos: tally('combos'), dyes: tally('dyes'), keychains: tally('keychains') };
  const sum = Object.values(sections).reduce((acc, s) => ({ got: acc.got + s.got, total: acc.total + s.total }), { got: 0, total: 0 });
  return { ...sum, pct: sum.total === 0 ? 0 : Math.floor((sum.got * 100) / sum.total), sections };
}

function isComplete(set: SetDef, progress: Progress, catalogs: AlbumCatalogs): boolean {
  const { items, dyes, combos, keychains } = set.requires;
  const checks: boolean[] = [];
  if (items) {
    checks.push(items.every((id) => catalogs.clothes.some((c) => c.id === id && owns(progress, catalogs, c))));
  }
  if (dyes) {
    checks.push(dyes.every((id) => catalogs.dyes.some((d) => d.id === id && ownsDye(progress, d))));
  }
  if (combos) checks.push(combos.every((id) => progress.secrets.includes(id)));
  if (keychains) {
    const enough = Object.values(progress.keychains).filter((k) => k.stars >= keychains.minStars).length;
    checks.push(enough >= keychains.count);
  }
  return checks.length > 0 && checks.every(Boolean);
}

/** Ids of the complete sets, in the order of sets.json. A set with no requirements is never complete. */
export function completedSets(progress: Progress, catalogs: AlbumCatalogs): string[] {
  return catalogs.sets.filter((s) => isComplete(s, progress, catalogs)).map((s) => s.id);
}

/** Unlocked piece ids by kind. Ids repeat between kinds (the "kofi" frame and the "kofi" sticker), so they are not mixed. */
export interface PhotoUnlocks {
  backgrounds: Set<string>;
  frames: Set<string>;
  stickers: Set<string>;
  poses: Set<string>;
}

/** What the photo mode has unlocked. Derived from the progress, never stored (ADR 0017). */
export function photoUnlocks(progress: Progress, catalogs: AlbumCatalogs): PhotoUnlocks {
  const sets = new Set(completedSets(progress, catalogs));
  const pct = completion(progress, catalogs).pct;
  const fiveStar = Object.values(progress.bestStars).some((s) => s === 5);
  const open = (p: PhotoPose): boolean => {
    const u = p.unlock;
    if (u === 'starter') return true;
    if ('set' in u) return sets.has(u.set);
    if ('albumPct' in u) return pct >= u.albumPct;
    return fiveStar;
  };
  const ids = (list: readonly PhotoPose[]) => new Set(list.filter(open).map((p) => p.id));
  const { backgrounds, frames, stickers, poses } = catalogs.photo;
  return { backgrounds: ids(backgrounds), frames: ids(frames), stickers: ids(stickers), poses: ids(poses) };
}

/** Entries got that the player has not seen yet (they get the pulsing sparkle), without repeats and in order. */
export function newlySeen(seen: readonly string[], got: readonly string[]): string[] {
  const known = new Set(seen);
  return got.filter((id, i) => !known.has(id) && got.indexOf(id) === i);
}

/** Milestones reached at this percentage. */
export function albumMilestones(pct: number, milestones: readonly number[] = ALBUM_MILESTONES): number[] {
  return milestones.filter((m) => pct >= m);
}

/** Milestones just crossed when the percentage went from `prevPct` to `pct`. */
export function crossedMilestones(prevPct: number, pct: number, milestones: readonly number[] = ALBUM_MILESTONES): number[] {
  return milestones.filter((m) => prevPct < m && pct >= m);
}

export type AlbumSection = keyof AlbumEntries;

/** `albumSeen` also remembers what the album already announced, in its own namespaces (they never clash with the entries). */
export const seenIdOf = {
  set: (setId: string): string => `set:${setId}`,
  unlock: (kind: keyof PhotoUnlocks, id: string): string => `unlock:${kind}:${id}`,
  milestone: (pct: number): string => `milestone:${pct}`,
};

/** Ids got in one section of the album (a page of the notebook). */
export function gotOfSection(section: AlbumSection, progress: Progress, catalogs: AlbumCatalogs): string[] {
  return entries(progress, catalogs).got[section];
}

export interface AlbumNews {
  /** Ids of the sets complete that were not announced yet. */
  sets: string[];
  /** `<kind>:<id>` of the photo pieces unlocked that were not announced yet (the starters are not news). */
  unlocks: string[];
}

const PHOTO_KINDS = ['backgrounds', 'frames', 'stickers', 'poses'] as const;

/** What is new in the album since the last time it was announced (derived: nothing but `albumSeen` is stored). */
export function albumNews(progress: Progress, catalogs: AlbumCatalogs): AlbumNews {
  const seen = new Set(progress.albumSeen);
  const sets = completedSets(progress, catalogs).filter((id) => !seen.has(seenIdOf.set(id)));
  const open = photoUnlocks(progress, catalogs);
  const unlocks: string[] = [];
  for (const kind of PHOTO_KINDS) {
    for (const piece of catalogs.photo[kind]) {
      if (piece.unlock !== 'starter' && open[kind].has(piece.id) && !seen.has(seenIdOf.unlock(kind, piece.id))) unlocks.push(`${kind}:${piece.id}`);
    }
  }
  return { sets, unlocks };
}

/** Milestones reached whose celebration did not happen yet. */
export function pendingMilestones(progress: Progress, catalogs: AlbumCatalogs): number[] {
  const seen = new Set(progress.albumSeen);
  return albumMilestones(completion(progress, catalogs).pct).filter((m) => !seen.has(seenIdOf.milestone(m)));
}

/** True while some entry got has not been seen: the notebook button shows its sparkle. */
export function albumHasNews(progress: Progress, catalogs: AlbumCatalogs): boolean {
  return newlySeen(progress.albumSeen, gotEntries(progress, catalogs)).length > 0;
}
