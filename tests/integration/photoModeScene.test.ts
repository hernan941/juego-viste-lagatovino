import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/sceneFake')).phaserSceneMock);

const h = vi.hoisted(() => ({
  go: vi.fn(),
  transitionIn: vi.fn(),
  takePhoto: vi.fn(async () => 'data:image/png;base64,AAAA'),
  savePhoto: vi.fn(async () => 'downloaded'),
  buttons: [] as { label: string; emit(ev: string): void; destroyed: boolean }[],
  cats: [] as { outfit: string[]; held: string[]; destroyed: boolean }[],
  bubbles: [] as { text: string; destroyed: boolean }[],
}));

vi.mock('../../src/game/systems/navigate', () => ({ go: (...a: unknown[]) => h.go(...a) }));
vi.mock('../../src/game/systems/transitions', () => ({
  enterKind: (d: { transition?: string } | undefined) => d?.transition ?? null,
  transitionIn: (...a: unknown[]) => h.transitionIn(...a),
}));
vi.mock('../../src/game/systems/download', () => ({ savePhoto: (...a: unknown[]) => h.savePhoto(...(a as [])) }));
vi.mock('../../src/game/objects/photo', () => ({ PHOTO_POSE: 'amor', takePhoto: (...a: unknown[]) => h.takePhoto(...(a as [])) }));
vi.mock('../../src/game/objects/ui', () => ({ touchEnv: () => ({ touch: false, scale: 1 }) }));
vi.mock('../../src/game/plugins/AudioPlugin', () => ({ getAudio: (s: { plugins: { get(k: string): unknown } }) => s.plugins.get('audio') }));
vi.mock('../../src/game/objects/Cat', () => ({
  Cat: class {
    outfit: string[] = []; held: string[] = []; destroyed = false; wornIds: string[] = [];
    constructor() { h.cats.push(this); }
    setDepth() { return this; }
    setOutfit(items: { id: string }[]) { this.outfit = items.map((i) => i.id); this.wornIds = this.outfit; }
    appear() {}
    hold(e: string) { this.held.push(e); }
    squash() {}
    destroy() { this.destroyed = true; }
  },
}));
vi.mock('../../src/game/objects/Button', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    Button: class extends Emitter {
      destroyed = false; x: number; y: number;
      constructor(_s: unknown, x: number, y: number, public label: string) { super(); this.x = x; this.y = y; h.buttons.push(this as never); }
      setDepth() { return this; }
      getCenter() { return { x: this.x, y: this.y }; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/MuteButton', async () => ({ MuteButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));
vi.mock('../../src/game/objects/MotionButton', async () => ({ MotionButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));
vi.mock('../../src/game/objects/kit/PaperBackground', async () => ({ PaperBackground: class { setDepth() { return this; } destroy() {} } }));
vi.mock('../../src/game/objects/kit/SpeechBubble', async () => ({
  SpeechBubble: class { destroyed = false; constructor(_s: unknown, _x: number, _y: number, public text: string) { h.bubbles.push(this); } setDepth() { return this; } destroy() { this.destroyed = true; } },
}));

import { PhotoMode } from '../../src/game/scenes/PhotoMode';
import { ObjectEvents, RegistryKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import { photoFileName } from '../../src/game/domain/photo';
import { assertGameData } from '../../src/game/data/schema';
import anchors from '../../src/game/data/anchors.json';
import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import combos from '../../src/game/data/combos.json';
import economy from '../../src/game/data/economy.json';
import dyes from '../../src/game/data/dyes.json';
import sets from '../../src/game/data/sets.json';
import photo from '../../src/game/data/photo.json';
import brand from '../../src/game/data/brand.json';
import type { FakeScene } from './helpers/sceneFake';

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand });
const sweater = catalog.clothes.find((c) => c.slot === 'sweater')!;

type Scene = FakeScene & {
  init(d?: unknown): void; create(): void;
  getE2EUi(): { ready: boolean; buttons: Record<string, unknown>; points: Record<string, unknown>; info: Record<string, unknown> };
};

function open(data?: unknown, session: Record<string, unknown> = { catId: catalog.cats[0]!.id, catName: 'Luna', outfit: { sweater: sweater.id } }) {
  const scene = new PhotoMode() as unknown as Scene;
  scene.registry.set(RegistryKeys.Catalog, catalog);
  scene.registry.set(RegistryKeys.Anchors, anchors);
  scene.registry.set(RegistryKeys.Progress, emptyProgress(0));
  for (const [k, v] of Object.entries({ catId: session.catId, catName: session.catName, outfit: session.outfit })) scene.registry.set(k, v);
  scene.init(data);
  scene.create();
  return scene;
}
const button = (label: string) => h.buttons.find((b) => b.label === label)!;
const run = (scene: FakeScene) => { for (const d of [...scene.time.delayed]) d.fn(); scene.time.delayed.length = 0; };

beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => ({}), body: {} });
  vi.stubGlobal('navigator', {});
  for (const m of [h.go, h.transitionIn, h.takePhoto, h.savePhoto]) m.mockClear();
  for (const list of [h.buttons, h.cats, h.bubbles]) list.length = 0;
});

