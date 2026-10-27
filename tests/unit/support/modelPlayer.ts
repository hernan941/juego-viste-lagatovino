// A seeded model player for the balance test (F13.8). Pure: uses the domain functions and the real JSON, no Phaser.
// Each session rates 6 looks (2 cats x 3), explores a few items for free, tries a combo now and then and shops at the end.
import cats from '../../../src/game/data/cats.json';
import clothes from '../../../src/game/data/clothes.json';
import combos from '../../../src/game/data/combos.json';
import dyes from '../../../src/game/data/dyes.json';
import economy from '../../../src/game/data/economy.json';
import photo from '../../../src/game/data/photo.json';
import sets from '../../../src/game/data/sets.json';
import { completion } from '../../../src/game/domain/album';
import { comboOutfit, findCompletedCombos } from '../../../src/game/domain/combos';
import { dyePrice, lookSignature, priceOf } from '../../../src/game/domain/economy';
import { applyDiscovery, applyRating, emptyProgress } from '../../../src/game/domain/progress';
import { scoreLook } from '../../../src/game/domain/score';
import { SLOT_ORDER } from '../../../src/game/domain/slots';
import { activeTastes } from '../../../src/game/domain/tastes';
import type {
  CatDef, ClothingDef, ComboDef, DyeDef, EconomyRules, ItemDye, Outfit, PhotoCatalog, Progress, ProgressEvent, SetDef,
} from '../../../src/game/domain/types';

const catList = cats as CatDef[];
const catalog = clothes as ClothingDef[];
const comboList = combos as ComboDef[];
const dyeList = (dyes as DyeDef[]).filter((d) => d.id !== 'agua');
const realRules = economy as unknown as EconomyRules;
let rules: EconomyRules = realRules;
const setRules = (r: EconomyRules): void => {
  rules = r;
};
const albumCatalogs = {
  clothes: catalog, cats: catList, combos: comboList, dyes: dyes as DyeDef[], sets: sets as SetDef[], photo: photo as unknown as PhotoCatalog,
};

export const LOOKS_PER_SESSION = 6;
const LOOKS_PER_CAT = 3;
const EXPLORE_DROPS = 3;
const COMBO_TRY_CHANCE = 0.5;

export interface SessionStats {
  session: number;
  looks: number;
  wallet: number;
  /** Items and bottles bought so far, out of `buyableTotal`. */
  bought: number;
  pctBought: number;
  albumPct: number;
  /** Buttons earned in this session, split by source. */
  earnedPayout: number;
  earnedDiscovery: number;
  avgStars: number;
}

export interface Simulation {
  sessions: SessionStats[];
  buyableTotal: number;
  /** First session with at least 50 % / 100 % of the buyable things, or null. */
  halfSession: number | null;
  fullSession: number | null;
  totals: { payout: number; discovery: number };
  /** Total buttons the player could have spent: sum of every price. */
  totalPrice: number;
}

export interface SimulateOptions {
  seed: number;
  maxSessions: number;
  /** Economy numbers to try instead of economy.json (to test an adjustment before changing the JSON). */
  rules?: EconomyRules;
}

/** mulberry32: a tiny seeded generator. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const buyableItems = catalog.filter((c) => c.tier && !c.secret);
const buyableDyes = dyeList.filter((d) => !d.starter);
const buyableTotal = buyableItems.length + buyableDyes.length;
const totalPriceNow = (): number =>
  buyableItems.reduce((n, c) => n + priceOf(c, rules), 0) + buyableDyes.reduce((n, d) => n + dyePrice(d, rules), 0);

/** The cat as the player knows it: only the tastes already found count. */
function perceived(cat: CatDef, found: readonly string[]): CatDef {
  const prefs = cat.prefs;
  if (!prefs) return cat;
  return {
    ...cat,
    prefs: {
      ...prefs,
      loves: prefs.loves.filter((t) => found.includes(`love:${t}`)),
      dislikes: prefs.dislikes.filter((t) => found.includes(`dislike:${t}`)),
      favoriteItem: found.includes('favorite') ? prefs.favoriteItem : '',
      favoriteDye: found.includes('color') ? prefs.favoriteDye : '',
    },
  };
}

