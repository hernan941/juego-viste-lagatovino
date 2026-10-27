// The notebook button of the fitting room (F17.6): it opens the album handing over the tab and the scroll, and not at a bad moment.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

const h = vi.hoisted(() => ({
  go: vi.fn(),
  buttons: [] as { x: number; y: number; news: boolean; destroyed: boolean; depth: number; emit(ev: string): void; count(ev: string): number }[],
}));

vi.mock('../../src/game/systems/navigate', () => ({ go: (...a: unknown[]) => h.go(...a) }));
vi.mock('../../src/game/objects/NotebookButton', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    NotebookButton: class extends Emitter {
      destroyed = false; depth = 0; scale = 1;
      constructor(_s: unknown, public x: number, public y: number, public news: boolean) { super(); h.buttons.push(this as never); }
      setDepth(d: number) { this.depth = d; return this; }
      setScale(s: number) { this.scale = s; return this; }
      setNews(on: boolean) { this.news = on; }
      getCenter() { return { x: this.x, y: this.y }; }
      destroy() { this.destroyed = true; }
    },
  };
});

import { ObjectEvents, RegistryKeys, SceneKeys } from '../../src/game/constants';
import { assertGameData } from '../../src/game/data/schema';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import economy from '../../src/game/data/economy.json';
import dyes from '../../src/game/data/dyes.json';
import sets from '../../src/game/data/sets.json';
import photo from '../../src/game/data/photo.json';
import brand from '../../src/game/data/brand.json';
import tags from '../../src/game/data/tags.json';
import { albumArgs } from '../../src/game/domain/flow';
import { gotEntries } from '../../src/game/domain/album';
import { emptyProgress } from '../../src/game/domain/progress';
import { AlbumButtonController, ALBUM_BUTTON_AT } from '../../src/game/objects/dressup/AlbumButtonController';
import { controllerFactories } from '../../src/game/objects/dressup/controllers';
import type { DressUpContext } from '../../src/game/objects/dressup/DressUpController';

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand, tags });

function setup(progress = emptyProgress(0), over: { dragging?: boolean; leaving?: boolean } = {}) {
  const scene = { registry: new Map<string, unknown>(), key: SceneKeys.DressUp } as unknown as DressUpContext['scene'] & { registry: Map<string, unknown> };
  scene.registry.set(RegistryKeys.Progress, progress);
  scene.registry.set(RegistryKeys.Catalog, catalog);
  const ctx = {
    scene, catalog,
    tabs: { selectedId: 'head' },
    grid: { getViewport: () => ({ scroll: 120 }) },
    isDragging: () => over.dragging ?? false,
    isLeaving: () => over.leaving ?? false,
  } as unknown as DressUpContext;
  const controller = new AlbumButtonController();
  controller.attach(ctx);
  return { controller, scene, ctx };
}

beforeEach(() => {
  h.go.mockClear();
  h.buttons.length = 0;
});

describe('AlbumButtonController (F17.6)', () => {
  it('is one of the fitting room controllers', () => {
    expect(controllerFactories.some((f) => f() instanceof AlbumButtonController)).toBe(true);
  });

  it('puts the button where the layout says, above the room', () => {
    setup();
    expect(h.buttons).toHaveLength(1);
    expect(h.buttons[0]).toMatchObject({ x: ALBUM_BUTTON_AT.x, y: ALBUM_BUTTON_AT.y });
    expect(h.buttons[0]!.depth).toBeGreaterThan(0);
  });

  it('shows the sparkle while there is something unseen in the album, and not when everything was seen', () => {
    setup();
    expect(h.buttons[0]!.news).toBe(true);
    h.buttons.length = 0;
    const seen = emptyProgress(0);
    setup({ ...seen, albumSeen: gotEntries(seen, catalog) });
    expect(h.buttons[0]!.news).toBe(false);
  });

  it('opens the album with the tab and the scroll to come back to, once', () => {
    const { scene } = setup();
    h.buttons[0]!.emit(ObjectEvents.NotebookPress);
    h.buttons[0]!.emit(ObjectEvents.NotebookPress);
    expect(h.go).toHaveBeenCalledTimes(1);
    expect(h.go).toHaveBeenCalledWith(scene, 'album', albumArgs(SceneKeys.DressUp, { tab: 'head', scroll: 120 }));
  });

  it('does not open it with a garment in the hand, nor while leaving', () => {
    setup(emptyProgress(0), { dragging: true });
    h.buttons[0]!.emit(ObjectEvents.NotebookPress);
    expect(h.go).not.toHaveBeenCalled();
    h.buttons.length = 0;
    setup(emptyProgress(0), { leaving: true });
    h.buttons[0]!.emit(ObjectEvents.NotebookPress);
    expect(h.go).not.toHaveBeenCalled();
  });

  it('tells the test hook where the button is, and that it is settled', () => {
    const { controller } = setup();
    expect(controller.e2eState()).toEqual({ button: { x: ALBUM_BUTTON_AT.x, y: ALBUM_BUTTON_AT.y }, news: true, opening: false });
    expect(controller.isSettled()).toBe(true);
    h.buttons[0]!.emit(ObjectEvents.NotebookPress);
    expect(controller.e2eState().opening).toBe(true);
  });

  it('destroys the button and stops listening', () => {
    const { controller } = setup();
    controller.destroy();
    expect(h.buttons[0]!.destroyed).toBe(true);
    expect(h.buttons[0]!.count(ObjectEvents.NotebookPress)).toBe(0);
  });
});