describe('PhotoMode scene (F18.2)', () => {
  it('shows the cat of the look, dressed, and enters with the transition it was started with', () => {
    open({ transition: 'flash' });
    expect(h.cats).toHaveLength(1);
    expect(h.cats[0]!.outfit).toEqual([sweater.id]);
    expect(h.transitionIn).toHaveBeenCalledWith(expect.anything(), 'flash', expect.anything());
  });

  it('wears the look it was handed, not the session', () => {
    const other = catalog.clothes.find((c) => c.slot === 'head')!;
    open({ look: { catId: catalog.cats[1]!.id, catName: 'Kiwi', outfit: { head: other.id } } });
    expect(h.cats[0]!.outfit).toEqual([other.id]);
  });

  it('starts with the first unlocked background and frame, and reports the rating for the e2e hook', () => {
    const scene = open({ rating: { points: 90, stars: 5, breakdown: [] } });
    const info = scene.getE2EUi().info;
    expect(info).toMatchObject({ background: 'bg-cuadriculado', frame: 'frame-polaroid', pose: 'pose-sentadito', stars: 5, catName: 'Luna' });
  });

  it('Guardar takes the photo of the cat, saves it with the cat name and says it is ready', async () => {
    const scene = open();
    button('Guardar').emit(ObjectEvents.ButtonClick);
    expect(scene.played).toContain('sfx-shutter');
    expect(scene.getE2EUi().info.photoBusy).toBe(true);
    run(scene);
    await vi.waitFor(() => expect(h.savePhoto).toHaveBeenCalledTimes(1));
    expect(h.savePhoto.mock.calls[0]).toEqual([expect.objectContaining({ touch: false }), 'data:image/png;base64,AAAA', photoFileName('Luna')]);
    await vi.waitFor(() => expect(scene.getE2EUi().info.photos).toBe(1));
    expect(scene.getE2EUi().info).toMatchObject({ photoBusy: false, lastPhoto: photoFileName('Luna') });
    expect(h.bubbles.map((b) => b.text)).toEqual(['¡Foto lista!']);
  });

  it('ignores a second Guardar while the first is going', async () => {
    const scene = open();
    button('Guardar').emit(ObjectEvents.ButtonClick);
    button('Guardar').emit(ObjectEvents.ButtonClick);
    run(scene);
    await vi.waitFor(() => expect(h.savePhoto).toHaveBeenCalledTimes(1));
    expect(h.takePhoto).toHaveBeenCalledTimes(1);
  });

  it('Seguir vistiendo goes on dressing, once', () => {
    const scene = open();
    button('Seguir vistiendo').emit(ObjectEvents.ButtonClick);
    button('Seguir vistiendo').emit(ObjectEvents.ButtonClick);
    expect(h.go).toHaveBeenCalledTimes(1);
    expect(h.go).toHaveBeenCalledWith(scene, 'keepDressing');
  });

  it('init resets the state of a previous visit', async () => {
    const scene = open();
    button('Guardar').emit(ObjectEvents.ButtonClick);
    run(scene);
    await vi.waitFor(() => expect(scene.getE2EUi().info.photos).toBe(1));
    scene.init();
    scene.create();
    expect(scene.getE2EUi().info).toMatchObject({ photos: 0, lastPhoto: null, photoBusy: false });
  });

  it('cleans everything on shutdown', () => {
    const scene = open();
    scene.events.emit('shutdown');
    expect(h.buttons.every((b) => b.destroyed)).toBe(true);
    expect(h.cats.every((c) => c.destroyed)).toBe(true);
    expect(scene.activeTweens).toHaveLength(0);
    expect(scene.time.delayed).toHaveLength(0);
  });
});
