import type Phaser from 'phaser';
import type { Game } from 'phaser';
import type { Outfit, Point, Rect, SaveData } from './domain/types';
import { GAME_WIDTH, PluginKeys, RegistryKeys, SceneKeys, SfxKeys } from './constants';
import type { AudioPlugin } from './plugins/AudioPlugin';
import type { SavePlugin } from './plugins/SavePlugin';
import { SAVE_KEY } from './plugins/saveCore';
import type { Session } from './domain/session';
import { chooseCat, emptySession } from './domain/session';
import { readSession, writeSession } from './systems/sessionStore';
import type { Catalog } from './data/schema';

/** What a scene reports to the test hook, in game coordinates (1280 x 720). */
export interface DressUpE2EState {
  catId: string;
  /** Name the player gave the cat (shown on the sign). */
  catName: string;
  /** Current angle of the cat's tail in degrees. */
  tailAngle: number;
  /** Ids of every cat in the catalog. */
  catIds: string[];
  outfit: Outfit;
  /** Worn item ids, back to front (render order). */
  layers: string[];
  /** Selected category tab. */
  activeTab: string | null;
  /** Center of the grid cell of each item of the tab, including the ones scrolled out of view. */
  cells: Record<string, Point>;
  /** Ids of the cells that are completely inside the grid viewport (safe to drag). */
  visibleCells: string[];
  /** The grid viewport and its scroll (px of content), `targetScroll` being where the easing is going. */
  grid: Rect & { scroll: number; targetScroll: number; maxScroll: number };
  /** Center of each category tab. */
  tabs: Record<string, Point>;
  /** The cat's drop zone, margin included. */
  dropZone: Rect;
  /** Where to grab each worn item to drag it off the cat. */
  layerGrab: Record<string, Point>;
  /** Rows of the layers panel, front first, with the position of each ✕. */
  layerRows: { itemId: string; close: Point }[];
  dragging: boolean;
  /** F9: true while the magnet holds the dragged item on its anchor (the half transparent preview is up). */
  magnet: boolean;
  /** F9: where the magnet of each slot pulls to (the slot anchor of the cat). */
  slotAnchors: Record<string, Point>;
  /** F9: worn item ids in the order the cat really draws them, back to front (display list, not the domain). */
  drawOrder: string[];
  /** F8: the secrets counter ("Secretos X/N") and the unlocked combo ids. */
  secrets: { unlocked: string[]; count: number; total: number; text: string; revealing: string[]; sign: string; signLog: string[]; trace: { revealing: string[]; count: number; text: string }[] };
  /** The gift box on screen, with the bow to drag; null when there is none. */
  gift: { comboId: string; itemId: string; ready: boolean; opened: boolean; bow: Point; box: Point } | null;
  /** Gifts waiting for the one on screen to be opened. */
  pendingGifts: number;
  /** Ids of the combos that lack exactly one piece (the "¡Casi...!" hint). */
  almost: string[];
  /** `reaction` of every combo reaction played in this visit, newest last. */
  reactions: string[];
  /** True when no entrance animation or drag is running, so positions are stable. */
  settled: boolean;
}

export interface E2EScene {
  getE2EState(): DressUpE2EState;
  e2eWear(ids: string[]): void;
}

/** The same state in page coordinates (CSS pixels), ready for `page.mouse`. */
export interface VisteDressUpState extends Omit<DressUpE2EState, 'cells' | 'tabs' | 'slotAnchors' | 'dropZone' | 'layerGrab' | 'layerRows' | 'grid' | 'gift'> {
  grid: DressUpE2EState['grid'] & { center: Point };
  /** CSS pixels per game pixel (the canvas is scaled to fit the window). */
  pxPerGamePx: number;
  slotAnchors: Record<string, Point>;
  cells: Record<string, Point>;
  tabs: Record<string, Point>;
  dropZone: Rect & { center: Point };
  layerGrab: Record<string, Point>;
  layerRows: { itemId: string; close: Point }[];
  gift: (Omit<NonNullable<DressUpE2EState['gift']>, 'bow' | 'box'> & { bow: Point; box: Point }) | null;
}

/** What the scenes without a DressUp report: their buttons and points of interest, in game coordinates. */
export interface UiState {
  /** True when the entrance animations are over and the buttons answer. */
  ready: boolean;
  buttons: Record<string, Point>;
  points: Record<string, Point>;
  info: Record<string, unknown>;
}

export interface E2EUi {
  getE2EUi(): UiState;
}

export interface VisteUi extends UiState {
  scene: string;
}

