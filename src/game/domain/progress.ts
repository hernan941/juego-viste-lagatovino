// Pure TS, no Phaser (ADR 0010, ADR 0017). The progress of the player: its empty value, its structural cleaning when a
// save is read, and its validation against the catalog (`progressFromSave`, like `sessionFromSave`).
import { albumNews, seenIdOf, type AlbumCatalogs, type PhotoUnlocks } from './album';
import { milestoneBonus, novelty, payout } from './economy';
import { discoverTaste } from './tastes';
import { SLOT_ORDER, type Slot } from './slots';
import type {
  EconomyRules, ItemDye, KeychainRecipe, Outfit, Progress, ProgressEvent, RatingResult, SaveData, Stars, StoredProgress, TasteKey,
} from './types';

/** Signatures kept per cat to detect repeated looks. */
export const RATED_LOOKS_KEPT = 3;

type Obj = Record<string, unknown>;

/** What `progressFromSave` needs of the catalog (structural, so tests use small fixtures). */
export interface ProgressCatalog {
  cats: readonly { id: string }[];
  clothes: readonly { id: string; slot: Slot; starter?: boolean; secret?: boolean }[];
  combos: readonly { id: string }[];
  /** When absent, bought bottles are kept as they are (the dye catalog is not loaded yet). */
  dyes?: readonly { id: string; starter?: boolean }[];
}

export interface ProgressRules {
  startWallet: number;
}

export function emptyStoredProgress(): StoredProgress {
  return { owned: [], dyesOwned: [], secrets: [], tastesFound: {}, bestStars: {}, ratedLooks: {}, keychains: {}, albumSeen: [] };
}

export function emptyProgress(startWallet: number): Progress {
  return { ...emptyStoredProgress(), wallet: startWallet };
}

/** The storable copy of a progress (new containers, so the stored value never aliases the live one). */
export function toStoredProgress(p: Progress): StoredProgress {
  return JSON.parse(JSON.stringify(p)) as StoredProgress;
}

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const isWallet = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const unique = (list: readonly string[]): string[] => [...new Set(list)];

