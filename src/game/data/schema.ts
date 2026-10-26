// Hand-written validation of the JSON catalog (no zod: three small shapes, zero dependencies,
// and Spanish messages that name the exact path). Runs on load in the Preloader (ADR 0010).
import { COMBO_REACTIONS, comboOutfit } from '../domain/combos';
import { PHOTO_SECTIONS, WATER_ID } from './assets';
import { SLOT_ORDER } from '../domain/slots';
import { ANCHOR_NAMES, BOX_NAMES, CATEGORIES } from '../domain/types';
import type {
  AnchorsDef, BrandDef, CatDef, ClothingDef, ComboDef, DyeDef, EconomyRules, ItemTier, PhotoCatalog, SetDef,
} from '../domain/types';

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export interface Catalog {
  cats: CatDef[];
  clothes: ClothingDef[];
  combos: ComboDef[];
}

export class CatalogError extends Error {
  constructor(readonly errors: string[]) {
    super(`Catálogo inválido:\n- ${errors.join('\n- ')}`);
    this.name = 'CatalogError';
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isSlot = (v: unknown): boolean => (SLOT_ORDER as readonly unknown[]).includes(v);
const isCategory = (v: unknown): boolean => (CATEGORIES as readonly unknown[]).includes(v);
const TIERS: readonly ItemTier[] = ['basica', 'linda', 'lujo'];

function finish<T>(value: unknown, errors: string[]): Result<T> {
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: value as T };
}

/** Walks a list of objects, checking text fields and unique ids; `each` adds the custom checks. */
function checkList(
  name: string,
  data: unknown,
  textFields: string[],
  errors: string[],
  each: (entry: Obj, path: string) => void,
): void {
  if (!Array.isArray(data)) {
    errors.push(`${name}: debe ser un arreglo`);
    return;
  }
  const seen = new Set<unknown>();
  data.forEach((entry, i) => {
    const path = `${name}[${i}]`;
    if (!isObj(entry)) {
      errors.push(`${path}: debe ser un objeto`);
      return;
    }
    for (const f of textFields) if (!isText(entry[f])) errors.push(`${path}.${f}: debe ser texto`);
    if (isText(entry.id)) {
      if (seen.has(entry.id)) errors.push(`${path}.id: "${entry.id}" está repetido`);
      seen.add(entry.id);
    }
    each(entry, path);
  });
}

export function validateCats(data: unknown): Result<CatDef[]> {
  const errors: string[] = [];
  checkList('cats', data, ['id', 'name', 'coat', 'texture'], errors, () => {});
  return finish(data, errors);
}

export function validateClothes(data: unknown): Result<ClothingDef[]> {
  const errors: string[] = [];
  checkList('clothes', data, ['id', 'name', 'texture', 'icon'], errors, (c, path) => {
    if (!isSlot(c.slot)) errors.push(`${path}.slot: "${String(c.slot)}" no existe (usa ${SLOT_ORDER.join(', ')})`);
    if (!isCategory(c.category)) {
      errors.push(`${path}.category: "${String(c.category)}" no existe (usa ${CATEGORIES.join(', ')})`);
    }
    if (!Array.isArray(c.tags) || !c.tags.every((t) => typeof t === 'string')) {
      errors.push(`${path}.tags: debe ser una lista de textos`);
    }
    if (c.offset !== undefined && !(isObj(c.offset) && typeof c.offset.x === 'number' && typeof c.offset.y === 'number')) {
      errors.push(`${path}.offset: debe tener x e y numéricos`);
    }
    for (const flag of ['secret', 'starter', 'dyeable']) {
      if (c[flag] !== undefined && typeof c[flag] !== 'boolean') errors.push(`${path}.${flag}: debe ser true o false`);
    }
    if (c.tier !== undefined && !(TIERS as readonly unknown[]).includes(c.tier)) {
      errors.push(`${path}.tier: "${String(c.tier)}" no existe (usa ${TIERS.join(', ')})`);
    }
  });
  return finish(data, errors);
}

export function validateCombos(data: unknown, clothes: readonly ClothingDef[]): Result<ComboDef[]> {
  const errors: string[] = [];
  const byId = new Map(clothes.map((c) => [c.id, c]));
  checkList('combos', data, ['id', 'name', 'reaction', 'rewardItemId'], errors, (combo, path) => {
    const before = errors.length;
    const reward = byId.get(combo.rewardItemId as string);
    if (isText(combo.rewardItemId)) {
      if (!reward) errors.push(`${path}.rewardItemId: la prenda "${combo.rewardItemId}" no existe`);
      else if (reward.secret !== true) errors.push(`${path}.rewardItemId: "${reward.id}" debe tener secret: true`);
    }
    if (isText(combo.reaction) && !(COMBO_REACTIONS as readonly string[]).includes(combo.reaction)) {
      errors.push(`${path}.reaction: "${combo.reaction}" no existe (usa ${COMBO_REACTIONS.join(', ')})`);
    }
    if (!Array.isArray(combo.requires)) {
      errors.push(`${path}.requires: debe ser un arreglo`);
      return;
    }
    if (combo.requires.length === 0) errors.push(`${path}.requires: debe tener al menos un requisito`);
    combo.requires.forEach((req: unknown, j: number) => {
      const rp = `${path}.requires[${j}]`;
      if (!isObj(req)) errors.push(`${rp}: debe ser un objeto`);
      else if (isText(req.itemId)) {
        const needed = byId.get(req.itemId);
        if (!needed) errors.push(`${rp}: la prenda "${req.itemId}" no existe`);
        else if (needed.secret === true) errors.push(`${rp}: "${needed.id}" es secreta y no puede ser un requisito`);
      } else if (isText(req.slot) && isText(req.tag)) {
        if (!isSlot(req.slot)) errors.push(`${rp}.slot: "${req.slot}" no existe`);
      } else errors.push(`${rp}: debe tener itemId o slot y tag`);
    });
    // Only when everything above is fine: a combo must be completable with visible items.
    if (combo.requires.length > 0 && errors.length === before && !comboOutfit(combo as unknown as ComboDef, clothes)) {
      errors.push(`${path}.requires: ninguna combinación de prendas visibles lo completa`);
    }
  });
  return finish(data, errors);
}

export function validateCatalog(raw: { cats: unknown; clothes: unknown; combos: unknown }): Result<Catalog> {
  const cats = validateCats(raw.cats);
  const clothes = validateClothes(raw.clothes);
  // Combos are checked against the clothes, so they wait until the clothes are valid.
  const combos = clothes.ok ? validateCombos(raw.combos, clothes.value) : null;
  const errors = [
    ...(cats.ok ? [] : cats.errors),
    ...(clothes.ok ? [] : clothes.errors),
    ...(combos && !combos.ok ? combos.errors : []),
  ];
  return finish(raw, errors);
}

export function assertCatalog(raw: { cats: unknown; clothes: unknown; combos: unknown }): Catalog {
  const r = validateCatalog(raw);
  if (!r.ok) throw new CatalogError(r.errors);
  return r.value;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPoint = (v: unknown): boolean => isObj(v) && isNum(v.x) && isNum(v.y);
const isRect = (v: unknown): boolean =>
  isObj(v) && isNum(v.x) && isNum(v.y) && isNum(v.width) && isNum(v.height) && v.width > 0 && v.height > 0;

/** Checks art/anchors.json (copied to data/anchors.json): canvas, anchors, details, boxes and drop zone. */
export function validateAnchors(data: unknown): Result<AnchorsDef> {
  const errors: string[] = [];
  if (!isObj(data)) return { ok: false, errors: ['anchors: debe ser un objeto'] };
  const canvas = data.canvas;
  if (!(isObj(canvas) && isNum(canvas.width) && isNum(canvas.height) && canvas.width > 0 && canvas.height > 0)) {
    errors.push('anchors.canvas: debe tener width y height positivos');
  }
  const group = (name: string, keys: readonly string[] | null, ok: (v: unknown) => boolean, what: string) => {
    const g = data[name];
    if (!isObj(g)) {
      errors.push(`anchors.${name}: debe ser un objeto`);
      return;
    }
    for (const k of keys ?? Object.keys(g)) if (!ok(g[k])) errors.push(`anchors.${name}.${k}: debe ser ${what}`);
  };
  group('anchors', ANCHOR_NAMES, isPoint, 'un punto {x, y}');
  group('details', null, isPoint, 'un punto {x, y}');
  group('boxes', BOX_NAMES, isRect, 'una caja {x, y, width, height}');
  if (!isRect(data.dropZone)) errors.push('anchors.dropZone: debe ser una caja {x, y, width, height}');
  return finish(data, errors);
}

// ---- Second stage: rules in JSON (ADR 0017) ----

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Pushes a message unless `v` is an integer; `min` is the smallest allowed value. */
function checkInt(v: unknown, path: string, errors: string[], min: 0 | 1 = 0): v is number {
  if (isInt(v) && v >= min) return true;
  errors.push(`${path}: debe ser un entero ${min === 0 ? 'mayor o igual a 0' : 'mayor que 0'}`);
  return false;
}

/** Reads a nested object, or reports it and returns an empty one so the checks below can keep going. */
function block(parent: Obj, key: string, path: string, errors: string[]): Obj {
  const v = parent[key];
  if (isObj(v)) return v;
  errors.push(`${path}.${key}: debe ser un objeto`);
  return {};
}

const SCORING_BONUSES = ['style', 'love', 'complete', 'combo', 'favoriteItem', 'favoriteDye'];
const SCORING_CAPS = ['style', 'love', 'combo', 'color'];

function checkScoring(scoring: Obj, errors: string[]): void {
  const p = 'economy.scoring';
  const weights = block(scoring, 'weights', p, errors);
  for (const k of SCORING_BONUSES) checkInt(weights[k], `${p}.weights.${k}`, errors);
  if (!(isInt(weights.dislike) && weights.dislike <= 0)) errors.push(`${p}.weights.dislike: debe ser un entero menor o igual a 0`);
  const caps = block(scoring, 'caps', p, errors);
  for (const k of SCORING_CAPS) checkInt(caps[k], `${p}.caps.${k}`, errors);
  const t = scoring.starThresholds;
  const grows = Array.isArray(t) && t.length === 4 && t.every(isInt) && t.every((n, i) => i === 0 || n > t[i - 1]);
  if (!grows) errors.push(`${p}.starThresholds: deben ser 4 números que crecen`);
  if (!Array.isArray(scoring.ignoredTags) || !scoring.ignoredTags.every((x) => typeof x === 'string')) {
    errors.push(`${p}.ignoredTags: debe ser una lista de textos`);
  }
}

/** Checks economy.json: wallet, prices, payouts, milestones, novelty, bonuses and the scoring rules. */
export function validateEconomy(data: unknown): Result<EconomyRules> {
  if (!isObj(data)) return { ok: false, errors: ['economy: debe ser un objeto'] };
  const errors: string[] = [];
  checkInt(data.startWallet, 'economy.startWallet', errors);
  checkInt(data.discoveryBonus, 'economy.discoveryBonus', errors);
  checkInt(data.comboBonus, 'economy.comboBonus', errors);
  checkScoring(block(data, 'scoring', 'economy', errors), errors);

  const prices = block(data, 'prices', 'economy', errors);
  const priceOk = [...TIERS, 'dye'].map((k) => checkInt(prices[k], `economy.prices.${k}`, errors, 1));
  const [b, l, u] = TIERS.map((k) => prices[k] as number);
  if (priceOk.every(Boolean) && !(b < l && l < u)) errors.push('economy.prices: los precios deben crecer con el nivel (basica < linda < lujo)');

  const payout = block(data, 'payout', 'economy', errors);
  const byStars = block(payout, 'byStars', 'economy.payout', errors);
  const starsOk = [1, 2, 3, 4, 5].map((n) => checkInt(byStars[n], `economy.payout.byStars.${n}`, errors));
  if (starsOk.every(Boolean) && ![2, 3, 4, 5].every((n) => (byStars[n] as number) >= (byStars[n - 1] as number))) {
    errors.push('economy.payout.byStars: el pago debe crecer con las estrellas');
  }
  const near = payout.nearFactor;
  if (!(typeof near === 'number' && near > 0 && near <= 1)) errors.push('economy.payout.nearFactor: debe estar entre 0 y 1');
  checkInt(payout.tip, 'economy.payout.tip', errors);

  const m = block(data, 'milestones', 'economy', errors);
  const mOk = ['threeStars', 'fourStars', 'fiveStars'].map((k) => checkInt(m[k], `economy.milestones.${k}`, errors));
  if (mOk.every(Boolean) && !(m.threeStars as number <= (m.fourStars as number) && m.fourStars as number <= (m.fiveStars as number))) {
    errors.push('economy.milestones: los hitos deben crecer (3 estrellas <= 4 estrellas <= 5 estrellas)');
  }
  checkInt(block(data, 'novelty', 'economy', errors).window, 'economy.novelty.window', errors, 1);
  return finish(data, errors);
}

/** Checks dyes.json: unique ids, #RRGGBB colors and at least one starter bottle. */
export function validateDyes(data: unknown): Result<DyeDef[]> {
  const errors: string[] = [];
  checkList('dyes', data, ['id', 'name'], errors, (d, path) => {
    if (!(typeof d.hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(d.hex))) {
      errors.push(`${path}.hex: "${String(d.hex)}" debe ser un color #RRGGBB`);
    }
    if (d.starter !== undefined && typeof d.starter !== 'boolean') errors.push(`${path}.starter: debe ser true o false`);
    if (d.id === WATER_ID) errors.push(`${path}.id: "${WATER_ID}" está reservado para la herramienta de agua`);
  });
  if (Array.isArray(data) && data.length > 0 && !data.some((d) => isObj(d) && d.starter === true)) {
    errors.push('dyes: al menos un frasco debe ser starter');
  }
  return finish(data, errors);
}

/** Shop rules across clothes and combos (ADR 0017): tiers or starters, secrets out of the shop, starters can win a combo. */
export function validateShopRules(clothes: readonly ClothingDef[], combos: readonly ComboDef[]): Result<ClothingDef[]> {
  const errors: string[] = [];
  for (const c of clothes) {
    if (c.secret === true) {
      if (c.tier !== undefined || c.starter === true) errors.push(`clothes "${c.id}": las prendas secretas no se venden ni son iniciales`);
    } else if (c.tier !== undefined && c.starter === true) {
      errors.push(`clothes "${c.id}": no puede tener tier y starter a la vez`);
    } else if (c.tier === undefined && c.starter !== true) {
      errors.push(`clothes "${c.id}": toda prenda visible necesita tier o starter`);
    }
  }
  const starters = clothes.filter((c) => c.starter === true);
  if (!combos.some((combo) => comboOutfit(combo, starters) !== null)) {
    errors.push('combos: las prendas iniciales deben completar al menos un combo');
  }
  return finish([...clothes], errors);
}

// ---- Second stage: tastes, sets, photo and brand (ADR 0017) ----

const HEX = /^#[0-9A-Fa-f]{6}$/;
const intIn = (v: unknown, min: number, max: number): v is number => isInt(v) && v >= min && v <= max;
const isTextList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0);

/** Tastes of every cat (cats.json -> prefs): tags that exist in a visible item, a visible favorite and a color from dyes.json. */
export function validateCatPrefs(cats: readonly CatDef[], clothes: readonly ClothingDef[], dyes: readonly DyeDef[]): Result<CatDef[]> {
  const errors: string[] = [];
  const tags = new Set(clothes.filter((c) => c.secret !== true).flatMap((c) => c.tags));
  const byId = new Map(clothes.map((c) => [c.id, c]));
  const dyeIds = new Set(dyes.map((d) => d.id));
  cats.forEach((cat, i) => {
    const p = `cats[${i}].prefs`;
    const prefs = cat.prefs as unknown;
    if (!isObj(prefs)) {
      errors.push(`${p}: debe ser un objeto`);
      return;
    }
    const tagList = (key: 'loves' | 'dislikes', count: number): string[] => {
      const list = prefs[key];
      if (!(isTextList(list) && list.length === count)) {
        errors.push(`${p}.${key}: deben ser ${count} tags`);
        return [];
      }
      list.forEach((t, j) => {
        if (!tags.has(t)) errors.push(`${p}.${key}[${j}]: ninguna prenda visible tiene el tag "${t}"`);
      });
      return list;
    };
    const loves = tagList('loves', 2);
    tagList('dislikes', 1).forEach((t, j) => {
      if (loves.includes(t)) errors.push(`${p}.dislikes[${j}]: "${t}" no puede gustar y disgustar a la vez`);
    });
    const fav = byId.get(prefs.favoriteItem as string);
    if (!fav) errors.push(`${p}.favoriteItem: la prenda "${String(prefs.favoriteItem)}" no existe`);
    else if (fav.secret === true) errors.push(`${p}.favoriteItem: "${fav.id}" es secreta`);
    if (!dyeIds.has(prefs.favoriteDye as string)) errors.push(`${p}.favoriteDye: el frasco "${String(prefs.favoriteDye)}" no existe en dyes.json`);
    if (!isText(prefs.hint)) errors.push(`${p}.hint: debe ser texto`);
  });
  return finish([...cats], errors);
}

export interface SetRefs {
  clothes: readonly ClothingDef[];
  dyes: readonly DyeDef[];
  combos: readonly ComboDef[];
  cats: readonly CatDef[];
}

/** Checks sets.json: every required id exists (and no item is secret) and every set asks for something. */
export function validateSets(data: unknown, refs: SetRefs): Result<SetDef[]> {
  const errors: string[] = [];
  const items = new Map(refs.clothes.map((c) => [c.id, c]));
  const dyeIds = new Set(refs.dyes.map((d) => d.id));
  const comboIds = new Set(refs.combos.map((c) => c.id));
  checkList('sets', data, ['id', 'name'], errors, (set, path) => {
    if (!isTextList(set.reward)) errors.push(`${path}.reward: debe ser una lista de textos`);
    const req = set.requires;
    if (!isObj(req)) {
      errors.push(`${path}.requires: debe ser un objeto`);
      return;
    }
    const ids = (key: 'items' | 'dyes' | 'combos', problemOf: (id: string) => string | null) => {
      const list = req[key];
      if (list === undefined) return;
      if (!isTextList(list)) errors.push(`${path}.requires.${key}: debe ser una lista de textos`);
      else {
        list.forEach((id, j) => {
          const problem = problemOf(id);
          if (problem) errors.push(`${path}.requires.${key}[${j}]: ${problem}`);
        });
      }
    };
    ids('items', (id) => {
      const c = items.get(id);
      return !c ? `la prenda "${id}" no existe` : c.secret === true ? `"${id}" es secreta` : null;
    });
    ids('dyes', (id) => (dyeIds.has(id) ? null : `el frasco "${id}" no existe`));
    ids('combos', (id) => (comboIds.has(id) ? null : `el combo "${id}" no existe`));
    if (req.keychains !== undefined) {
      const kc = isObj(req.keychains) ? req.keychains : {};
      if (!intIn(kc.count, 1, refs.cats.length)) {
        errors.push(`${path}.requires.keychains.count: debe ser un entero entre 1 y ${refs.cats.length} (los gatos)`);
      }
      if (!intIn(kc.minStars, 1, 5)) errors.push(`${path}.requires.keychains.minStars: debe ser un entero entre 1 y 5`);
    }
    if (['items', 'dyes', 'combos', 'keychains'].every((key) => req[key] === undefined)) errors.push(`${path}.requires: debe pedir algo`);
  });
  return finish(data, errors);
}

/** Minimum starter pieces per section of the photo mode (design S6 and section 4). */
export const MIN_PHOTO_STARTERS = { backgrounds: 2, frames: 1, stickers: 4, poses: 2 } as const;

function checkKeychain(k: unknown, errors: string[]): void {
  if (!isObj(k)) {
    errors.push('photo.keychain: debe ser un objeto');
    return;
  }
  const p = 'photo.keychain';
  const gold = intIn(k.goldFrom, 1, 5);
  const charm = intIn(k.charmFrom, 1, 5);
  if (!gold) errors.push(`${p}.goldFrom: debe ser un entero entre 1 y 5`);
  if (!charm) errors.push(`${p}.charmFrom: debe ser un entero entre 1 y 5`);
  if (gold && charm && (k.charmFrom as number) < (k.goldFrom as number)) errors.push(`${p}: charmFrom no puede ser menor que goldFrom`);
  if (!intIn(k.borderCopies, 12, 16)) errors.push(`${p}.borderCopies: debe ser un entero entre 12 y 16`);
  if (!(isNum(k.borderRadius) && k.borderRadius > 0)) errors.push(`${p}.borderRadius: debe ser un número mayor que 0`);
  if (!(typeof k.borderColor === 'string' && HEX.test(k.borderColor))) errors.push(`${p}.borderColor: "${String(k.borderColor)}" debe ser un color #RRGGBB`);
  if (!(isNum(k.varnishAlpha) && k.varnishAlpha >= 0 && k.varnishAlpha <= 1)) errors.push(`${p}.varnishAlpha: debe estar entre 0 y 1`);
}

/** Checks photo.json against sets.json: unlocks, unique ids, textures per section, starters, rewards and keychain rules. */
export function validatePhoto(data: unknown, sets: readonly SetDef[]): Result<PhotoCatalog> {
  if (!isObj(data)) return { ok: false, errors: ['photo: debe ser un objeto'] };
  const errors: string[] = [];
  const setIds = new Set(sets.map((s) => s.id));
  const listOf = new Map<string, string>();
  const pieces = new Map<string, { path: string; unlock: unknown }>();
  for (const key of ['backgrounds', 'frames', 'stickers', 'poses'] as const) {
    const prefix = key === 'poses' ? null : PHOTO_SECTIONS[key].prefix;
    let starters = 0;
    checkList(`photo.${key}`, data[key], prefix ? ['id', 'name', 'texture'] : ['id', 'name'], errors, (piece, path) => {
      if (isText(piece.id)) {
        // checkList only sees repeats inside one list; set rewards point to ids of any list.
        const owner = listOf.get(piece.id);
        if (owner !== undefined && owner !== key) errors.push(`${path}.id: "${piece.id}" está repetido`);
        if (owner === undefined) {
          listOf.set(piece.id, key);
          pieces.set(piece.id, { path, unlock: piece.unlock });
        }
      }
      if (prefix && isText(piece.texture) && !piece.texture.startsWith(prefix)) errors.push(`${path}.texture: debe empezar con "${prefix}"`);
      const u = piece.unlock;
      if (u === 'starter') starters++;
      else if (isObj(u) && 'set' in u) {
        if (!(isText(u.set) && setIds.has(u.set))) errors.push(`${path}.unlock.set: el set "${String(u.set)}" no existe en sets.json`);
      } else if (isObj(u) && 'albumPct' in u) {
        if (!intIn(u.albumPct, 1, 100)) errors.push(`${path}.unlock.albumPct: debe ser un entero entre 1 y 100`);
      } else if (!(isObj(u) && u.firstFiveStar === true)) {
        errors.push(`${path}.unlock: debe ser "starter", { set }, { albumPct } o { firstFiveStar }`);
      }
      // The piece must be listed in the reward of the set that unlocks it.
      if (isObj(u) && isText(u.set)) {
        const owner = sets.find((s) => s.id === u.set);
        if (owner && !owner.reward.includes(piece.id as string)) errors.push(`${path}.unlock.set: el set "${owner.id}" no lo da en su reward`);
      }
    });
    if (Array.isArray(data[key]) && starters < MIN_PHOTO_STARTERS[key]) {
      errors.push(`photo.${key}: debe haber al menos ${MIN_PHOTO_STARTERS[key]} piezas iniciales`);
    }
  }
  checkKeychain(data.keychain, errors);
  sets.forEach((set, i) => {
    set.reward.forEach((id, j) => {
      const u = pieces.get(id)?.unlock;
      if (!pieces.has(id)) errors.push(`sets[${i}].reward[${j}]: la pieza "${id}" no existe en photo.json`);
      else if (!(isObj(u) && u.set === set.id)) errors.push(`sets[${i}].reward[${j}]: "${id}" no tiene unlock { set: "${set.id}" }`);
    });
  });
  return finish(data, errors);
}

/** Checks brand.json: the texts, the two characters and, if they have a texture, that it is in the manifest. */
export function validateBrand(data: unknown, textures?: ReadonlySet<string>): Result<BrandDef> {
  if (!isObj(data)) return { ok: false, errors: ['brand: debe ser un objeto'] };
  const errors: string[] = [];
  for (const k of ['shopSign', 'packagingLine', 'reverseLine', 'signature']) {
    if (!isText(data[k])) errors.push(`brand.${k}: debe ser texto`);
  }
  for (const who of ['judge', 'seller']) {
    const c = data[who];
    if (!isObj(c)) {
      errors.push(`brand.${who}: debe ser un objeto`);
      continue;
    }
    if (!isText(c.name)) errors.push(`brand.${who}.name: debe ser texto`);
    if (c.texture !== undefined && !(isText(c.texture) && (!textures || textures.has(c.texture)))) {
      errors.push(`brand.${who}.texture: "${String(c.texture)}" no está en el manifiesto`);
    }
  }
  return finish(data, errors);
}

/** Everything in src/game/data/, validated and cross checked. It is a Catalog plus the rule files (ADR 0017). */
export interface GameData extends Catalog {
  economy: EconomyRules;
  dyes: DyeDef[];
  sets: SetDef[];
  photo: PhotoCatalog;
  brand: BrandDef;
}

export interface RawGameData {
  cats: unknown;
  clothes: unknown;
  combos: unknown;
  economy: unknown;
  dyes: unknown;
  sets: unknown;
  photo: unknown;
  brand: unknown;
  /** Texture keys of the manifest, to check the characters of brand.json. Without it that check is skipped (the manifest comes from this data). */
  textures?: ReadonlySet<string>;
}

export function validateGameData(raw: RawGameData): Result<GameData> {
  const base = validateCatalog(raw);
  const economy = validateEconomy(raw.economy);
  const dyes = validateDyes(raw.dyes);
  const errors = [...(base.ok ? [] : base.errors), ...(economy.ok ? [] : economy.errors), ...(dyes.ok ? [] : dyes.errors)];
  const brand = validateBrand(raw.brand, raw.textures);
  if (!brand.ok) errors.push(...brand.errors);
  if (base.ok && dyes.ok) {
    const { cats, clothes, combos } = base.value;
    const shop = validateShopRules(clothes, combos);
    if (!shop.ok) errors.push(...shop.errors);
    const prefs = validateCatPrefs(cats, clothes, dyes.value);
    if (!prefs.ok) errors.push(...prefs.errors);
    const sets = validateSets(raw.sets, { clothes, dyes: dyes.value, combos, cats });
    if (!sets.ok) errors.push(...sets.errors);
    else {
      const photo = validatePhoto(raw.photo, sets.value);
      if (!photo.ok) errors.push(...photo.errors);
    }
  }
  const data: Partial<RawGameData> = { ...raw };
  delete data.textures;
  return finish(data, errors);
}

export function assertGameData(raw: RawGameData): GameData {
  const r = validateGameData(raw);
  if (!r.ok) throw new CatalogError(r.errors);
  return r.value;
}