export interface VisteHook {
  readonly scene: string | null;
  /** Live state of the DressUp scene, or null when it is not active. */
  readonly dressUp: VisteDressUpState | null;
  /** Buttons and points of the active scene (page coordinates), or null when it has none. */
  readonly ui: VisteUi | null;
  /** The cat, name and outfit that travel between scenes. */
  readonly session: Session;
  /** What is stored in localStorage right now (what a reload would restore). */
  readonly saved: SaveData;
  /** Audio mute state (persisted in the save). */
  readonly muted: boolean;
  /** Sound keys present in the audio cache, to check that the Preloader loaded them. */
  readonly loadedSounds: string[];
  /** Every sound that the game asked the AudioPlugin to play, in order (also when it was muted or limited). `random(a,b,c)` is a playRandom. */
  readonly sounds: string[];
  /** Test-only action (the rest of the hook is read-only): sets the mute through the AudioPlugin. */
  setMuted(muted: boolean): void;
  /** Test-only action: puts exactly these items on the cat in DressUp without dragging (the last piece of a combo is still dragged). */
  wear(ids: string[]): void;
  /**
   * Test-only action: stops the active scenes and starts `scene` without reloading the page (the boot is the slowest part of a test).
   * Title and CatSelect start like a visit (the saved cat comes back); any other scene gets a naked cat (the first one, or `catId`)
   * named `name`, as the `?start=` shortcut does.
   */
  jump(scene: string, catId?: string, name?: string): void;
  /** Number of frames the game loop has run (stops growing while parked). */
  readonly frames: number;
  /** Test-only action: stops (or restarts) the game loop, so a page that is not being tested does not use the CPU. */
  park(parked: boolean): void;
  /** Test-only action: forgets the saved progress (cat, name, outfit, secrets), unmutes and empties the sound log, as a first visit would. */
  reset(): void;
}

/** ADR 0012: read-only test hook, only in test mode or with ?e2e=1. Never in a normal build. */
export function isE2EEnabled(): boolean {
  return import.meta.env.MODE === 'test' || new URLSearchParams(window.location.search).get('e2e') === '1';
}

const isE2EUi = (s: Phaser.Scene): s is Phaser.Scene & E2EUi => typeof (s as Partial<E2EUi>).getE2EUi === 'function';

/**
 * Test mode only: `?start=Scene` makes the Preloader jump to that scene (with `&cat=<id>` and `&name=<text>`),
 * so specs about one scene do not have to walk the whole flow. Returns null in a normal build.
 */
export function e2eStart(): { scene: string; catId: string | null; name: string | null } | null {
  if (!isE2EEnabled()) return null;
  const q = new URLSearchParams(window.location.search);
  const scene = q.get('start');
  return scene ? { scene, catId: q.get('cat'), name: q.get('name') } : null;
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
  const audio = () => game.plugins.get(PluginKeys.Audio) as AudioPlugin;
  const sounds: string[] = [];
  const plugin = audio();
  const play = plugin.play.bind(plugin);
  const playRandom = plugin.playRandom.bind(plugin);
  plugin.play = (key, options) => {
    sounds.push(key);
    return play(key, options);
  };
  plugin.playRandom = (keys, options) => {
    sounds.push(`random(${keys.join(',')})`);
    return playRandom(keys, options);
  };
  const hook: VisteHook = Object.freeze({
    get sounds(): string[] {
      return [...sounds];
    },
    get saved(): SaveData {
      return (game.plugins.get(PluginKeys.Save) as SavePlugin).saved;
    },
    get muted(): boolean {
      return audio().muted;
    },
    get loadedSounds(): string[] {
      return Object.values(SfxKeys).filter((k) => game.cache.audio.exists(k));
    },
    setMuted(muted: boolean): void {
      audio().setMuted(muted);
    },
    wear(ids: string[]): void {
      game.scene.getScenes(true).find(isE2EScene)?.e2eWear(ids);
    },
    get frames(): number {
      return game.loop.frame;
    },
    park(parked: boolean): void {
      if (parked) game.loop.sleep();
      else game.loop.wake();
    },
    reset(): void {
      audio().setMuted(false);
      const save = game.plugins.get(PluginKeys.Save) as SavePlugin;
      save.flush();
      window.localStorage.removeItem(SAVE_KEY);
      sounds.length = 0;
    },
    jump(scene: string, catId?: string, name?: string): void {
      const catalog = game.registry.get(RegistryKeys.Catalog) as Catalog;
      if (scene === SceneKeys.Title || scene === SceneKeys.CatSelect) {
        // The start of a visit: what was saved comes back (a first visit has nothing), as the Preloader does.
        (game.plugins.get(PluginKeys.Save) as SavePlugin).restoreInto(catalog);
      } else {
        const cat = catalog.cats.find((c) => c.id === catId) ?? catalog.cats[0];
        writeSession(game.registry, chooseCat(emptySession(), cat.id, name ?? cat.name));
      }
      for (const active of game.scene.getScenes(true)) game.scene.stop(active.scene.key);
      game.scene.start(scene);
    },
    get session(): Session {
      return readSession(game.registry);
    },
    get ui(): VisteUi | null {
      const scene = game.scene.getScenes(true).find(isE2EUi);
      if (!scene) return null;
      const u = scene.getE2EUi();
      const map = toPage();
      const mapAll = (o: Record<string, Point>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, map(v)]));
      return { scene: scene.scene.key, ready: u.ready, buttons: mapAll(u.buttons), points: mapAll(u.points), info: u.info };
    },
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
      const gt = map({ x: s.grid.x, y: s.grid.y });
      const grid = { ...s.grid, x: gt.x, y: gt.y, width: s.grid.width * f, height: s.grid.height * f };
      return {
        ...s,
        grid: { ...grid, center: { x: grid.x + grid.width / 2, y: grid.y + grid.height / 2 } },
        gift: s.gift && { ...s.gift, bow: map(s.gift.bow), box: map(s.gift.box) },
        pxPerGamePx: f,
        slotAnchors: mapAll(s.slotAnchors),
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
