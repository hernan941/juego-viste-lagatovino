// Global Plugin (ADR 0018): dyed textures. Dyed variants live in the global texture manager, so the cache
// has to outlive the scenes. The rules live in dyeService.ts / dyeCache.ts (unit-tested); this class
// connects them to the catalog, the text cache and the browser (Blob -> Image -> textures.addImage).
import Phaser from 'phaser';
import { PluginKeys, RegistryKeys } from '../constants';
import type { GameData } from '../data/schema';
import { DyeService } from './dyeService';

export class DyePlugin extends Phaser.Plugins.BasePlugin {
  private service: DyeService | null = null;

  // Built on first use: the catalog is in the registry only after the Preloader ran.
  private get svc(): DyeService {
    if (!this.service) {
      const catalog = this.game.registry.get(RegistryKeys.Catalog) as GameData | undefined;
      if (!catalog) throw new Error('DyePlugin used before the Preloader set the catalog');
      this.service = new DyeService({
        clothes: catalog.clothes,
        dyes: catalog.dyes,
        readSvg: (k) => this.game.cache.text.get(k) as string | undefined,
        rasterize: (key, svg) => this.rasterize(key, svg),
        remove: (key) => {
          if (this.game.textures.exists(key)) this.game.textures.remove(key);
        },
      });
    }
    return this.service;
  }

  /** Texture key for the pair, synchronous (the texture may not exist yet: see `isReady`). */
  keyFor(itemId: string, dyeId: string): string {
    return this.svc.keyFor(itemId, dyeId);
  }

  isReady(itemId: string, dyeId: string): boolean {
    return this.svc.isReady(itemId, dyeId);
  }

  /** Creates the dyed texture on demand and resolves with its key. Asynchronous: the drag keeps going. */
  ensure(itemId: string, dyeId: string): Promise<string> {
    return this.svc.ensure(itemId, dyeId);
  }

  /** Keep a texture alive (worn on a cat, in a render) until `release`. */
  retain(key: string): void {
    this.svc.retain(key);
  }

  release(key: string): void {
    this.svc.release(key);
  }

  private rasterize(key: string, svg: string): Promise<void> {
    const started = import.meta.env.DEV ? performance.now() : 0;
    return new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (this.game.textures.exists(key)) this.game.textures.remove(key);
        this.game.textures.addImage(key, img);
        // Dev only: how long a dyed texture takes (ADR 0018 plan B threshold is ~100 ms).
        if (import.meta.env.DEV) console.debug(`[dye] ${key} rasterized in ${(performance.now() - started).toFixed(1)} ms`);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not rasterize dyed texture "${key}"`));
      };
      img.src = url;
    });
  }

  destroy(): void {
    this.service?.destroy();
    super.destroy();
  }
}

/** The DyePlugin of the game a scene belongs to. */
export function getDye(scene: Phaser.Scene): DyePlugin {
  return scene.plugins.get(PluginKeys.Dye) as DyePlugin;
}
