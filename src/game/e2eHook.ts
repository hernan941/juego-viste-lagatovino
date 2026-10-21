import type Phaser from 'phaser';
import type { Game } from 'phaser';
import type { Outfit, Point, Rect } from './domain/types';
import { GAME_WIDTH } from './constants';

/** What a scene reports to the test hook, in game coordinates (1280 x 720). */
export interface DressUpE2EState {
  catId: string;
  /** Ids of every cat in the catalog. */
  catIds: string[];
  outfit: Outfit;
  /** Worn item ids, back to front (render order). */
  layers: string[];
  /** Center of the grid cell of each visible item. */
  cells: Record<string, Point>;
  /** Center of each category tab. */
  tabs: Record<string, Point>;
  /** The cat's drop zone, margin included. */
  dropZone: Rect;
  /** Where to grab each worn item to drag it off the cat. */
  layerGrab: Record<string, Point>;
  /** Rows of the layers panel, front first, with the position of each ✕. */
  layerRows: { itemId: string; close: Point }[];
  dragging: boolean;
  /** True when no entrance animation or drag is running, so positions are stable. */
  settled: boolean;
}

export interface E2EScene {
  getE2EState(): DressUpE2EState;
}

/** The same state in page coordinates (CSS pixels), ready for `page.mouse`. */
export interface VisteDressUpState extends Omit<DressUpE2EState, 'cells' | 'tabs' | 'dropZone' | 'layerGrab' | 'layerRows'> {
  cells: Record<string, Point>;
  tabs: Record<string, Point>;
  dropZone: Rect & { center: Point };
  layerGrab: Record<string, Point>;
  layerRows: { itemId: string; close: Point }[];
}

export interface VisteHook {
  readonly scene: string | null;
  /** Live state of the DressUp scene, or null when it is not active. */
  readonly dressUp: VisteDressUpState | null;
}

/** ADR 0012: read-only test hook, only in test mode or with ?e2e=1. Never in a normal build. */
export function isE2EEnabled(): boolean {
  return import.meta.env.MODE === 'test' || new URLSearchParams(window.location.search).get('e2e') === '1';
}

const isE2EScene = (s: Phaser.Scene): s is Phaser.Scene & E2EScene =>
  typeof (s as Partial<E2EScene>).getE2EState === 'function';

export function installE2EHook(game: Game): void {
  if (!isE2EEnabled()) return;
  const toPage = (): ((p: Point) => Point) => {
    const r = game.canvas.getBoundingClientRect();
    const f = r.width / GAME_WIDTH;
    return (p) => ({ x: r.left + p.x * f, y: r.top + p.y * f });
  };
  const hook: VisteHook = Object.freeze({
    get scene(): string | null {
      const active = game.scene.getScenes(true);
      return active.length > 0 ? active[active.length - 1].scene.key : null;
    },
    get dressUp(): VisteDressUpState | null {
      const scene = game.scene.getScenes(true).find(isE2EScene);
      if (!scene) return null;
      const s = scene.getE2EState();
      const map = (p: Point) => toPage()(p);
      const mapAll = (o: Record<string, Point>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, map(v)]));
      const f = game.canvas.getBoundingClientRect().width / GAME_WIDTH;
      const tl = map({ x: s.dropZone.x, y: s.dropZone.y });
      const zone = { x: tl.x, y: tl.y, width: s.dropZone.width * f, height: s.dropZone.height * f };
      return {
        ...s,
        cells: mapAll(s.cells),
        tabs: mapAll(s.tabs),
        layerGrab: mapAll(s.layerGrab),
        layerRows: s.layerRows.map((r) => ({ itemId: r.itemId, close: map(r.close) })),
        dropZone: { ...zone, center: { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 } },
      };
    },
  });
  Object.defineProperty(window, '__VISTE__', { value: hook, writable: false, configurable: false });
}

declare global {
  interface Window {
    readonly __VISTE__?: VisteHook;
  }
}
