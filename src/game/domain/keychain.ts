// Pure TS, no Phaser (ADR 0010, 0021). The keychain: ring by stars, recipe, hanging rule, pendulum and the packaging layout.
import type { CatPose } from './catPose';
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

/** The most a keychain is pushed by a drag, in degrees (the same as its full swing). */
export const PUSH_MAX_ANGLE = 14;
/** Degrees of push per game px of drag. */
const PUSH_PER_PX = 0.12;

/** The angle a keychain is pushed to by a horizontal drag of `dx` px: it follows the finger, held at the full swing. */
export function pushAngle(dx: number): number {
  return Math.max(-PUSH_MAX_ANGLE, Math.min(PUSH_MAX_ANGLE, dx * PUSH_PER_PX));
}

/** The strength (-1 to 1) of the swing that a pushed angle lets go with. */
export function pushStrength(angle: number): number {
  return Math.max(-1, Math.min(1, angle / PUSH_MAX_ANGLE));
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

/**
 * Proportional layout of the kraft card inside `frame` (any size, any origin), measured on the art `package-card.svg` (540 x 675): the
 * hole is at (270, 56) and the content goes inside the dashed zone (34, 92) to (506, 640), so nothing sits on the hole.
 */
export function packagingLayout(frame: Rect): PackagingLayout {
  const { x, y, width: w, height: h } = frame;
  const rect = (fx: number, fy: number, fw: number, fh: number): Rect => ({ x: x + fx * w, y: y + fy * h, width: fw * w, height: fh * h });
  const window = rect(0.12, 0.2, 0.76, 0.46);
  const keychain = rect(0.22, 0.215, 0.56, 0.42);
  return {
    hole: { x: x + w / 2, y: y + (56 / 675) * h, radius: (15 / 540) * w },
    sign: rect(0.15, 0.14, 0.7, 0.05),
    window,
    keychain,
    hang: { x: x + w / 2, y: keychain.y },
    name: rect(0.1, 0.685, 0.8, 0.075),
    stars: rect(0.25, 0.765, 0.5, 0.05),
    tagline: rect(0.15, 0.835, 0.7, 0.065),
  };
}

// ---- Building the texture (F19.2) ----------------------------------------------------------------------------------

/** Width in 512 canvas px of the thin ink line outside the cream border. */
export const INK_LINE_PX = 3;

/** 32 bit FNV-1a in hex: enough to tell recipes apart. */
function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
}

const sortedEntries = (o: Record<string, string | undefined>) =>
  Object.entries(o).filter((e): e is [string, string] => e[1] !== undefined).sort(([a], [b]) => a.localeCompare(b));

/**
 * Key of the flattened texture: `keychain~<catId>~<hash>~<px>`. The hash covers what changes the picture (the cat, the outfit,
 * the dyes of the worn items, the pose and the ring) and nothing else, so the same look is drawn once.
 */
export function recipeKey(recipe: KeychainRecipe, px: number): string {
  const ring = ringFor(recipe.stars);
  const body = JSON.stringify([recipe.catId, sortedEntries(recipe.outfit), sortedEntries(recipe.itemDye), recipe.pose, ring.metal, ring.charm]);
  return `keychain~${recipe.catId}~${fnv1a(body)}~${px}`;
}

/** The 4x5 ColorMatrix (20 numbers, row by row) that desaturates (`saturation` 1 = as is) and warms (`warmth` 0 = as is). */
export function porcelainMatrix(saturation: number, warmth: number): number[] {
  const luma = [0.2126, 0.7152, 0.0722];
  const gain = [1 + warmth, 1, 1 - warmth];
  const row = (c: number) => luma.map((l, i) => ((i === c ? saturation : 0) + l * (1 - saturation)) * gain[c]);
  return [...row(0), 0, 0, ...row(1), 0, 0, ...row(2), 0, 0, 0, 0, 0, 1, 0];
}

/** Y (512 canvas px) where the cat's feet are: the origin that a pose rotates and squashes around. */
const FEET_Y = 490;
const CENTER_X = 256;

/** Where a point of the 512 canvas ends up with a photo pose (it turns around the feet, squashes and lifts, as the cat does). */
export function poseTransform(pose: Pick<CatPose, 'angle' | 'lift' | 'scaleX' | 'scaleY'>, p: Point): Point {
  const x = (p.x - CENTER_X) * pose.scaleX;
  const y = (p.y - FEET_Y) * pose.scaleY;
  const a = (pose.angle * Math.PI) / 180;
  return {
    x: CENTER_X + x * Math.cos(a) - y * Math.sin(a),
    y: FEET_Y + x * Math.sin(a) + y * Math.cos(a) - pose.lift,
  };
}

/** Scale of the hardware art (SVGs of art/ui/keychain/) for a look rendered at `px`: the ring is ~70 px at 512. */
export function hardwareScale(px: number): number {
  return 0.55 * (px / 512);
}

/** Art sizes and anchors of the hardware SVGs (their viewBox). */
export const HARDWARE_ART = {
  eyelet: { width: 64, height: 80, root: { x: 32, y: 74 }, loop: { x: 32, y: 26 } },
  ring: { size: 128, band: 48, outer: 62 },
  chain: { width: 48, height: 192, top: { x: 24, y: 4 } },
  charm: { width: 96, height: 128, eye: { x: 48, y: 17 } },
} as const;

/** Degrees the chain of the charm leans outward, so the charm hangs beside the head and not over the face. */
const CHAIN_ANGLE = -62;
/** Fraction of the chain art that is shown (the charm is short and sweet). */
const CHAIN_FRACTION = 0.6;
/** The charm is a little bigger than the hardware scale, so it reads on a 5 star keychain. */
const CHARM_SCALE = 1.05;
/** Px of the eyelet art that sink into the head. */
const EYELET_SINK = 10;

