// The four pages of the notebook (F17.3 prendas and tintes, F17.4 gatos and looks): which entry is in color, sketched or a silhouette,
// that nothing crosses the spine, the card of an entry, the inner pages and the reduced motion.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);
vi.mock('../../src/game/objects/alphaMap', () => ({ opaqueBounds: () => ({ x: 0.1, y: 0.2, width: 0.8, height: 0.6 }) }));
vi.mock('../../src/game/objects/Cat', async () => {
  const { phaserMock } = await import('./helpers/kitScene');
  const Container = phaserMock.default.GameObjects.Container;
  return { Cat: class extends Container { constructor(s: unknown, x: number, y: number, public def: { id: string }) { super(s, x, y); } setScale() { return this; } } };
});

import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import dyes from '../../src/game/data/dyes.json';
import economy from '../../src/game/data/economy.json';
import { Ink, colorToNumber } from '../../src/game/constants';
import type { GameData } from '../../src/game/data/schema';
import { completion } from '../../src/game/domain/album';
import { HALF } from '../../src/game/domain/albumEntries';
import { emptyProgress } from '../../src/game/domain/progress';
import type { ClothingDef, ComboDef, Progress } from '../../src/game/domain/types';
import type { AlbumPage, AlbumPageContext } from '../../src/game/objects/album/AlbumPage';
import { PAGE_FACTORIES, createPage } from '../../src/game/objects/album/pages';
import { TallyPage } from '../../src/game/objects/album/TallyPage';
import { makeFakeScene, type FakeScene } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const catalog = {
  cats, clothes, combos, dyes, economy, sets: [], photo: { backgrounds: [], frames: [], stickers: [], poses: [] },
} as unknown as GameData;
const context = (progress: Progress): AlbumPageContext => ({ catalog, progress, completion: completion(progress, catalog) });
const fresh = (): Progress => emptyProgress(0);
const paid = (clothes as ClothingDef[]).find((c) => c.tier === 'linda')!;
const starter = (clothes as ClothingDef[]).find((c) => c.starter)!;
const secret = (clothes as ClothingDef[]).find((c) => c.secret)!;

type Cell = { x: number; y: number; width: number; emit(ev: string, ...a: unknown[]): void; destroyed: boolean; list: unknown[] };
interface Info { tab: string; shown: { id: string; state: string }[]; page: number; pages: number; card: string | null; marks: number }
type Page = Omit<AlbumPage, 'info'> & {
  info(): Info; cellOf(id: string): Cell | undefined; cardView(): Cell | null; pager?: { nextPage(): void }; destroyed: boolean;
  left: Cell; right: Cell; list: Cell[];
};

const make = (tab: 'prendas' | 'gatos' | 'looks' | 'tintes', progress: Progress = fresh(), scene: FakeScene = makeFakeScene()) =>
  ({ scene, page: createPage(scene as never, tab, context(progress)) as unknown as Page });
const onHalf = (page: Page, side: 'left' | 'right') => page.info().shown.filter((s) => page[side].list.includes(page.cellOf(s.id)!)).length;
const tap = (cell: Cell) => { cell.emit('pointerdown'); cell.emit('pointerup'); };
const imageCalls = (scene: FakeScene, key: string): string[] =>
  (scene.made.images as { key: string; calls: string[] }[]).filter((i) => i.key === key).flatMap((i) => i.calls);

describe('registration', () => {
  it('has a page of its own for the four tabs but the hanger', () => {
    for (const tab of ['prendas', 'gatos', 'looks', 'tintes'] as const) {
      expect(PAGE_FACTORIES[tab]).toBeTypeOf('function');
      expect(make(tab).page).not.toBeInstanceOf(TallyPage);
    }
    expect(PAGE_FACTORIES.colgador).toBeUndefined();
  });
});

