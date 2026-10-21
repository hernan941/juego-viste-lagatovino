// Hand-written validation of the JSON catalog (no zod: three small shapes, zero dependencies,
// and Spanish messages that name the exact path). Runs on load in the Preloader (ADR 0010).
import { SLOT_ORDER } from '../domain/slots';
import { ANCHOR_NAMES, BOX_NAMES, CATEGORIES } from '../domain/types';
import type { AnchorsDef, CatDef, ClothingDef, ComboDef } from '../domain/types';

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
    if (c.secret !== undefined && typeof c.secret !== 'boolean') errors.push(`${path}.secret: debe ser true o false`);
  });
  return finish(data, errors);
}

export function validateCombos(data: unknown, clothes: readonly ClothingDef[]): Result<ComboDef[]> {
  const errors: string[] = [];
  const byId = new Map(clothes.map((c) => [c.id, c]));
  checkList('combos', data, ['id', 'name', 'reaction', 'rewardItemId'], errors, (combo, path) => {
    const reward = byId.get(combo.rewardItemId as string);
    if (isText(combo.rewardItemId)) {
      if (!reward) errors.push(`${path}.rewardItemId: la prenda "${combo.rewardItemId}" no existe`);
      else if (reward.secret !== true) errors.push(`${path}.rewardItemId: "${reward.id}" debe tener secret: true`);
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
        if (!byId.has(req.itemId)) errors.push(`${rp}: la prenda "${req.itemId}" no existe`);
      } else if (isText(req.slot) && isText(req.tag)) {
        if (!isSlot(req.slot)) errors.push(`${rp}.slot: "${req.slot}" no existe`);
      } else errors.push(`${rp}: debe tener itemId o slot y tag`);
    });
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
