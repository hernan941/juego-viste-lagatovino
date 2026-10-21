// Pure core of SavePlugin (ADR 0004): serialize, versioned migration and storage access.
import { SLOT_ORDER, type Slot } from '../domain/slots';
import { SAVE_VERSION, type Outfit, type SaveData } from '../domain/types';

export const SAVE_KEY = `viste-lagato:save:v${SAVE_VERSION}`;

/** The slice of the Web Storage API we need, so tests and Supabase can swap it. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type Obj = Record<string, unknown>;

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, catId: null, catName: '', outfit: {}, secrets: [], muted: false };
}

/** migrations[n] upgrades a save from version n to n + 1. */
const migrations: Record<number, (old: Obj) => Obj> = {
  0: ({ cat, name, mute, ...rest }) => ({ ...rest, catId: cat, catName: name, muted: mute, version: 1 }),
};

function migrate(raw: Obj): Obj | null {
  let version = typeof raw.version === 'number' ? raw.version : 0;
  if (version > SAVE_VERSION) return null;
  let data = raw;
  while (version < SAVE_VERSION) {
    data = migrations[version](data);
    version++;
  }
  return data;
}

function sanitizeOutfit(value: unknown): Outfit {
  if (typeof value !== 'object' || value === null) return {};
  const out: Partial<Record<Slot, string>> = {};
  for (const slot of SLOT_ORDER) {
    const id = (value as Obj)[slot];
    if (typeof id === 'string') out[slot] = id;
  }
  return out;
}

export function serialize(data: SaveData): string {
  return JSON.stringify(data);
}

/** Never throws: corrupt or unknown data yields the defaults, broken fields yield their default. */
export function deserialize(raw: string | null): SaveData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? '');
  } catch {
    return defaultSave();
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return defaultSave();
  const data = migrate(parsed as Obj);
  if (!data) return defaultSave();
  return {
    version: SAVE_VERSION,
    catId: typeof data.catId === 'string' ? data.catId : null,
    catName: typeof data.catName === 'string' ? data.catName : '',
    outfit: sanitizeOutfit(data.outfit),
    secrets: Array.isArray(data.secrets) ? data.secrets.filter((s): s is string => typeof s === 'string') : [],
    muted: data.muted === true,
  };
}

export function loadSave(storage: StorageLike): SaveData {
  try {
    return deserialize(storage.getItem(SAVE_KEY));
  } catch {
    return defaultSave();
  }
}

/** Returns false when the storage refuses the write (private mode, quota). */
export function saveToStorage(storage: StorageLike, data: SaveData): boolean {
  try {
    storage.setItem(SAVE_KEY, serialize(data));
    return true;
  } catch {
    return false;
  }
}