describe.each(['prendas', 'gatos', 'looks', 'tintes'] as const)('the %s page and the spine', (tab) => {
  it('keeps two halves with the middle free for the rings', () => {
    const { page } = make(tab, { ...fresh(), owned: [paid.id] });
    expect(page.left.x).toBe(HALF.left.center);
    expect(page.right.x).toBe(HALF.right.center);
    const cells = page.info().shown.map((s) => page.cellOf(s.id)!);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(page.left.list.includes(cell) || page.right.list.includes(cell)).toBe(true);
      expect(Math.abs(cell.x) + cell.width / 2).toBeLessThanOrEqual(HALF.width / 2);
    }
  });

  it('leaves nothing hanging and no tween when destroyed', () => {
    const { page, scene } = make(tab);
    page.destroy();
    expect(scene.activeTweens()).toHaveLength(0);
    expect(page.destroyed).toBe(true);
  });

  it('only fades in with reduced motion (no scale, no angle)', () => {
    const { scene } = make(tab, fresh(), makeFakeScene(true));
    expect(scene.tweens.records.length).toBeGreaterThan(0);
    for (const r of scene.tweens.records) {
      expect(r.config.scale).toBeUndefined();
      expect(r.config.angle).toBeUndefined();
    }
  });

  it('is not all there at once: its entries pop in', () => {
    const { scene } = make(tab);
    expect(scene.activeTweens().length).toBeGreaterThan(0);
  });
});

describe('ItemsPage', () => {
  it('shows a spread of 30 and turns to the 20 left', () => {
    const { page } = make('prendas');
    expect(page.info()).toMatchObject({ page: 0, pages: 2 });
    expect(page.info().shown).toHaveLength(30);
    page.pager!.nextPage();
    expect(page.info()).toMatchObject({ page: 1 });
    expect(page.info().shown).toHaveLength(20);
    page.pager!.nextPage();
    expect(page.info().page).toBe(1);
  });

  it('draws what is yours in color and what is not as a pencil sketch', () => {
    const scene = makeFakeScene();
    const { page } = make('prendas', { ...fresh(), owned: [paid.id] }, scene);
    const states = Object.fromEntries(page.info().shown.map((s) => [s.id, s.state]));
    expect(states[paid.id]).toBe('got');
    expect(states[starter.id]).toBe('got');
    const sketch = page.info().shown.find((s) => s.state === 'sketch')!;
    const sketchIcon = (clothes as ClothingDef[]).find((c) => c.id === sketch.id)!.texture;
    expect(imageCalls(scene, sketchIcon)).toContain('setTint');
    expect(imageCalls(scene, paid.icon)).not.toContain('setTint');
    expect(scene.made.texts.some((t) => (t.style as { color: string }).color === Ink.lineaLapiz)).toBe(true);
    expect(colorToNumber(Ink.lineaLapiz)).toBe(0x8fa8e3);
  });

  it('puts the secrets at the end, as a silhouette with a question mark, on the last page', () => {
    const { page } = make('prendas');
    page.pager!.nextPage();
    expect(page.info().shown.some((s) => s.id === secret.id && s.state === 'secret')).toBe(true);
  });

  it('turns a sketch into color when the item is got', () => {
    const before = make('prendas').page.info().shown.find((s) => s.id === paid.id)!;
    expect(before.state).toBe('sketch');
    expect(make('prendas', { ...fresh(), owned: [paid.id] }).page.info().shown.find((s) => s.id === paid.id)!.state).toBe('got');
  });

  it('opens the card of an entry when tapped (no hover needed) and closes it when tapped again', () => {
    const { page } = make('prendas');
    const first = page.info().shown[0]!.id;
    tap(page.cellOf(first)!);
    expect(page.info().card).toBe(first);
    tap(page.cardView()!);
    expect(page.info().card).toBeNull();
  });

  it('opens the card on the half of its entry, never over the spine', () => {
    const { page } = make('prendas');
    const shown = page.info().shown;
    tap(page.cellOf(shown[0]!.id)!);
    expect(page.cardView()!.x).toBe(HALF.left.center);
    tap(page.cellOf(shown[shown.length - 1]!.id)!);
    expect(page.cardView()!.x).toBe(HALF.right.center);
  });

  it('puts a sparkle on the new entries only', () => {
    expect(make('prendas', { ...fresh(), owned: [paid.id], albumSeen: [] }).page.info().marks).toBeGreaterThan(0);
    const seen = fresh();
    seen.owned = [paid.id];
    seen.albumSeen = [...(clothes as ClothingDef[]).filter((c) => c.starter).map((c) => `item:${c.id}`), `item:${paid.id}`];
    expect(make('prendas', seen).page.info().marks).toBe(0);
  });
});

