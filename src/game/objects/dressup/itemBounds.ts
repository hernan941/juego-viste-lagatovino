// Bounding box of the visible pixels of item textures (cached), so the dragged ghost is centered on its own garment.
import type Phaser from 'phaser';
import { alphaBounds } from '../../domain/imageBounds';
import type { ClothingDef, Rect } from '../../domain/types';

export class ItemBounds {
  private readonly cache = new Map<string, Rect | null>();

  constructor(private readonly scene: Phaser.Scene) {}

  /** The box in texture px, or null when the texture has no visible pixel (or no 2D canvas). */
  of(item: ClothingDef): Rect | null {
    if (this.cache.has(item.id)) return this.cache.get(item.id)!;
    const src = this.scene.textures.get(item.texture).getSourceImage() as HTMLImageElement;
    const side = 192;
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let bounds: Rect | null = null;
    if (ctx) {
      ctx.drawImage(src, 0, 0, side, side);
      const found = alphaBounds(ctx.getImageData(0, 0, side, side).data, side, side);
      const k = src.width / side;
      bounds = found && { x: found.x * k, y: found.y * k, width: found.width * k, height: found.height * k };
    }
    this.cache.set(item.id, bounds);
    return bounds;
  }
}