export interface Placed {
  x: number;
  y: number;
  scale: number;
  angle: number;
}

export interface KeychainLayout {
  width: number;
  height: number;
  /** Margin kept free all around for the border. */
  pad: number;
  /** Top left of the look square (px x px) inside the texture. */
  look: Point;
  /** The thread of the eyelet (origin = art root) and the center of the ring. */
  eyelet: Placed;
  ring: Placed;
  /** Origin = art top (24, 4); the charm hangs from its end by its eye (48, 17). Only with the 5 star charm. */
  chain?: Placed;
  charm?: Placed;
  /** Where the keychain hangs from (top of the ring): the pivot of the swing. */
  hang: Point;
}

/**
 * Where everything goes in the flattened texture for a look rendered in a `px` square. `top` is where the top of the head is in the
 * 512 canvas once the pose is applied: the eyelet screws in there and the ring hangs above. Tight: the texture is as big as the look,
 * its border and the hardware, so a short cat gets a taller texture than a cat in a tall hat.
 */
export function keychainLayout(px: number, top: Point, ring: Ring, borderRadius: number): KeychainLayout {
  const k = px / 512;
  const h = hardwareScale(px);
  const pad = Math.ceil((borderRadius + INK_LINE_PX) * k) + 2;
  const { eyelet, ring: r, chain, charm } = HARDWARE_ART;

  // Everything is first placed in the space of the look square (its top left is (0, 0)), then shifted to fit.
  const root = { x: top.x * k, y: top.y * k + EYELET_SINK * h };
  const loopY = root.y - (eyelet.root.y - eyelet.loop.y) * h;
  const ringC = { x: root.x, y: loopY - r.band * h };
  const hang = { x: ringC.x, y: ringC.y - r.outer * h };
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [
    { x0: 0, y0: 0, x1: px, y1: px },
    { x0: root.x - r.outer * h, y0: hang.y, x1: root.x + r.outer * h, y1: root.y },
  ];

  let chainAt: Placed | undefined;
  let charmAt: Placed | undefined;
  if (ring.charm) {
    const a = (CHAIN_ANGLE * Math.PI) / 180;
    // The chain starts on the right side of the ring and leans outward; the charm hangs straight from its end.
    const start = { x: ringC.x + r.band * h * 1.05, y: ringC.y + r.band * h * 0.3 };
    const len = (chain.height - chain.top.y) * CHAIN_FRACTION * h;
    const end = { x: start.x - len * Math.sin(a), y: start.y + len * Math.cos(a) };
    chainAt = { ...start, scale: h * CHAIN_FRACTION, angle: CHAIN_ANGLE };
    charmAt = { ...end, scale: h * CHARM_SCALE, angle: 0 };
    const cw = charm.width * h * CHARM_SCALE;
    const ch = charm.height * h * CHARM_SCALE;
    boxes.push({ x0: end.x - cw / 2, y0: end.y - charm.eye.y * h * CHARM_SCALE, x1: end.x + cw / 2, y1: end.y - charm.eye.y * h * CHARM_SCALE + ch });
  }

  const minX = Math.min(...boxes.map((b) => b.x0));
  const minY = Math.min(...boxes.map((b) => b.y0));
  const maxX = Math.max(...boxes.map((b) => b.x1));
  const maxY = Math.max(...boxes.map((b) => b.y1));
  const dx = pad - minX;
  const dy = pad - minY;
  const move = <T extends Point>(p: T): T => ({ ...p, x: p.x + dx, y: p.y + dy });
  return {
    width: Math.ceil(maxX - minX + 2 * pad),
    height: Math.ceil(maxY - minY + 2 * pad),
    pad,
    look: { x: dx, y: dy },
    eyelet: move({ ...root, scale: h, angle: 0 }),
    ring: move({ ...ringC, scale: h, angle: 0 }),
    chain: chainAt && move(chainAt),
    charm: charmAt && move(charmAt),
    hang: move(hang),
  };
}

export type HardwarePartId = 'chain' | 'charm' | 'eyelet' | 'ring-silver' | 'ring-gold';

export interface HardwarePart extends Placed {
  part: HardwarePartId;
  /** The pivot of the art, 0..1 (where `x`, `y` are). */
  origin: Point;
}

/**
 * The pieces of hardware of a keychain, back to front, as the layout places them: the chain and charm (5 stars) behind, the eyelet
 * and the ring on top. The baked texture, the live pieces of the transformation and the PNG of the packaging all use this list.
 */
export function hardwareParts(layout: KeychainLayout, ring: Ring): HardwarePart[] {
  const { eyelet, chain, charm } = HARDWARE_ART;
  const parts: HardwarePart[] = [];
  if (layout.chain && layout.charm) {
    parts.push({ part: 'chain', ...layout.chain, origin: { x: chain.top.x / chain.width, y: chain.top.y / chain.height } });
    parts.push({ part: 'charm', ...layout.charm, origin: { x: charm.eye.x / charm.width, y: charm.eye.y / charm.height } });
  }
  parts.push({ part: 'eyelet', ...layout.eyelet, origin: { x: eyelet.root.x / eyelet.width, y: eyelet.root.y / eyelet.height } });
  parts.push({ part: ring.metal === 'gold' ? 'ring-gold' : 'ring-silver', ...layout.ring, origin: { x: 0.5, y: 0.5 } });
  return parts;
}
