// The hanger page of the album (F19.5): 12 hooks, the keychains drawn from their recipes, a tap that swings only one of them, a second
// tap that brings it to the front, and the flight of the keychain that was just hung. The Keychain itself is faked (its drawing is
// checked in keychain.test.ts and in the browser).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);
vi.mock('../../src/game/objects/alphaMap', () => ({ opaqueBounds: () => ({ x: 0.1, y: 0.2, width: 0.8, height: 0.6 }) }));

interface FakeKeychain {
  recipe: { catId: string; stars: number };
  options: { px?: number; deferred?: boolean; cache?: boolean };
  swings: number[]; stopped: number; destroyed: boolean; x: number; y: number; scale: number; angle: number; alpha: number;
  emit(ev: string, ...a: unknown[]): void;
}
const h = vi.hoisted(() => ({ keychains: [] as unknown[] }));

vi.mock('../../src/game/objects/keychain/Keychain', async () => {
  const { phaserMock } = await import('./helpers/kitScene');
  const Container = phaserMock.default.GameObjects.Container;
  return {
    Keychain: class extends Container {
      swings: number[] = []; stopped = 0; swinging = false;
      layout = { width: 320, height: 380, hang: { x: 160, y: 40 }, look: { x: 30, y: 60 } };
      px: number;
      constructor(s: unknown, x: number, y: number, public recipe: { catId: string; stars: number }, _data: unknown, public options: { px?: number }) {
        super(s, x, y);
        this.px = options.px ?? 512;
        h.keychains.push(this);
      }
      whenReady() { return Promise.resolve(); }
      swing(strength = 1) { this.swings.push(strength); this.swinging = true; }
      stopSwing() { this.stopped++; this.swinging = false; }
    },
    keychainData: () => ({}),
  };
});

import anchors from '../../src/game/data/anchors.json';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import economy from '../../src/game/data/economy.json';
import { ObjectEvents, RegistryKeys, SfxKeys } from '../../src/game/constants';
import type { GameData } from '../../src/game/data/schema';
import { completion } from '../../src/game/domain/album';
import { HALF, HANGER, hangerHooks } from '../../src/game/domain/albumEntries';
import { emptyProgress } from '../../src/game/domain/progress';
import type { CatDef, KeychainRecipe, Progress } from '../../src/game/domain/types';
import type { AlbumPageContext } from '../../src/game/objects/album/AlbumPage';
import { PAGE_AREA } from '../../src/game/objects/album/AlbumPage';
import { PAGE_FACTORIES, createPage } from '../../src/game/objects/album/pages';
import { TallyPage } from '../../src/game/objects/album/TallyPage';
import { makeFakeScene } from './helpers/kitScene';