describe('DyesPage', () => {
  it('shows the 10 bottles, the bought ones in color', () => {
    const { page } = make('tintes', { ...fresh(), dyesOwned: ['sol'] });
    expect(page.info().shown).toHaveLength(10);
    expect(page.info().shown.find((s) => s.id === 'sol')!.state).toBe('got');
    expect(page.info().shown.find((s) => s.id === 'lila')!.state).toBe('sketch');
  });

  it('sketches a bottle that is not yours with the pencil tint', () => {
    const scene = makeFakeScene();
    make('tintes', fresh(), scene);
    expect(imageCalls(scene, 'ui-dye-lila')).toContain('setTint');
    expect(imageCalls(scene, 'ui-dye-rosa')).not.toContain('setTint');
  });

  it('opens a card on tap', () => {
    const { page } = make('tintes');
    tap(page.cellOf('lila')!);
    expect(page.info().card).toBe('lila');
  });
});

describe('CatsPage', () => {
  const cat = (cats as { id: string; prefs: { loves: string[] } }[])[0]!;

  it('has the 12 polaroids, six on each half', () => {
    const { page } = make('gatos');
    expect(page.info().shown).toHaveLength(12);
    expect(onHalf(page, 'left')).toBe(6);
    expect(onHalf(page, 'right')).toBe(6);
  });

  it('writes the found tastes and the best star on the polaroid of its cat', () => {
    const scene = makeFakeScene();
    const p = { ...fresh(), tastesFound: { [cat.id]: [`love:${cat.prefs.loves[0]}`, 'favorite'] }, bestStars: { [cat.id]: 4 as const } };
    make('gatos', p, scene);
    const marks = scene.made.texts.map((t) => String(t.text));
    expect(marks.filter((t) => t === '♥').length).toBeGreaterThanOrEqual(1);
    expect(marks).toContain('★');
    expect(marks.some((t) => t.includes('4'))).toBe(true);
  });

  it('shows the hint of a cat with hidden tastes in its card', () => {
    const scene = makeFakeScene();
    const { page } = make('gatos', fresh(), scene);
    tap(page.cellOf(cat.id)!);
    expect(page.info().card).toBe(cat.id);
    expect(scene.made.texts.some((t) => t.text === (cats[0] as { prefs: { hint: string } }).prefs.hint)).toBe(true);
  });

  it('does not stick a sparkle on a cat without news', () => {
    expect(make('gatos').page.info().marks).toBe(0);
    expect(make('gatos', { ...fresh(), tastesFound: { [cat.id]: ['favorite'] } }).page.info().marks).toBe(1);
  });
});

describe('CombosPage', () => {
  it('has a hole for each of the 6 looks, three on each half', () => {
    const { page } = make('looks');
    expect(page.info().shown).toHaveLength(6);
    expect(onHalf(page, 'left')).toBe(3);
    expect(onHalf(page, 'right')).toBe(3);
    expect(page.info().shown.every((s) => s.state === 'missing')).toBe(true);
  });

  it('fills the hole of a won look with its name and the icons of its pieces', () => {
    const combo = (combos as ComboDef[])[0]!;
    const scene = makeFakeScene();
    const { page } = make('looks', { ...fresh(), secrets: [combo.id] }, scene);
    expect(page.info().shown.find((s) => s.id === combo.id)!.state).toBe('got');
    expect(scene.made.texts.some((t) => t.text === combo.name)).toBe(true);
    for (const r of combo.requires) {
      if ('itemId' in r) expect(scene.made.images.some((i) => (i as { key: string }).key === (clothes as ClothingDef[]).find((c) => c.id === r.itemId)!.icon)).toBe(true);
    }
  });

  it('whispers the hint of a look that is not won', () => {
    const scene = makeFakeScene();
    make('looks', fresh(), scene);
    expect(scene.made.texts.some((t) => t.text === (combos as ComboDef[])[0]!.hint)).toBe(true);
  });

  it('opens its card on tap', () => {
    const { page } = make('looks');
    tap(page.cellOf('navidad')!);
    expect(page.info().card).toBe('navidad');
  });
});
