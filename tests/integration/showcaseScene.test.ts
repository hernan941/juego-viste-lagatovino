import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/sceneFake')).phaserSceneMock);

interface CeremonyRec {
  plan: { stars: number; coins: number; steps: { kind: string }[] };
  targets: Record<string, unknown> & { onCredit(c: number, t: number): void; onStep(s: { kind: string }): void };
  played: boolean;
  destroyed: boolean;
  finish(): void;
}

const h = vi.hoisted(() => ({
  go: vi.fn(),
  transitionIn: vi.fn(),
  buttons: [] as { label: string; emit(ev: string): void; destroyed: boolean }[],
  cats: [] as { outfit: string[]; held: string[]; destroyed: boolean }[],
  huds: [] as { calls: string[]; destroyed: boolean }[],
  ceremonies: [] as CeremonyRec[],
  backdrops: [] as unknown[][],
  notebooks: [] as { x: number; y: number; news: boolean; destroyed: boolean; emit(ev: string): void }[],
}));

vi.mock('../../src/game/systems/navigate', () => ({ go: (...a: unknown[]) => h.go(...a) }));
vi.mock('../../src/game/systems/transitions', () => ({
  enterKind: (d: { transition?: string } | undefined) => d?.transition ?? null,
  transitionIn: (...a: unknown[]) => h.transitionIn(...a),
}));
vi.mock('../../src/game/objects/ui', () => ({ touchEnv: () => ({ touch: false, scale: 1 }), hex: () => 0, makeText: () => ({}) }));
vi.mock('../../src/game/objects/showcase/runwayBackdrop', () => ({ drawRunwayBackdrop: (...a: unknown[]) => { h.backdrops.push(a); return undefined; } }));
vi.mock('../../src/game/objects/kit/PaperBackground', () => ({ PaperBackground: class { setDepth() { return this; } } }));
vi.mock('../../src/game/plugins/AudioPlugin', () => ({ getAudio: (s: { plugins: { get(k: string): unknown } }) => s.plugins.get('audio') }));
vi.mock('../../src/game/plugins/SavePlugin', () => ({ getSave: () => ({ secrets: [] }) }));
vi.mock('../../src/game/objects/Cat', () => ({
  Cat: class {
    outfit: string[] = []; held: string[] = []; destroyed = false; wornIds: string[] = [];
    constructor() { h.cats.push(this); }
    setDepth() { return this; }
    setOutfit(items: { id: string }[]) { this.outfit = items.map((i) => i.id); this.wornIds = this.outfit; }
    appear() {}
    hold(e: string) { this.held.push(e); }
    squash() {} wiggle() {} glance() {} hop() {} heartbeat() {} release() {}
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
      setAlpha() { return this; }
      setScale() { return this; }
      getCenter() { return { x: this.x, y: this.y }; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/NotebookButton', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    NotebookButton: class extends Emitter {
      destroyed = false;
      constructor(_s: unknown, public x: number, public y: number, public news: boolean) { super(); h.notebooks.push(this as never); }
      setDepth() { return this; }
      setAlpha() { return this; }
      setScale() { return this; }
      setNews() {}
      getCenter() { return { x: this.x, y: this.y }; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/MuteButton', async () => ({ MuteButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));
vi.mock('../../src/game/objects/MotionButton', async () => ({ MotionButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));
vi.mock('../../src/game/objects/FullscreenButton', async () => ({ FullscreenButton: { create: () => null } }));
vi.mock('../../src/game/objects/showcase/SecretsTag', async () => ({ SecretsTag: class { text = ''; setDepth() { return this; } setCount() {} destroy() {} } }));
vi.mock('../../src/game/objects/WalletHud', async () => ({
  WalletHud: class {
    calls: string[] = []; destroyed = false;
    constructor() { h.huds.push(this); }
    setDepth() { return this; }
    setValue(n: number) { this.calls.push(`set:${n}`); }
    hold() { this.calls.push('hold'); }
    adjust(n: number) { this.calls.push(`adjust:${n}`); }
    release(n: number) { this.calls.push(`release:${n}`); }
    getJarPoint() { return { x: 900, y: 30 }; }
    destroy() { this.destroyed = true; }
  },
}));
vi.mock('../../src/game/objects/showcase/Ceremony', () => ({
  Ceremony: class {
    rec: CeremonyRec;
    private done!: () => void;
    constructor(_s: unknown, plan: CeremonyRec['plan'], targets: CeremonyRec['targets']) {
      this.rec = { plan, targets, played: false, destroyed: false, finish: () => this.done() };
      h.ceremonies.push(this.rec);
    }
    play() { this.rec.played = true; return new Promise<void>((r) => { this.done = r; }); }
    destroy() { this.rec.destroyed = true; this.done?.(); }
  },
}));

import { rectsOverlap, runwayStage } from '../../src/game/systems/runwayLayout';
import { Showcase } from '../../src/game/scenes/Showcase';
import { ObjectEvents, RegistryKeys, SceneKeys } from '../../src/game/constants';
import { albumArgs } from '../../src/game/domain/flow';
import { emptyProgress } from '../../src/game/domain/progress';
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
import tags from '../../src/game/data/tags.json';
import type { FakeScene } from './helpers/sceneFake';
import type { Progress, RatingResult } from '../../src/game/domain/types';

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand, tags });
const sweater = catalog.clothes.find((c) => c.slot === 'sweater')!;

type Scene = FakeScene & {
  init(d?: unknown): void; create(): void;
  getE2EUi(): { ready: boolean; buttons: Record<string, unknown>; points: Record<string, unknown>; info: Record<string, unknown> };
};

function open(data?: unknown, extra: Record<string, unknown> = {}) {
  const scene = new Showcase() as unknown as Scene;
  scene.registry.set(RegistryKeys.Catalog, catalog);
  scene.registry.set(RegistryKeys.Anchors, anchors);
  scene.registry.set(RegistryKeys.Progress, emptyProgress(catalog.economy.startWallet));
  scene.registry.set(RegistryKeys.CatId, catalog.cats[0]!.id);
  scene.registry.set(RegistryKeys.CatName, 'Luna');
  scene.registry.set(RegistryKeys.Outfit, { sweater: sweater.id });
  for (const [k, v] of Object.entries(extra)) scene.registry.set(k, v);
  scene.init(data);
  scene.create();
  return scene;
}
const run = (scene: FakeScene) => { for (const d of [...scene.time.delayed]) d.fn(); scene.time.delayed.length = 0; };
const button = (label: string) => [...h.buttons].reverse().find((b) => b.label === label);
const progressOf = (scene: Scene) => scene.registry.get(RegistryKeys.Progress) as Progress;

beforeEach(() => {
  for (const m of [h.go, h.transitionIn]) m.mockClear();
  for (const list of [h.buttons, h.cats, h.huds, h.ceremonies, h.backdrops, h.notebooks] as unknown[][]) list.length = 0;
});

describe('Showcase as a runway (F15.4)', () => {
  it('is a notebook page (F20.6): paper plus the drawn stage, and the exits sit clear of the stage', () => {
    const scene = open();
    expect(h.backdrops).toHaveLength(1);
    run(scene);
    h.ceremonies[0]!.finish();
    return Promise.resolve().then(() => {
      const stage = runwayStage(h.backdrops[0]![1] as number, h.backdrops[0]![2] as number);
      for (const b of h.buttons) {
        const c = (b as unknown as { getCenter(): { x: number; y: number } }).getCenter();
        expect(rectsOverlap(stage, { x: c.x - 100, y: c.y - 38, width: 200, height: 76 })).toBe(false);
      }
    });
  });

  it('rates the look and writes the progress and the rating BEFORE the ceremony plays', () => {
    const scene = open();
    const rating = scene.registry.get(RegistryKeys.LastRating) as RatingResult;
    expect(rating.stars).toBeGreaterThanOrEqual(1);
    expect(progressOf(scene).wallet).toBeGreaterThan(catalog.economy.startWallet);
    expect(h.ceremonies).toHaveLength(0);
    run(scene);
    expect(h.ceremonies).toHaveLength(1);
    expect(h.ceremonies[0]!.played).toBe(true);
    expect(h.ceremonies[0]!.plan.stars).toBe(rating.stars);
    expect(h.ceremonies[0]!.targets.judge).toEqual(brand.judge);
  });

  it('the purse shows the old number and each button that lands adds to it; at the end it settles on the real wallet', () => {
    const scene = open();
    const hud = h.huds[0]!;
    run(scene);
    expect(hud.calls.slice(0, 2)).toEqual([`set:${catalog.economy.startWallet}`, 'hold']);
    h.ceremonies[0]!.targets.onCredit(5, 5);
    expect(hud.calls).toContain('adjust:5');
    h.ceremonies[0]!.finish();
    return Promise.resolve().then(() => {
      expect(hud.calls.at(-1)).toBe(`release:${progressOf(scene).wallet}`);
    });
  });

  it('shows the way to skip, and the exit buttons only when the ceremony ends', async () => {
    const scene = open();
    run(scene);
    expect(button('Modo foto')).toBeUndefined();
    expect(scene.getE2EUi().ready).toBe(false);
    h.ceremonies[0]!.finish();
    await vi.waitFor(() => expect(button('Modo foto')).toBeDefined());
    expect(button('Seguir vistiendo')).toBeDefined();
    expect(button('Otro gato')).toBeDefined();
    expect(button('Descargar foto')).toBeUndefined();
    expect(scene.getE2EUi().ready).toBe(true);
    expect(scene.getE2EUi().info.ceremonyStep).toBe('done');
  });

  it('reports the step of the ceremony and the last rating for the e2e hook', () => {
    const scene = open();
    expect(scene.getE2EUi().info.ceremonyStep).toBeNull();
    run(scene);
    h.ceremonies[0]!.targets.onStep({ kind: 'stamp' });
    const info = scene.getE2EUi().info;
    expect(info.ceremonyStep).toBe('stamp');
    expect(info.lastRating).toEqual(scene.registry.get(RegistryKeys.LastRating));
  });

  it('Modo foto goes to the photo mode with the look and the rating, once', async () => {
    const scene = open();
    run(scene);
    h.ceremonies[0]!.finish();
    await vi.waitFor(() => expect(button('Modo foto')).toBeDefined());
    button('Modo foto')!.emit(ObjectEvents.ButtonClick);
    button('Modo foto')!.emit(ObjectEvents.ButtonClick);
    expect(h.go).toHaveBeenCalledTimes(1);
    expect(h.go).toHaveBeenCalledWith(scene, 'photo', {
      look: { catId: catalog.cats[0]!.id, catName: 'Luna', outfit: { sweater: sweater.id } },
      rating: scene.registry.get(RegistryKeys.LastRating),
    });
  });

  it('Seguir vistiendo and Otro gato leave through the flow', async () => {
    const scene = open();
    run(scene);
    h.ceremonies[0]!.finish();
    await vi.waitFor(() => expect(button('Otro gato')).toBeDefined());
    button('Otro gato')!.emit(ObjectEvents.ButtonClick);
    expect(h.go).toHaveBeenCalledWith(scene, 'change');
    h.go.mockClear();
    const again = open();
    run(again);
    h.ceremonies[1]!.finish();
    await vi.waitFor(() => expect(h.buttons.filter((b) => b.label === 'Seguir vistiendo')).toHaveLength(2));
    button('Seguir vistiendo')!.emit(ObjectEvents.ButtonClick);
    expect(h.go).toHaveBeenCalledWith(again, 'keepDressing');
  });

  it('the notebook button opens with the exits (not before), shows the news, and opens the album once (F17.6)', async () => {
    const scene = open();
    run(scene);
    expect(h.notebooks).toHaveLength(0);
    h.ceremonies[0]!.finish();
    await vi.waitFor(() => expect(h.notebooks).toHaveLength(1));
    expect(h.notebooks[0]!.news).toBe(true);
    h.notebooks[0]!.emit(ObjectEvents.NotebookPress);
    h.notebooks[0]!.emit(ObjectEvents.NotebookPress);
    expect(h.go).toHaveBeenCalledTimes(1);
    expect(h.go).toHaveBeenCalledWith(scene, 'album', albumArgs(SceneKeys.Showcase, {}));
    expect(scene.getE2EUi().buttons.album).toEqual({ x: h.notebooks[0]!.x, y: h.notebooks[0]!.y });
  });

  it('the notebook button is also there when coming back from the album, and goes away on shutdown', () => {
    const first = open();
    const back = open({ replay: false }, { [RegistryKeys.Progress]: progressOf(first), [RegistryKeys.LastRating]: first.registry.get(RegistryKeys.LastRating) });
    run(back);
    expect(h.notebooks.length).toBeGreaterThan(0);
    back.events.emit('shutdown');
    expect(h.notebooks.every((n) => n.destroyed)).toBe(true);
  });

  it('coming back from the album (replay false) does not rate again, pay again or replay the ceremony', () => {
    const first = open();
    const rated = first.registry.get(RegistryKeys.LastRating);
    const wallet = progressOf(first).wallet;
    h.ceremonies.length = 0;
    h.buttons.length = 0;
    const back = open({ replay: false }, {
      [RegistryKeys.Progress]: progressOf(first),
      [RegistryKeys.LastRating]: rated,
    });
    run(back);
    expect(h.ceremonies).toHaveLength(0);
    expect(progressOf(back).wallet).toBe(wallet);
    expect(button('Modo foto')).toBeDefined();
    expect(back.getE2EUi().ready).toBe(true);
    expect(h.huds.at(-1)!.calls).toEqual([`set:${wallet}`]);
  });

  it('leaving in the middle of the ceremony cleans everything and keeps the progress that was already written', () => {
    const scene = open();
    run(scene);
    const wallet = progressOf(scene).wallet;
    scene.events.emit('shutdown');
    expect(h.ceremonies[0]!.destroyed).toBe(true);
    expect(h.cats.every((c) => c.destroyed)).toBe(true);
    expect(h.huds.every((x) => x.destroyed)).toBe(true);
    expect(scene.activeTweens).toHaveLength(0);
    expect(progressOf(scene).wallet).toBe(wallet);
  });

  it('init resets the state of a previous visit', () => {
    const scene = open();
    run(scene);
    h.ceremonies[0]!.targets.onStep({ kind: 'coin' });
    scene.init();
    scene.create();
    expect(scene.getE2EUi().info.ceremonyStep).toBeNull();
    expect(scene.getE2EUi().ready).toBe(false);
  });
});