beforeEach(() => {
  h.keychains.length = 0;
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const catalog = {
  cats, clothes, combos, dyes, economy, sets: [], photo: { backgrounds: [], frames: [], stickers: [], poses: [], keychain: {} },
} as unknown as GameData;
const catList = cats as CatDef[];
const recipeOf = (i: number, stars: 1 | 2 | 3 | 4 | 5 = 3): KeychainRecipe => ({
  catId: catList[i]!.id, catName: catList[i]!.name, outfit: {}, itemDye: {}, pose: 'pose-sentadito', stars,
  photo: { background: 'bg-cuadriculado', frame: 'frame-polaroid', stickers: [] }, createdAt: '2026-01-01T00:00:00.000Z',
});
const progressWith = (...indexes: number[]): Progress => ({ ...emptyProgress(0), keychains: Object.fromEntries(indexes.map((i) => [catList[i]!.id, recipeOf(i)])) });

type Cell = { x: number; y: number; width: number; emit(ev: string, ...a: unknown[]): void; destroyed: boolean; list: unknown[] };
interface Info { tab: string; shown: { id: string; state: string }[]; card: string | null; marks: number; swinging: string | null; focus: string | null; big: string | null }
type Page = {
  info(): Info; cellOf(id: string): Cell | undefined; cardView(): Cell | null; left: Cell; right: Cell; list: Cell[]; destroyed: boolean;
  destroy(): void; reveal(): Promise<void>; bigView(): { scrim: Cell; zone: Cell } | null; closeBig(): void;
};

function make(progress: Progress = emptyProgress(0), opts: { hang?: string | null; reduced?: boolean } = {}) {
  const scene = makeFakeScene(opts.reduced ?? false);
  (scene as unknown as { registry: { get(k: string): unknown } }).registry = {
    get: (k: string) => (k === 'reducedMotion' ? (opts.reduced ?? false) : k === RegistryKeys.Anchors ? anchors : undefined),
  };
  const ctx: AlbumPageContext = { catalog, progress, completion: completion(progress, catalog), hang: opts.hang ?? null };
  return { scene, page: createPage(scene as never, 'colgador', ctx) as unknown as Page };
}
const kc = () => h.keychains as FakeKeychain[];
const tap = (cell: Cell) => { cell.emit('pointerdown'); cell.emit('pointerup'); };
/** Lets the promises of the page run (a macrotask: every microtask has finished). */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const idOf = (i: number) => `keychain:${catList[i]!.id}`;

describe('the hanger page: registration and layout', () => {
  it('has a page of its own, not the tally', () => {
    expect(PAGE_FACTORIES.colgador).toBeTypeOf('function');
    expect(make().page).not.toBeInstanceOf(TallyPage);
  });

  it('has a hook per cat, empty at the start, none of them drawing a keychain', () => {
    const { page } = make();
    expect(page.info().shown).toHaveLength(12);
    expect(page.info().shown.every((s) => s.state === 'empty')).toBe(true);
    expect(kc()).toHaveLength(0);
  });

  it('puts the first two columns on the left half and the last two on the right, each cell on its own side of the spine and inside the sheet', () => {
    const { page } = make();
    const hooks = hangerHooks(12);
    for (const hook of hooks) {
      const cell = page.cellOf(idOf(hook.index))!;
      expect((hook.side === 'left' ? page.left : page.right).list.includes(cell)).toBe(true);
      expect(cell.x).toBeCloseTo(hook.localX);
      // The board spans the spine, but a keychain never hangs over it: its cell stays on its own side of x = 0 and inside the half.
      const pageX = (hook.side === 'left' ? HALF.left.center : HALF.right.center) + cell.x;
      const [min, max] = [pageX - cell.width / 2, pageX + cell.width / 2];
      if (hook.side === 'left') expect(max).toBeLessThan(0);
      else expect(min).toBeGreaterThan(0);
      expect(min).toBeGreaterThanOrEqual(HALF.left.min);
      expect(max).toBeLessThanOrEqual(HALF.right.max);
    }
  });

  it('hangs each keychain from the tip of its hook (K5): the cell sits at the tip and the thumbnail at the middle of the cell, not on the hole of the hook', () => {
    const { page } = make(progressWith(0, 5));
    for (const i of [0, 5]) {
      const hook = hangerHooks(12)[i]!;
      const box = HANGER.cell.fitHeight + HANGER.cell.nameGap + HANGER.cell.nameHeight;
      // The cell is centered on its box (a tap lands anywhere in it); the thumbnail hangs from the top of that box, the tip of the hook.
      expect(page.cellOf(idOf(i))!.y - box / 2).toBeCloseTo(hook.tip.y);
    }
    const box = HANGER.cell.fitHeight + HANGER.cell.nameGap + HANGER.cell.nameHeight;
    for (const k of kc()) expect(k.y).toBeCloseTo(-box / 2);
  });

  it('draws the cork board first, so the halves are above it', () => {
    const { page, scene } = make();
    expect((scene.made.images as { key: string }[]).some((i) => i.key === 'ui-keychain-hanger-board')).toBe(true);
    expect((page as unknown as { list: unknown[] }).list[0]).not.toBe(page.left);
  });
});

describe('the keychains hang from their recipes', () => {
  it('draws one thumbnail (256 px, waiting its turn, kept until the scene shuts down) per saved recipe and says which hooks are filled', () => {
    const { page } = make(progressWith(0, 5));
    expect(kc().map((k) => k.recipe.catId)).toEqual([catList[0]!.id, catList[5]!.id]);
    for (const k of kc()) expect(k.options).toMatchObject({ px: 256, deferred: true, cache: true });
    const states = Object.fromEntries(page.info().shown.map((s) => [s.id, s.state]));
    expect(states[idOf(0)]).toBe('hung');
    expect(states[idOf(5)]).toBe('hung');
    expect(states[idOf(1)]).toBe('empty');
  });

  it('draws an empty hook as a pencil silhouette of its cat (no keychain)', () => {
    const { scene } = make();
    const pencil = (scene.made.images as { key: string; calls: string[] }[]).filter((i) => i.calls.includes('setTint'));
    expect(pencil.map((i) => i.key)).toEqual(expect.arrayContaining(catList.map((c) => c.texture)));
  });

  it('makes the new keychains sparkle (✦) until they are seen', () => {
    const { page } = make(progressWith(2));
    expect(page.info().marks).toBe(1);
  });

  it('fits each keychain under its hook, hanging from the ring (the pivot of the swing is the hook)', () => {
    make(progressWith(0));
    const k = kc()[0]!;
    expect(k.scale).toBeGreaterThan(0);
    expect(k.scale).toBeLessThan(1);
    expect(k.x).toBe(0);
  });
});

describe('touching a keychain', () => {
  it('the first tap swings it with a chain jingle, and only that one: the others keep still', () => {
    const { page, scene } = make(progressWith(0, 1));
    tap(page.cellOf(idOf(0))!);
    expect(kc()[0]!.swings).toEqual([1]);
    expect(kc()[1]!.swings).toEqual([]);
    expect(scene.played).toContain(SfxKeys.Chain);
    expect(page.info()).toMatchObject({ swinging: catList[0]!.id, focus: catList[0]!.id, big: null });
  });

  it('tapping another keychain stops the first one and swings the new one (one swinging at a time)', () => {
    const { page } = make(progressWith(0, 1));
    tap(page.cellOf(idOf(0))!);
    tap(page.cellOf(idOf(1))!);
    expect(kc()[0]!.stopped).toBeGreaterThan(0);
    expect(kc()[1]!.swings).toEqual([1]);
    expect(page.info().focus).toBe(catList[1]!.id);
  });

  it('tinks with the porcelain at each end of its swing, louder when the swing is bigger', () => {
    const { page, scene } = make(progressWith(0));
    tap(page.cellOf(idOf(0))!);
    kc()[0]!.emit(ObjectEvents.KeychainTink, 0.8);
    expect(scene.played).toContain(SfxKeys.Porcelain);
  });

  it('a second tap on the same keychain brings it to the front, big (512 px, drawn at once), and swings it', () => {
    const { page } = make(progressWith(0));
    tap(page.cellOf(idOf(0))!);
    tap(page.cellOf(idOf(0))!);
    const big = kc().filter((k) => k.options.px === 512);
    expect(big).toHaveLength(1);
    expect(big[0]!.recipe.catId).toBe(catList[0]!.id);
    expect(big[0]!.options.deferred).toBeFalsy();
    expect(page.info().big).toBe(catList[0]!.id);
    expect(page.bigView()).not.toBeNull();
    expect(big[0]!.swings.length).toBeGreaterThan(0);
  });

  it('the veil of the big view covers the whole sheet, not only the useful area, so no name of the board shows around it (K5)', () => {
    const { page } = make(progressWith(0));
    tap(page.cellOf(idOf(0))!);
    tap(page.cellOf(idOf(0))!);
    const veil = page.bigView()!.scrim as unknown as { width: number; height: number };
    // The sheet of the notebook is 1120 x 620 shown at 0.9: the veil is more than the useful area (the board and the names are in it) and
    // does not go past the sheet.
    expect(veil.width).toBeGreaterThan(PAGE_AREA.width);
    expect(veil.height).toBeGreaterThan(PAGE_AREA.height);
    expect(veil.width).toBeLessThanOrEqual(1120 * 0.9);
    expect(veil.height).toBeLessThanOrEqual(620 * 0.9);
  });

  it('a tap outside the big keychain puts it back: it is destroyed and the thumbnail is still there', () => {
    const { page, scene } = make(progressWith(0));
    tap(page.cellOf(idOf(0))!);
    tap(page.cellOf(idOf(0))!);
    const big = kc().find((k) => k.options.px === 512)!;
    page.bigView()!.scrim.emit('pointerup');
    expect(big.destroyed).toBe(true);
    expect(page.info().big).toBeNull();
    expect(scene.played).toContain(SfxKeys.Paper);
    expect(kc().find((k) => k.options.px === 256)!.destroyed).toBe(false);
  });

  it('a tap on the big keychain swings it again; a drag pushes it to the side it was dragged to', () => {
    const { page } = make(progressWith(0));
    tap(page.cellOf(idOf(0))!);
    tap(page.cellOf(idOf(0))!);
    const big = kc().find((k) => k.options.px === 512)!;
    const before = big.swings.length;
    page.bigView()!.zone.emit('pointerup');
    expect(big.swings.length).toBe(before + 1);
    page.bigView()!.zone.emit('drag', { x: 400, downX: 600 });
    expect(big.angle).toBeLessThan(0);
    page.bigView()!.zone.emit('dragend');
    expect(big.swings.at(-1)!).toBeLessThan(0);
  });

  it('a tap on an empty hook opens the card of its cat with the hint, and draws no keychain', () => {
    const { page } = make();
    tap(page.cellOf(idOf(3))!);
    expect(page.info().card).toBe(idOf(3));
    expect(kc()).toHaveLength(0);
  });

  it('the page being turned away takes the big keychain and every thumbnail with it', () => {
    const { page, scene } = make(progressWith(0, 1));
    tap(page.cellOf(idOf(0))!);
    tap(page.cellOf(idOf(0))!);
    page.destroy();
    expect(kc().every((k) => k.destroyed)).toBe(true);
    expect(scene.activeTweens()).toHaveLength(0);
  });
});

describe('the keychain that was just hung flies to its hook (F19.5)', () => {
  it('without a hang nothing flies', async () => {
    const { page, scene } = make(progressWith(0));
    const before = scene.tweens.records.length;
    await page.reveal();
    expect(scene.tweens.records.length).toBe(before);
    expect(kc()[0]!.swings).toEqual([]);
  });

  it('only the hung cat flies: it arrives with a click and swings; the others stay', async () => {
    const { page, scene } = make(progressWith(0, 4), { hang: catList[4]!.id });
    const before = scene.tweens.records.length;
    const flying = page.reveal();
    await settle();
    const flight = scene.tweens.records.slice(before).find((r) => r.targets === kc()[1]);
    expect(flight).toBeDefined();
    expect(scene.tweens.records.slice(before).some((r) => r.targets === kc()[0])).toBe(false);
    (flight!.config.onComplete as () => void)();
    await flying;
    expect(scene.played).toContain(SfxKeys.Click);
    expect(kc()[1]!.swings).toEqual([1]);
    expect(kc()[0]!.swings).toEqual([]);
    // It was not touched by the player: the first tap on it swings it again (it does not bring it to the front yet).
    expect(page.info().focus).toBeNull();
  });

  it('with reduced motion it only fades in, with no scale or angle, and still clicks and swings gently', async () => {
    const { page, scene } = make(progressWith(4), { hang: catList[4]!.id, reduced: true });
    const before = scene.tweens.records.length;
    const flying = page.reveal();
    await settle();
    const records = scene.tweens.records.slice(before);
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(r.config.scale).toBeUndefined();
      expect(r.config.angle).toBeUndefined();
    }
    for (const r of records) (r.config.onComplete as (() => void) | undefined)?.();
    await flying;
    expect(scene.played).toContain(SfxKeys.Click);
    expect(kc()[0]!.swings).toEqual([1]);
  });

  it('K1: the keychain that was just hung is hidden from the start, so it is not at rest on its hook before it flies', async () => {
    const { page, scene } = make(progressWith(0, 4), { hang: catList[4]!.id });
    expect(kc()[1]!.alpha).toBe(0);
    expect(kc()[0]!.alpha).toBe(1);
    const flying = page.reveal();
    await settle();
    // It starts the flight from below, still invisible, and only then does the tween show it.
    expect(kc()[1]!.alpha).toBe(0);
    expect(kc()[1]!.y).toBeGreaterThan(kc()[0]!.y + 100);
    for (const r of scene.tweens.records) (r.config.onComplete as (() => void) | undefined)?.();
    await flying;
  });

  it('a hang for a cat without a keychain flies nothing and does not fail', async () => {
    const { page, scene } = make(emptyProgress(0), { hang: catList[0]!.id });
    const before = scene.tweens.records.length;
    await page.reveal();
    expect(scene.tweens.records.length).toBe(before);
  });
});