function stringRecord(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (isObj(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'string') out[k] = x;
  return out;
}

function outfitOf(v: unknown): Outfit {
  const out: Partial<Record<Slot, string>> = {};
  if (isObj(v)) for (const slot of SLOT_ORDER) if (typeof v[slot] === 'string') out[slot] = v[slot] as string;
  return out;
}

const isStars = (v: unknown): v is Stars => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;

/** A keychain recipe with the right shape, or null. */
function keychainOf(v: unknown): KeychainRecipe | null {
  if (!isObj(v) || !isObj(v.photo)) return null;
  const { catId, catName, pose, createdAt, stars, photo } = v;
  if (typeof catId !== 'string' || typeof catName !== 'string' || typeof pose !== 'string' || typeof createdAt !== 'string') return null;
  if (!isStars(stars)) return null;
  if (typeof photo.background !== 'string' || typeof photo.frame !== 'string' || !Array.isArray(photo.stickers)) return null;
  const stickers = [];
  for (const st of photo.stickers) {
    if (!isObj(st) || typeof st.id !== 'string' || typeof st.x !== 'number' || typeof st.y !== 'number' || typeof st.angle !== 'number') return null;
    stickers.push({ id: st.id, x: st.x, y: st.y, angle: st.angle });
  }
  return {
    catId, catName, outfit: outfitOf(v.outfit), itemDye: stringRecord(v.itemDye), pose, stars, createdAt,
    photo: { background: photo.background, frame: photo.frame, stickers },
  };
}

/** Per cat record, keeping the entries `convert` accepts. */
function byCat<T>(v: unknown, convert: (value: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (isObj(v)) {
    for (const [cat, value] of Object.entries(v)) {
      const converted = convert(value);
      if (converted !== null) out[cat] = converted;
    }
  }
  return out;
}

/** Fixes the shape of whatever was stored, without the catalog. Never throws; a broken field is its empty value. */
export function sanitizeStoredProgress(raw: unknown): StoredProgress {
  const base = emptyStoredProgress();
  if (!isObj(raw)) return base;
  return {
    ...(isWallet(raw.wallet) ? { wallet: raw.wallet } : {}),
    owned: strings(raw.owned),
    dyesOwned: strings(raw.dyesOwned),
    secrets: strings(raw.secrets),
    tastesFound: byCat(raw.tastesFound, (x) => (Array.isArray(x) ? strings(x) : null)),
    bestStars: byCat(raw.bestStars, (x) => (typeof x === 'number' && Number.isFinite(x) ? (Math.min(5, Math.max(1, Math.round(x))) as Stars) : null)),
    ratedLooks: byCat(raw.ratedLooks, (x) => (Array.isArray(x) ? strings(x) : null)),
    keychains: byCat(raw.keychains, keychainOf),
    albumSeen: strings(raw.albumSeen),
  };
}

/**
 * The progress a save describes, checked against the catalog: unknown ids are dropped, starters and secrets leave `owned`
 * (they are derived), the signatures are limited, the stars bounded, invalid keychains dropped and a missing or broken wallet
 * is the start wallet.
 */
export function progressFromSave(save: SaveData, catalog: ProgressCatalog, rules: ProgressRules): Progress {
  const stored = sanitizeStoredProgress(save.progress);
  const catIds = new Set(catalog.cats.map((c) => c.id));
  const itemOf = new Map(catalog.clothes.map((c) => [c.id, c]));
  const comboIds = new Set(catalog.combos.map((c) => c.id));
  const dyeOf = catalog.dyes && new Map(catalog.dyes.map((d) => [d.id, d]));
  const ofKnownCats = <T>(rec: Record<string, T>, map: (value: T) => T = (v) => v): Record<string, T> =>
    Object.fromEntries(Object.entries(rec).filter(([cat]) => catIds.has(cat)).map(([cat, v]) => [cat, map(v)]));

  const keychains: Record<string, KeychainRecipe> = {};
  for (const [cat, k] of Object.entries(stored.keychains)) {
    if (!catIds.has(cat) || k.catId !== cat) continue;
    const outfit: Partial<Record<Slot, string>> = {};
    for (const slot of SLOT_ORDER) {
      const id = k.outfit[slot];
      if (id !== undefined && itemOf.get(id)?.slot === slot) outfit[slot] = id;
    }
    const itemDye: ItemDye = Object.fromEntries(Object.entries(k.itemDye).filter(([item, dye]) => itemOf.has(item) && (!dyeOf || dyeOf.has(dye))));
    keychains[cat] = { ...k, outfit, itemDye };
  }

  return {
    wallet: stored.wallet ?? rules.startWallet,
    owned: unique(stored.owned).filter((id) => {
      const item = itemOf.get(id);
      return item !== undefined && !item.starter && !item.secret;
    }),
    dyesOwned: unique(stored.dyesOwned).filter((id) => !dyeOf || (dyeOf.has(id) && !dyeOf.get(id)!.starter)),
    secrets: unique(stored.secrets).filter((id) => comboIds.has(id)),
    tastesFound: ofKnownCats(stored.tastesFound, unique),
    bestStars: ofKnownCats(stored.bestStars),
    ratedLooks: ofKnownCats(stored.ratedLooks, (l) => l.slice(-RATED_LOOKS_KEPT)),
    keychains,
    albumSeen: unique(stored.albumSeen),
  };
}

/** The new progress and what the scene replays, in order (ADR 0017). */
export interface Applied {
  progress: Progress;
  events: ProgressEvent[];
}

/** The look that was rated: the cat and its signature (`lookSignature`). */
export interface RatedLook {
  catId: string;
  signature: string;
}

const withWallet = (p: Progress, amount: number): Progress => ({ ...p, wallet: p.wallet + amount });

/**
 * A rating becomes coins and records. Events, in this order: `coins` (the payout, by novelty), then one `milestone` per
 * first 3, 4 and 5 stars of the cat. The input is never changed.
 */
export function applyRating(progress: Progress, result: RatingResult, rules: EconomyRules, look: RatedLook): Applied {
  const { catId, signature } = look;
  const history = progress.ratedLooks[catId] ?? [];
  const best = progress.bestStars[catId];
  const events: ProgressEvent[] = [{ type: 'coins', amount: payout(result.stars, novelty(signature, history, rules), rules) }];
  for (const m of milestoneBonus(best, result.stars, rules)) events.push({ type: 'milestone', stars: m.stars, amount: m.amount });
  const earned = events.reduce((sum, e) => sum + ('amount' in e ? e.amount : 0), 0);
  return {
    progress: {
      ...withWallet(progress, earned),
      bestStars: { ...progress.bestStars, [catId]: best === undefined || result.stars > best ? result.stars : best },
      ratedLooks: { ...progress.ratedLooks, [catId]: [...history, signature].slice(-RATED_LOOKS_KEPT) },
    },
    events,
  };
}

/**
 * The first time a taste (per cat) or a combo (per player) is found it pays; afterwards nothing changes (the same
 * progress object comes back). For a taste, `key` is the TasteKey and `catId` is needed.
 */
export function applyDiscovery(
  progress: Progress,
  kind: 'taste' | 'combo',
  key: TasteKey | string,
  rules: EconomyRules,
  catId?: string,
): Applied {
  if (kind === 'combo') {
    if (progress.secrets.includes(key)) return { progress, events: [] };
    const amount = rules.comboBonus;
    return { progress: { ...withWallet(progress, amount), secrets: [...progress.secrets, key] }, events: [{ type: 'comboFirst', comboId: key, amount }] };
  }
  if (catId === undefined) return { progress, events: [] };
  const { found, isNew } = discoverTaste(progress.tastesFound, catId, key);
  if (!isNew) return { progress, events: [] };
  const amount = rules.discoveryBonus;
  return { progress: { ...withWallet(progress, amount), tastesFound: found }, events: [{ type: 'tasteFound', taste: key, amount }] };
}

/** The ids are remembered in `albumSeen`; the same progress object comes back when there is nothing new to remember. */
export function markSeen(progress: Progress, ids: readonly string[]): Progress {
  const next = unique([...progress.albumSeen, ...ids]);
  return next.length === progress.albumSeen.length ? progress : { ...progress, albumSeen: next };
}

/**
 * Sets that just got complete and photo pieces that just unlocked become events (`setCompleted` per set, then one `unlock` with
 * every new piece) and are written down in `albumSeen` so they are told once (S5, F17.5).
 */
export function applyAlbumNews(progress: Progress, catalogs: AlbumCatalogs): Applied {
  const news = albumNews(progress, catalogs);
  const events: ProgressEvent[] = news.sets.map((setId) => ({ type: 'setCompleted', setId }));
  if (news.unlocks.length > 0) events.push({ type: 'unlock', ids: news.unlocks });
  if (events.length === 0) return { progress, events };
  const told = [
    ...news.sets.map(seenIdOf.set),
    ...news.unlocks.map((id) => {
      const [kind, ...rest] = id.split(':');
      return seenIdOf.unlock(kind as keyof PhotoUnlocks, rest.join(':'));
    }),
  ];
  return { progress: markSeen(progress, told), events };
}
