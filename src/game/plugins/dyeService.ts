// Rules of the DyePlugin (ADR 0018), without Phaser or the DOM: which texture a (item, dye) pair needs,
// how its SVG is recolored, and who keeps it alive. The plugin passes the browser parts (rasterize, remove).
import { CLOTHING_TEXTURE_SIZE, dyeSvgKey } from '../data/assets';
import { WATER_DYE, dyeColors, dyeTextureKey, recolorSvg, sizeSvg } from '../domain/dye';
import type { ClothingDef, DyeDef } from '../domain/types';
import { DYE_CACHE_LIMIT, DyeCache } from './dyeCache';

export interface DyeServiceOptions {
  clothes: readonly ClothingDef[];
  dyes: readonly DyeDef[];
  /** The loaded SVG source text of a dyeable texture (`dyeSvgKey`), if any. */
  readSvg: (svgKey: string) => string | undefined;
  /** Turns the final SVG text into a texture named `key` (Blob, Image, `textures.addImage`). */
  rasterize: (key: string, svgText: string) => Promise<void>;
  remove: (key: string) => void;
  /** Extra "in use" check besides `retain`. */
  inUse?: (key: string) => boolean;
  limit?: number;
}

export class DyeService {
  private readonly cache: DyeCache;
  private readonly held = new Map<string, number>();

  constructor(private readonly opts: DyeServiceOptions) {
    this.cache = new DyeCache({
      limit: opts.limit ?? DYE_CACHE_LIMIT,
      create: (key) => this.create(key),
      destroy: opts.remove,
      inUse: (key) => this.held.has(key) || (opts.inUse?.(key) ?? false),
    });
  }

  /** Texture key for the pair, synchronous. The water is the original texture. */
  keyFor(itemId: string, dyeId: string): string {
    return dyeTextureKey(this.item(itemId).texture, dyeId);
  }

  isReady(itemId: string, dyeId: string): boolean {
    return dyeId === WATER_DYE || this.cache.has(this.keyFor(itemId, dyeId));
  }

  /** Resolves with the texture key once it exists; it is created lazily and never blocks the caller. */
  ensure(itemId: string, dyeId: string): Promise<string> {
    try {
      const item = this.item(itemId);
      if (dyeId === WATER_DYE) return Promise.resolve(item.texture);
      if (!item.dyeable) throw new Error(`Item "${itemId}" is not dyeable`);
      if (!this.dye(dyeId)) throw new Error(`Unknown dye "${dyeId}"`);
      return this.cache.ensure(dyeTextureKey(item.texture, dyeId));
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Marks a texture as in use (on a cat, in a render): it will not be evicted until released. */
  retain(key: string): void {
    this.held.set(key, (this.held.get(key) ?? 0) + 1);
  }

  release(key: string): void {
    const n = (this.held.get(key) ?? 0) - 1;
    if (n > 0) this.held.set(key, n);
    else this.held.delete(key);
  }

  destroy(): void {
    this.cache.clear();
    this.held.clear();
  }

  private item(itemId: string): ClothingDef {
    const item = this.opts.clothes.find((c) => c.id === itemId);
    if (!item) throw new Error(`Unknown item "${itemId}"`);
    return item;
  }

  private dye(dyeId: string): DyeDef | undefined {
    return this.opts.dyes.find((d) => d.id === dyeId);
  }

  // The key is "<texture>~<dyeId>": find the SVG and the dye again from it.
  private async create(key: string): Promise<void> {
    const sep = key.lastIndexOf('~');
    const texture = key.slice(0, sep);
    const dye = this.dye(key.slice(sep + 1));
    const svg = this.opts.readSvg(dyeSvgKey(texture));
    if (!dye || svg === undefined) throw new Error(`Cannot dye "${key}": missing SVG source`);
    await this.opts.rasterize(key, sizeSvg(recolorSvg(svg, dyeColors(dye.hex)), CLOTHING_TEXTURE_SIZE));
  }
}
