import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => {
  const base = (await import('./helpers/sceneFake')).phaserSceneMock;
  class Vector2 { constructor(public x = 0, public y = 0) {} }
  return { default: { ...base.default, Math: { Between: () => 0, Vector2 } } };
});

const h = vi.hoisted(() => ({
  go: vi.fn(),
  invite: vi.fn(),
  buttons: [] as { x: number; y: number; label: string; options: { pill?: string }; emit(ev: string): void; destroyed: boolean }[],
}));

vi.mock('../../src/game/systems/navigate', () => ({ go: (...a: unknown[]) => h.go(...a) }));
vi.mock('../../src/game/systems/touchEnv', () => ({ inviteFullscreen: (...a: unknown[]) => h.invite(...a) }));
vi.mock('../../src/game/systems/transitions', () => ({ enterKind: () => null, transitionIn: () => {} }));
vi.mock('../../src/game/systems/motion', () => ({
  profileOf: () => ({ reduced: false, loops: false, squash: 1, shake: 0, ease: (e: string) => e, every: (ms: number) => ms }),
}));
vi.mock('../../src/game/plugins/AudioPlugin', () => ({ getAudio: (s: { plugins: { get(k: string): unknown } }) => s.plugins.get('audio') }));
vi.mock('../../src/game/objects/kit/PaperBackground', () => ({ PaperBackground: class { setDepth() { return this; } } }));
vi.mock('../../src/game/objects/streetInk', () => ({ addInkSun: () => ({ setDepth() {} }), addInkClouds: () => [] }));
vi.mock('../../src/game/objects/Cat', () => ({
  Cat: class { setDepth() { return this; } react() {} squash() {} wiggle() {} destroy() {} },
}));
vi.mock('../../src/game/objects/Button', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    Button: class extends Emitter {
      destroyed = false; input = { enabled: true };
      constructor(_s: unknown, public x: number, public y: number, public label: string, public options: { pill?: string }) { super(); h.buttons.push(this as never); }
      setDepth() { return this; }
      setScale() { return this; }
      getCenter() { return { x: this.x, y: this.y }; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/MuteButton', () => ({ MuteButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));
vi.mock('../../src/game/objects/MotionButton', () => ({ MotionButton: class { setDepth() { return this; } getCenter() { return { x: 0, y: 0 }; } destroy() {} } }));

import { Title } from '../../src/game/scenes/Title';
import { ObjectEvents, RegistryKeys, SceneKeys, TextureKeys } from '../../src/game/constants';
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

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand, tags });
/** Items that are not free: owning them is progress. */
const [bought, bought2] = catalog.clothes.filter((c) => !c.starter && !c.secret).map((c) => c.id);

type Scene = FakeScene & {
  init(d?: unknown): void; create(): void;
  getE2EUi(): { ready: boolean; buttons: Record<string, { x: number; y: number }> };
};

function open(owned: string[] = []) {
  const scene = new Title() as unknown as Scene;
  Object.assign(scene, { cameras: { main: { setBackgroundColor() {} } } });
  scene.add.zone = () => ({ setDepth() { return this; }, setInteractive() { return this; }, on() {}, destroy() {} });
  scene.registry.set(RegistryKeys.Catalog, catalog);
  scene.registry.set(RegistryKeys.Anchors, anchors);
  scene.registry.set(RegistryKeys.Progress, { ...emptyProgress(0), owned });
  scene.init();
  scene.create();
  return scene;
}
/** Fires the pending timers and finishes every tween (the fake scene has no clock). */
const finished = new WeakSet<object>();
const run = (scene: FakeScene) => {
  for (const d of [...scene.time.delayed]) d.fn();
  scene.time.delayed.length = 0;
  for (const t of scene.tweens.records) {
    if (finished.has(t)) continue;
    finished.add(t);
    (t.config.onComplete as (() => void) | undefined)?.();
  }
};
const button = (label: string) => h.buttons.find((b) => b.label === label);

beforeEach(() => { h.invite.mockClear(); h.go.mockClear(); h.buttons.length = 0; });

describe('Title with "Mi álbum" (F20.3)', () => {
  it('has no album button in a new game: only "Iniciar", as a primary pill', () => {
    const scene = open();
    expect(h.buttons.map((b) => b.label)).toEqual(['Iniciar']);
    expect(h.buttons[0]!.options.pill).toBe('primary');
    expect(scene.getE2EUi().buttons.album).toBeUndefined();
  });

  it('shows a secondary "Mi álbum · N%" pill once there is progress, and reports it to the e2e hook', () => {
    const scene = open([bought!, bought2!]);
    const album = h.buttons.find((b) => b.label.startsWith('Mi álbum'))!;
    expect(album.label).toMatch(/^Mi álbum · \d+%$/);
    expect(album.options.pill).toBe('secondary');
    expect(scene.getE2EUi().buttons.album).toEqual({ x: album.x, y: album.y });
    expect(scene.getE2EUi().buttons.start).toBeDefined();
  });

  it('puts a sparkle on the album button while there is something new inside (like the notebook stamp)', () => {
    const scene = open([bought!]);
    const sparks = () => scene.made.filter((o) => o.kind === 'image' && (o.args as unknown[])[2] === TextureKeys.InkSparkle);
    expect(sparks()).toHaveLength(1);
  });

  it('opens the album remembering the Title as the origin, and does it once', () => {
    const scene = open([bought!]);
    run(scene);
    const album = h.buttons.find((b) => b.label.startsWith('Mi álbum'))!;
    album.emit(ObjectEvents.ButtonClick);
    run(scene);
    album.emit(ObjectEvents.ButtonClick);
    run(scene);
    expect(h.go).toHaveBeenCalledTimes(1);
    expect(h.go.mock.calls[0]!.slice(1)).toEqual(['album', { from: SceneKeys.Title, fromData: {} }]);
  });

  it('"Iniciar" invites the page to fullscreen inside the click, once', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {});
    try {
      const scene = open();
      run(scene);
      button('Iniciar')!.emit(ObjectEvents.ButtonClick);
      button('Iniciar')!.emit(ObjectEvents.ButtonClick);
      expect(h.invite).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('"Iniciar" still goes to CatSelect', () => {
    const scene = open([bought!]);
    run(scene);
    button('Iniciar')!.emit(ObjectEvents.ButtonClick);
    run(scene);
    expect(h.go.mock.calls[0]!.slice(1)).toEqual(['start']);
  });

  it('destroys the buttons on shutdown', () => {
    const scene = open([bought!]);
    scene.events.emit('shutdown');
    expect(h.buttons.every((b) => b.destroyed)).toBe(true);
  });
});