const pick = <T>(list: readonly T[], r: () => number): T => list[Math.floor(r() * list.length)];

/** A reasonable look: greedy by slot (random order, two passes) on what the player knows, then the favorite dye. */
function dress(cat: CatDef, progress: Progress, r: () => number): { outfit: Outfit; itemDye: ItemDye } {
  const known = perceived(cat, progress.tastesFound[cat.id] ?? []);
  const myCombos = comboList.filter((c) => progress.secrets.includes(c.id));
  const hasItem = (c: ClothingDef) =>
    c.starter === true || progress.owned.includes(c.id) || myCombos.some((k) => k.rewardItemId === c.id);
  const pool = catalog.filter(hasItem);
  const outfit: Partial<Record<(typeof SLOT_ORDER)[number], string>> = {};
  for (const slot of SLOT_ORDER) {
    const options = pool.filter((c) => c.slot === slot);
    if (options.length > 0 && r() < 0.5) outfit[slot] = pick(options, r).id;
  }
  const points = (o: Outfit) => scoreLook(o, {}, known, catalog, myCombos, rules).points;
  for (let pass = 0; pass < 2; pass++) {
    const order = [...SLOT_ORDER].sort(() => r() - 0.5);
    for (const slot of order) {
      let bestId = outfit[slot];
      let best = points(outfit);
      for (const c of pool.filter((p) => p.slot === slot)) {
        const score = points({ ...outfit, [slot]: c.id }) + r() * 0.5; // the noise breaks ties
        if (score > best) { best = score; bestId = c.id; }
      }
      if (bestId === undefined) delete outfit[slot];
      else outfit[slot] = bestId;
    }
  }
  const itemDye: Record<string, string> = {};
  const dye = known.prefs?.favoriteDye;
  const ownsDye = (id: string) => dyeList.some((d) => d.id === id && (d.starter || progress.dyesOwned.includes(id)));
  if (dye && ownsDye(dye)) {
    for (const id of Object.values(outfit)) {
      if (Object.keys(itemDye).length < 2 && catalog.find((c) => c.id === id)?.dyeable) itemDye[id] = dye;
    }
  }
  return { outfit, itemDye };
}

interface Run {
  progress: Progress;
  events: ProgressEvent[];
}

const tally = (events: readonly ProgressEvent[]) => ({
  payout: events.reduce((n, e) => n + (e.type === 'coins' ? e.amount : 0), 0),
  discovery: events.reduce((n, e) => n + (e.type !== 'coins' && 'amount' in e ? e.amount : 0), 0),
});

/** Free exploration: drop a few random items (and dyes) on the cat; every taste they touch is found. */
function explore(cat: CatDef, progress: Progress, r: () => number): Run {
  let current = progress;
  const events: ProgressEvent[] = [];
  const visible = catalog.filter((c) => !c.secret);
  for (let i = 0; i < EXPLORE_DROPS; i++) {
    const item = pick(visible, r);
    const dye = item.dyeable ? pick(dyeList, r).id : undefined;
    for (const key of activeTastes(item, dye, cat)) {
      const applied = applyDiscovery(current, 'taste', key, rules, cat.id);
      current = applied.progress;
      events.push(...applied.events);
    }
  }
  return { progress: current, events };
}

/** Rates a look, then pays the combos it completed for the first time. */
function rate(cat: CatDef, outfit: Outfit, itemDye: ItemDye, progress: Progress): Run & { stars: number } {
  const result = scoreLook(outfit, itemDye, cat, catalog, comboList.filter((c) => progress.secrets.includes(c.id)), rules);
  const rated = applyRating(progress, result, rules, { catId: cat.id, signature: lookSignature(outfit, itemDye) });
  let current = rated.progress;
  const events = [...rated.events];
  for (const combo of findCompletedCombos(outfit, comboList, catalog)) {
    const applied = applyDiscovery(current, 'combo', combo.id, rules);
    current = applied.progress;
    events.push(...applied.events);
  }
  return { progress: current, events, stars: result.stars };
}

