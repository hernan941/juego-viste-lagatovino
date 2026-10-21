import type Phaser from 'phaser';
import { alphaBounds } from '../domain/imageBounds';
import type { AlphaMap } from '../domain/pixelHit';
import type { Rect } from '../domain/types';

/** Side of the alpha maps: 192 px is plenty to tell where an item is, and cheap to keep. */
const SIDE = 192;
const cache = new WeakMap<Phaser.Textures.TextureManager, Map<string, AlphaMap>>();

/** Alpha channel of a loaded texture scaled to SIDE x SIDE (cached). An empty map if the canvas is not available. */
export function alphaMapOf(scene: Phaser.Scene, key: string): AlphaMap {
  let maps = cache.get(scene.textures);
  if (!maps) cache.set(scene.textures, (maps = new Map()));
  const known = maps.get(key);
  if (known) return known;
  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = new Uint8Array(SIDE * SIDE);
  if (ctx) {
    ctx.drawImage(scene.textures.get(key).getSourceImage() as HTMLImageElement, 0, 0, SIDE, SIDE);
    const rgba = ctx.getImageData(0, 0, SIDE, SIDE).data;
    for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3];
  }
  const map = { width: SIDE, height: SIDE, data };
  maps.set(key, map);
  return map;
}

/** Bounding box of the visible pixels of a texture as fractions (0..1) of it, or null if it is empty. */
export function opaqueBounds(scene: Phaser.Scene, key: string): Rect | null {
  const m = alphaMapOf(scene, key);
  const found = alphaBounds(Array.from(m.data, (a) => [0, 0, 0, a]).flat(), m.width, m.height);
  return found && { x: found.x / m.width, y: found.y / m.height, width: found.width / m.width, height: found.height / m.height };
}
