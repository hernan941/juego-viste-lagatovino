// Pure TS, no Phaser (ADR 0010, ADR 0017). The progress of the player: its empty value, its structural cleaning when a
// save is read, and its validation against the catalog (`progressFromSave`, like `sessionFromSave`).
import { SLOT_ORDER, type Slot } from './slots';
import type { ItemDye, KeychainRecipe, Outfit, Progress, SaveData, Stars, StoredProgress } from './types';

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
