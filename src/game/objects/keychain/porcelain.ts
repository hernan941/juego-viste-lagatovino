// The porcelain treatment of the render of a look (ADR 0021): border of flat copies, "hand painted" ColorMatrix, varnish clipped
// with ERASE and the hardware, all flattened into ONE texture. Everything here is drawn once, when a keychain is built, never
// per frame; the temporary textures and images are destroyed before it returns.
import Phaser from 'phaser';
import { KeychainTextures } from '../../constants';
import {
  borderOffsets,
  hardwareParts,
  porcelainMatrix,
  type HardwarePartId,
  type KeychainLayout,
  type Ring,
} from '../../domain/keychain';

/** The texture of each piece of hardware. */
export const PART_TEXTURE: Record<HardwarePartId, string> = {
  chain: KeychainTextures.Chain,
  charm: KeychainTextures.Charm,
  eyelet: KeychainTextures.Eyelet,
  'ring-silver': KeychainTextures.RingSilver,
  'ring-gold': KeychainTextures.RingGold,
};

export interface PorcelainParams {
  /** Key of the flattened result. */
  key: string;
  /** DynamicTexture with the render of the look, `px` x `px` (the caller removes it). */
  lookKey: string;
  px: number;
  layout: KeychainLayout;
  ring: Ring;
  /** False leaves the hardware out: the transformation of the photo mode puts it on live, piece by piece. */
  hardware: boolean;
  /** Copies per ring of the border and the widths of the cream border and of the ink line outside it, in texture px. */
  copies: number;
  borderPx: number;
  inkPx: number;
  cream: number;
  ink: number;
  varnishAlpha: number;
  /** The "hand painted" ColorMatrix (photo.json -> keychain). */
  saturation: number;
  warmth: number;
}

/** An Image that is not on the display list: it only exists to be drawn into a texture. */
function offImage(scene: Phaser.Scene, key: string, x: number, y: number): Phaser.GameObjects.Image {
  return new Phaser.GameObjects.Image(scene, x, y, key);
}

function dynamic(scene: Phaser.Scene, key: string, width: number, height: number): Phaser.Textures.DynamicTexture {
  const texture = scene.textures.addDynamicTexture(key, width, height);
  if (!texture) throw new Error(`Could not create the texture "${key}"`);
  return texture;
}

/** A solid-color copy of the silhouette of `sourceKey` (the tint in FILL mode: Phaser 4 has no setTintFill). */
function silhouette(scene: Phaser.Scene, key: string, sourceKey: string, px: number, color: number): void {
  const texture = dynamic(scene, key, px, px);
  const img = offImage(scene, sourceKey, px / 2, px / 2).setTint(color).setTintMode(Phaser.TintModes.FILL);
  texture.draw(img);
  texture.render();
  img.destroy();
}

/**
 * Clips `artKey` to the silhouette of `lookKey` into the new texture `outKey` (px x px) with the ERASE method (ADR 0021): the
 * mask filter does not clip with `render.maxTextures: 1`. `inv` = white minus the look = the outside of the silhouette; it is
 * erased from the art. The caller removes `outKey`. `place` is how the art is drawn (position and scale in texture px).
 */
export function clipToSilhouette(
  scene: Phaser.Scene, outKey: string, artKey: string, lookKey: string, px: number,
  place: { x: number; y: number; scale: number; alpha?: number; angle?: number } = { x: px / 2, y: px / 2, scale: px / 512 },
): void {
  const invKey = `${outKey}~inv`;
  const inv = dynamic(scene, invKey, px, px);
  const plain = offImage(scene, lookKey, px / 2, px / 2);
  const art = offImage(scene, artKey, place.x, place.y).setScale(place.scale).setAlpha(place.alpha ?? 1).setAngle(place.angle ?? 0);
  const invImg = offImage(scene, invKey, px / 2, px / 2);
  try {
    inv.fill(0xffffff);
    inv.erase(plain);
    inv.render();
    const out = dynamic(scene, outKey, px, px);
    out.draw(art);
    out.erase(invImg);
    out.render();
  } finally {
    plain.destroy();
    art.destroy();
    invImg.destroy();
    scene.textures.remove(invKey);
  }
}

/** Builds the flattened keychain texture `p.key` and returns it. Only that texture survives. */
export function bakePorcelain(scene: Phaser.Scene, p: PorcelainParams): Phaser.Textures.DynamicTexture {
  const { layout: l, px } = p;
  const temp: string[] = [];
  const objects: Phaser.GameObjects.Image[] = [];
  const image = (key: string, x: number, y: number) => {
    const img = offImage(scene, key, x, y);
    objects.push(img);
    return img;
  };
  const comp = dynamic(scene, p.key, l.width, l.height);
  try {
    const cx = l.look.x + px / 2;
    const cy = l.look.y + px / 2;

    // Two rings of copies of the silhouette: the ink line underneath (a bit wider) and the cream border on top.
    const inkKey = `${p.key}~ink`;
    const creamKey = `${p.key}~cream`;
    temp.push(inkKey, creamKey);
    silhouette(scene, inkKey, p.lookKey, px, p.ink);
    silhouette(scene, creamKey, p.lookKey, px, p.cream);
    for (const [key, radius] of [[inkKey, p.borderPx + p.inkPx], [creamKey, p.borderPx]] as const) {
      for (const o of borderOffsets(p.copies, radius)) comp.stamp(key, undefined, cx + o.x, cy + o.y);
    }

    // The look, a little desaturated and warmer, like hand painted (the border is not touched).
    const look = image(p.lookKey, cx, cy);
    look.enableFilters();
    look.filters?.internal.addColorMatrix().colorMatrix.set(porcelainMatrix(p.saturation, p.warmth));
    comp.draw(look);

    // The varnish: soft white shines, clipped to the silhouette.
    const varnishKey = `${p.key}~varnish`;
    temp.push(varnishKey, `${varnishKey}~inv`);
    clipToSilhouette(scene, varnishKey, KeychainTextures.Varnish, p.lookKey, px, { x: px / 2, y: px / 2, scale: px / 512, alpha: p.varnishAlpha });
    comp.draw(image(varnishKey, cx, cy));

    // Hardware: the chain and charm (5 stars) go behind the ring, the eyelet screws into the head and the ring hangs from it.
    if (p.hardware) {
      for (const part of hardwareParts(l, p.ring)) {
        comp.draw(image(PART_TEXTURE[part.part], part.x, part.y).setOrigin(part.origin.x, part.origin.y).setScale(part.scale).setAngle(part.angle));
      }
    }
    comp.render();
    return comp;
  } catch (error) {
    scene.textures.remove(p.key);
    throw error;
  } finally {
    for (const o of objects) o.destroy();
    for (const k of temp) if (scene.textures.exists(k)) scene.textures.remove(k);
  }
}
