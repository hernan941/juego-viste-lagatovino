// Pure TS, no Phaser (ADR 0010, 0021). The kraft packaging of the keychain (S8): what is drawn on the card, as operations in the
// coordinates of the card (its middle is 0, 0, the art is 540 x 675). The scene runs them into a RenderTexture, with the live keychain
// hung from the hole for the screen and with its flattened texture for the PNG that is saved.
import { packagingLayout } from './keychain';
import { framePlacement } from './photo';
import { PHOTO_SIZE } from './photoComposition';
import { paperOps, starRow, stickerOps, type SheetInput, type SheetOp } from './photoSheet';
import type { Point, Rect } from './types';

/** The art of the card in px. */
export const CARD_SIZE = { width: 540, height: 675 } as const;

/** Scale at which a keychain texture of `size` fits `rect` when it hangs by `hang` (a point of the texture) from the top of `rect`. */
export function fitKeychain(rect: Rect, size: { width: number; height: number }, hang: Point): number {
  return Math.min(rect.width / size.width, rect.height / (size.height - hang.y));
}

export interface PackageInput {
  photo: SheetInput['photo'];
  composition: SheetInput['composition'];
  catName: string;
  stars: number | null;
  brand: { shopSign: string; signature: string };
  /** Texture key of the art of the card. */
  cardTexture: string;
  /** Texture key of the chain that hangs from the hole to the ring (the art of the charm chain, 48 x 192). */
  chainTexture: string;
  /** The flattened keychain: its size and the point where it hangs. */
  keychain: { width: number; height: number; hang: Point };
}

const SIGN_FONT = 26;
const NAME_FONT = 44;
const TAGLINE_FONT = 32;

/** The operations, back to front: the card, the chain, the tilted photo, the keychain, the name, the stars, the signature and the sign. */
export function packageOps(input: PackageInput): SheetOp[] {
  const layout = packagingLayout({ x: -CARD_SIZE.width / 2, y: -CARD_SIZE.height / 2, width: CARD_SIZE.width, height: CARD_SIZE.height });
  const center = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  const ops: SheetOp[] = [{ kind: 'image', texture: input.cardTexture, x: 0, y: 0 }];

  // The chain goes through the hole and down to the ring: it is the first thing on the card, behind the keychain.
  const { from, to } = layout.chain;
  ops.push({ kind: 'image', texture: input.chainTexture, x: from.x, y: (from.y + to.y) / 2, height: to.y - from.y });

  // The paper of the photo (background and frame, no cat) as a smaller picture pinned behind the keychain, tilted a little (a stable
  // angle per photo, like the table): the tilt turns every piece around the middle of the window.
  const win = center(layout.window);
  const k = Math.min(layout.window.width / PHOTO_SIZE.width, layout.window.height / PHOTO_SIZE.height);
  const { angle } = framePlacement(`${input.catName}|${input.composition.frame ?? ''}`);
  const cos = Math.cos((angle * Math.PI) / 180);
  const sin = Math.sin((angle * Math.PI) / 180);
  const tilt = (op: SheetOp): SheetOp => {
    if (op.kind !== 'image') return op;
    return {
      ...op, x: win.x + (op.x * cos - op.y * sin) * k, y: win.y + (op.x * sin + op.y * cos) * k, angle: (op.angle ?? 0) + angle,
      ...(op.height !== undefined ? { height: op.height * k } : {}),
      ...(op.width !== undefined ? { width: op.width * k } : {}),
      ...(op.height === undefined && op.width === undefined ? { scale: k } : {}),
    };
  };
  ops.push(...paperOps(input).map(tilt));

  ops.push({ kind: 'keychain', x: layout.hang.x, y: layout.hang.y, scale: fitKeychain(layout.keychain, input.keychain, input.keychain.hang) });

  // The stickers are pinned in front of the keychain, so the ones that were chosen always show (K3).
  ops.push(...stickerOps(input).map(tilt));

  const name = center(layout.name);
  ops.push({ kind: 'text', text: input.catName, x: name.x, y: name.y, fontSize: NAME_FONT, maxWidth: layout.name.width });
  if (input.stars !== null) {
    const size = layout.stars.height * 0.9;
    const stars = center(layout.stars);
    const gap = Math.min(10, (layout.stars.width - 5 * size) / 4);
    const step = size + gap;
    const row = starRow(input.stars);
    row.forEach((slot, i) => {
      ops.push({
        kind: 'image', texture: slot.filled ? 'ui-stamp-sol' : 'ui-stamp', x: stars.x + (i - 2) * step, y: stars.y, height: size,
        ...(slot.filled ? {} : { alpha: 0.3 }),
      });
    });
  }
  const tag = center(layout.tagline);
  ops.push({ kind: 'text', text: input.brand.signature, x: tag.x, y: tag.y, fontSize: TAGLINE_FONT, maxWidth: layout.tagline.width });
  const sign = center(layout.sign);
  ops.push({ kind: 'text', text: input.brand.shopSign, x: sign.x, y: sign.y, fontSize: SIGN_FONT, maxWidth: layout.sign.width });
  return ops;
}

/** The operations behind the keychain and the ones in front of it (the live keychain of the screen goes between them). */
export function splitAtKeychain(ops: readonly SheetOp[]): { behind: SheetOp[]; front: SheetOp[] } {
  const at = ops.findIndex((o) => o.kind === 'keychain');
  return at < 0 ? { behind: [...ops], front: [] } : { behind: ops.slice(0, at), front: ops.slice(at + 1) };
}
