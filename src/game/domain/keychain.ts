// Pure TS, no Phaser (ADR 0010, 0021). The keychain: ring by stars, recipe, hanging rule, pendulum and the packaging layout.
import type { ItemDye, KeychainRecipe, KeychainRules, Outfit, Point, Rect, Stars } from './types';

export interface Ring {
  metal: 'silver' | 'gold';
  /** The star charm that comes with 5 stars. */
  charm: boolean;
}

/** Ring by stars: silver with 1 to 3, gold with 4, gold with the charm with 5. Thresholds come from photo.json -> keychain. */
export function ringFor(stars: Stars, rules: Pick<KeychainRules, 'goldFrom' | 'charmFrom'> = { goldFrom: 4, charmFrom: 5 }): Ring {
  return { metal: stars >= rules.goldFrom ? 'gold' : 'silver', charm: stars >= rules.charmFrom };
}

/** Offsets of the copies that make the porcelain border, evenly on a circle starting to the right. */
export function borderOffsets(count: number, radius: number): Point[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const a = (2 * Math.PI * i) / count;
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
  });
}

/** Copies per ring (ink ring and cream ring): 12 at 512 px and above, 8 on the 256 px thumbnails (ADR 0021). */
export function borderCopiesFor(px: number): number {
  return px >= 512 ? 12 : 8;
}

/** What the look is when the player saves. */
export interface Look {
  catId: string;
  catName: string;
  outfit: Outfit;
  itemDye: ItemDye;
  pose: string;
}

export type PhotoChoice = KeychainRecipe['photo'];

/** The recipe to store: copies everything, keeps the dye only of the worn items and the date as ISO. */
export function keychainRecipe(look: Look, photoChoice: PhotoChoice, stars: Stars, date: Date): KeychainRecipe {
  const worn = new Set(Object.values(look.outfit));
  const itemDye: ItemDye = {};
  for (const [itemId, dyeId] of Object.entries(look.itemDye)) if (worn.has(itemId)) itemDye[itemId] = dyeId;
  return {
    catId: look.catId,
    catName: look.catName,
    outfit: { ...look.outfit },
    itemDye,
    pose: look.pose,
    stars,
    photo: { ...photoChoice, stickers: photoChoice.stickers.map((s) => ({ ...s })) },
    createdAt: date.toISOString(),
  };
}

/** Ids that exist today, to clean old recipes (as `sessionFromSave` does). */
export interface KnownIds {
  catIds: readonly string[];
  itemIds: readonly string[];
  dyeIds: readonly string[];
  stickerIds: readonly string[];
  poseIds: readonly string[];
  backgroundIds: readonly string[];
  frameIds: readonly string[];
}

const pick = (value: string, list: readonly string[]): string => (list.length === 0 || list.includes(value) ? value : list[0]);

/** Drops what no longer exists. A recipe without a valid cat or stars is discarded (null). */
export function sanitizeRecipe(recipe: KeychainRecipe, known: KnownIds): KeychainRecipe | null {
  if (!known.catIds.includes(recipe.catId)) return null;
  if (!Number.isInteger(recipe.stars) || recipe.stars < 1 || recipe.stars > 5) return null;
  const outfit = Object.fromEntries(Object.entries(recipe.outfit).filter(([, id]) => id !== undefined && known.itemIds.includes(id))) as Outfit;
  const worn = new Set(Object.values(outfit));
  const itemDye: ItemDye = {};
  for (const [itemId, dyeId] of Object.entries(recipe.itemDye)) {
    if (worn.has(itemId) && known.dyeIds.includes(dyeId)) itemDye[itemId] = dyeId;
  }
  return {
    ...recipe,
    outfit,
    itemDye,
    pose: pick(recipe.pose, known.poseIds),
    photo: {
      background: pick(recipe.photo.background, known.backgroundIds),
      frame: pick(recipe.photo.frame, known.frameIds),
      stickers: recipe.photo.stickers.filter((s) => known.stickerIds.includes(s.id)).map((s) => ({ ...s })),
    },
  };
}

export type KeychainCollection = Readonly<Record<string, KeychainRecipe>>;

/** True when hanging this recipe would replace another one (the player is asked). */
export function needsConfirm(collection: KeychainCollection, recipe: KeychainRecipe): boolean {
  return recipe.catId in collection;
}

/** The highlighted option: keep the one with more stars, the new one on a tie. */
export function defaultReplace(existing: KeychainRecipe, next: KeychainRecipe): boolean {
  return next.stars >= existing.stars;
}

/** Hangs a keychain on its cat's hook. One per cat: `confirm` is the player's answer, and without one the default rule decides. */
export function hangKeychain(
  collection: KeychainCollection,
  recipe: KeychainRecipe,
  confirm?: boolean,
): { collection: Record<string, KeychainRecipe>; replaced: boolean; isFirst: boolean } {
  const existing = collection[recipe.catId];
  if (!existing) return { collection: { ...collection, [recipe.catId]: recipe }, replaced: false, isFirst: true };
  const replace = confirm ?? defaultReplace(existing, recipe);
  return { collection: replace ? { ...collection, [recipe.catId]: recipe } : { ...collection }, replaced: replace, isFirst: false };
}

export interface PendulumParams {
  /** Degrees at the start. */
  amp: number;
  periodMs: number;
  /** Decay per second of the amplitude (exp(-damping * seconds)). */
  damping: number;
}

/** Angle in degrees below which the keychain is considered at rest. */
export const PENDULUM_REST = 0.5;

/** Damped pendulum released from its full amplitude. Depends only on the time `t` (ms), never on the frame rate. */
export function pendulum(t: number, { amp, periodMs, damping }: PendulumParams): number {
  if (t < 0 || amp === 0 || periodMs <= 0) return 0;
  return amp * Math.exp((-damping * t) / 1000) * Math.cos((2 * Math.PI * t) / periodMs);
}

/** Milliseconds until the swing falls under `PENDULUM_REST`. */
export function pendulumDuration({ amp, damping }: PendulumParams): number {
  if (Math.abs(amp) <= PENDULUM_REST) return 0;
  if (damping <= 0) return Infinity;
  return (Math.log(Math.abs(amp) / PENDULUM_REST) / damping) * 1000;
}

export interface PackagingLayout {
  /** Hole to hang the card. */
  hole: Point & { radius: number };
  /** "Lagatovino · hecho a mano". */
  sign: Rect;
  /** The picture: background, frame and stickers. */
  window: Rect;
  /** Where the keychain goes inside the window. */
  keychain: Rect;
  /** Point where the ring hangs (top center of the keychain). */
  hang: Point;
  name: Rect;
  stars: Rect;
  /** "Xoxo, mau!". */
  tagline: Rect;
}

/** Proportional layout of the kraft card inside `frame` (any size, any origin). */
export function packagingLayout(frame: Rect): PackagingLayout {
  const { x, y, width: w, height: h } = frame;
  const rect = (fx: number, fy: number, fw: number, fh: number): Rect => ({ x: x + fx * w, y: y + fy * h, width: fw * w, height: fh * h });
  const window = rect(0.1, 0.18, 0.8, 0.5);
  const keychain = rect(0.2, 0.21, 0.6, 0.44);
  return {
    hole: { x: x + w / 2, y: y + 0.045 * h, radius: 0.022 * w },
    sign: rect(0.15, 0.09, 0.7, 0.07),
    window,
    keychain,
    hang: { x: x + w / 2, y: keychain.y },
    name: rect(0.1, 0.72, 0.8, 0.08),
    stars: rect(0.25, 0.81, 0.5, 0.05),
    tagline: rect(0.15, 0.88, 0.7, 0.06),
  };
}