/** Buys what is affordable: first what a known taste of today's cats asks for, then the cheapest. */
function shop(progress: Progress, today: readonly CatDef[]): Progress {
  const wanted = (c: ClothingDef) =>
    today.some((cat) => {
      const found = progress.tastesFound[cat.id] ?? [];
      return (cat.prefs?.loves ?? []).some((t) => found.includes(`love:${t}`) && c.tags.includes(t)) ||
        (found.includes('favorite') && cat.prefs?.favoriteItem === c.id);
    });
  let current = progress;
  for (;;) {
    const items = buyableItems.filter((c) => !current.owned.includes(c.id) && priceOf(c, rules) <= current.wallet);
    const bottles = buyableDyes.filter((d) => !current.dyesOwned.includes(d.id) && dyePrice(d, rules) <= current.wallet);
    const options = [
      ...items.map((c) => ({ id: c.id, dye: false, price: priceOf(c, rules), rank: wanted(c) ? 0 : 1 })),
      ...bottles.map((d) => ({ id: d.id, dye: true, price: dyePrice(d, rules), rank: 1 })),
    ].sort((a, b) => a.rank - b.rank || a.price - b.price);
    const buy = options[0];
    if (!buy) return current;
    current = {
      ...current,
      wallet: current.wallet - buy.price,
      owned: buy.dye ? current.owned : [...current.owned, buy.id],
      dyesOwned: buy.dye ? [...current.dyesOwned, buy.id] : current.dyesOwned,
    };
  }
}

export function simulate({ seed, maxSessions, rules = realRules }: SimulateOptions): Simulation {
  setRules(rules);
  const r = rng(seed);
  let progress = emptyProgress(rules.startWallet);
  const sessions: SessionStats[] = [];
  const totals = { payout: 0, discovery: 0 };
  for (let s = 0; s < maxSessions; s++) {
    const today = [catList[(2 * s) % catList.length], catList[(2 * s + 1) % catList.length]];
    const earned = { payout: 0, discovery: 0 };
    let stars = 0;
    let looks = 0;
    for (const cat of today) {
      for (let i = 0; i < LOOKS_PER_CAT; i++) {
        const explored = explore(cat, progress, r);
        progress = explored.progress;
        const missing = comboList.filter((c) => !progress.secrets.includes(c.id));
        const combo = i === 0 && missing.length > 0 && r() < COMBO_TRY_CHANCE ? comboOutfit(pick(missing, r), catalog) : null;
        const { outfit, itemDye } = combo ? { outfit: combo, itemDye: {} } : dress(cat, progress, r);
        const rated = rate(cat, outfit, itemDye, progress);
        progress = rated.progress;
        stars += rated.stars;
        looks++;
        for (const t of [tally(explored.events), tally(rated.events)]) {
          earned.payout += t.payout;
          earned.discovery += t.discovery;
        }
      }
    }
    progress = shop(progress, today);
    totals.payout += earned.payout;
    totals.discovery += earned.discovery;
    const bought = progress.owned.length + progress.dyesOwned.length;
    sessions.push({
      session: s + 1,
      looks,
      wallet: progress.wallet,
      bought,
      pctBought: Math.floor((bought * 100) / buyableTotal),
      albumPct: completion(progress, albumCatalogs).pct,
      earnedPayout: earned.payout,
      earnedDiscovery: earned.discovery,
      avgStars: stars / looks,
    });
  }
  const first = (pct: number) => sessions.find((x) => x.pctBought >= pct)?.session ?? null;
  return { sessions, buyableTotal, halfSession: first(50), fullSession: first(100), totals, totalPrice: totalPriceNow() };
}
