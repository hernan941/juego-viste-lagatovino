import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/sceneFake')).phaserSceneMock);

const h = vi.hoisted(() => ({
  go: vi.fn(),
  transitionIn: vi.fn(),
  buttons: [] as { label: string; emit(ev: string): void; destroyed: boolean }[],
  tabs: [] as { selectedId: string | null; emit(ev: string, ...a: unknown[]): void; destroyed: boolean; selected: string[] }[],
  pages: [] as { tab: string; destroyed: boolean; info?: () => unknown }[],
  bubbles: [] as { text: string; destroyed: boolean }[],
}));

vi.mock('../../src/game/systems/navigate', () => ({ go: (...a: unknown[]) => h.go(...a) }));
vi.mock('../../src/game/systems/transitions', () => ({
  enterKind: (d: { transition?: string } | undefined) => d?.transition ?? null,
  transitionIn: (...a: unknown[]) => h.transitionIn(...a),
}));
vi.mock('../../src/game/plugins/AudioPlugin', () => ({ getAudio: (s: { plugins: { get(k: string): unknown } }) => s.plugins.get('audio') }));

vi.mock('../../src/game/objects/Button', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    Button: class extends Emitter {
      destroyed = false; depth = 0; x: number; y: number;
      constructor(_s: unknown, x: number, y: number, public label: string) { super(); this.x = x; this.y = y; h.buttons.push(this as never); }
      setDepth(d: number) { this.depth = d; return this; }
      setAlpha() { return this; }
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
vi.mock('../../src/game/objects/album/AlbumTabs', async () => {
  const { Emitter } = await import('./helpers/sceneFake');
  return {
    AlbumTabs: class extends Emitter {
      selectedId: string | null = null; destroyed = false; selected: string[] = [];
      constructor() { super(); h.tabs.push(this as never); }
      select(id: string, silent = false) { this.selectedId = id; this.selected.push(`${id}${silent ? ':silent' : ''}`); }
      setDepth() { return this; }
      getTabPositions() { return { prendas: { x: 1, y: 2 } }; }
      destroy() { this.destroyed = true; }
    },
  };
});
vi.mock('../../src/game/objects/album/pages', () => ({
  createPage: (_scene: unknown, tab: string) => {
    const page = { tab, destroyed: false, view: {}, destroy() { page.destroyed = true; } };
    h.pages.push(page);
    return page;
  },
}));

import { Album } from '../../src/game/scenes/Album';
import { ObjectEvents, RegistryKeys } from '../../src/game/constants';
import { emptyProgress } from '../../src/game/domain/progress';
import { assertGameData } from '../../src/game/data/schema';
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

function open(data?: unknown) {
  const album = new Album() as unknown as FakeScene & {
    init(d?: unknown): void; create(): void; getE2EUi(): { ready: boolean; buttons: Record<string, unknown>; points: Record<string, unknown>; info: Record<string, unknown> };
  };
  album.registry.set(RegistryKeys.Catalog, catalog);
  album.registry.set(RegistryKeys.Progress, emptyProgress(0));
  album.init(data);
  album.create();
  return album;
}
const button = (label: string) => h.buttons.find((b) => b.label === label)!;
const run = (scene: FakeScene) => { for (const d of [...scene.time.delayed]) d.fn(); };

beforeEach(() => {
  h.go.mockClear();
  h.transitionIn.mockClear();
  for (const list of [h.buttons, h.tabs, h.pages, h.bubbles]) list.length = 0;
});

describe('Album scene (F17.2)', () => {
  it('opens on the first tab with its page, or on the tab it was asked for', () => {
    open();
    expect(h.pages.map((p) => p.tab)).toEqual(['prendas']);
    h.pages.length = 0;
    open({ from: 'DressUp', tab: 'tintes' });
    expect(h.pages.map((p) => p.tab)).toEqual(['tintes']);
  });

  it('opens the hanger tab on a disabled tab as the first one, never on the hanger (F19.5 turns it on)', () => {
    const album = open({ from: 'DressUp', tab: 'colgador', hang: 'gato-01' });
    expect(h.pages.map((p) => p.tab)).toEqual(['prendas']);
    expect(album.getE2EUi().info.hang).toBe('gato-01');
  });

  it('enters with the transition it was started with', () => {
    open({ transition: 'star' });
    expect(h.transitionIn).toHaveBeenCalledWith(expect.anything(), 'star', expect.anything());
  });

  it('Volver goes back with the origin it came from and its state, once', () => {
    const origin = { from: 'DressUp', fromData: { tab: 'sweaters', scroll: 240 } };
    const album = open(origin);
    button('Volver').emit(ObjectEvents.ButtonClick);
    button('Volver').emit(ObjectEvents.ButtonClick);
    expect(h.go).toHaveBeenCalledTimes(1);
    expect(h.go).toHaveBeenCalledWith(album, 'back', origin);
  });

  it('turns the page with the arrows, flipping the old page out and the new one in', () => {
    const album = open();
    run(album);
    button('›').emit(ObjectEvents.ButtonClick);
    expect(album.activeTweens.some((t) => t.config.scaleX === 0)).toBe(true);
    // the flip is half done: the old page goes away and the new one comes
    for (const t of album.tweens.records) (t.config.onComplete as (() => void) | undefined)?.();
    expect(h.pages.map((p) => p.tab)).toEqual(['prendas', 'gatos']);
    expect(h.pages[0]!.destroyed).toBe(true);
    expect(h.tabs[0]!.selectedId).toBe('gatos');
    expect(album.played).toContain('sfx-paper');
  });

  it('does not turn past the first page, nor while a turn is going', () => {
    const album = open();
    run(album);
    button('‹').emit(ObjectEvents.ButtonClick);
    expect(h.pages).toHaveLength(1);
    button('›').emit(ObjectEvents.ButtonClick);
    button('›').emit(ObjectEvents.ButtonClick);
    for (const t of album.tweens.records) (t.config.onComplete as (() => void) | undefined)?.();
    expect(h.pages.map((p) => p.tab)).toEqual(['prendas', 'gatos']);
  });

  it('a horizontal drag turns the page, a tap does not', () => {
    const album = open();
    run(album);
    album.input.emit('pointerdown', { x: 600, y: 300 });
    album.input.emit('pointerup', { x: 598, y: 302 });
    expect(h.pages).toHaveLength(1);
    album.input.emit('pointerdown', { x: 900, y: 300 });
    album.input.emit('pointerup', { x: 700, y: 310 });
    for (const t of album.tweens.records) (t.config.onComplete as (() => void) | undefined)?.();
    expect(h.pages.map((p) => p.tab)).toEqual(['prendas', 'gatos']);
  });

  it('picking a tab jumps to its page; the locked hanger shows a bubble instead and the bubble goes away', () => {
    const album = open();
    run(album);
    h.tabs[0]!.emit(ObjectEvents.TabSelect, 'looks');
    for (const t of album.tweens.records) (t.config.onComplete as (() => void) | undefined)?.();
    expect(h.pages.map((p) => p.tab)).toEqual(['prendas', 'looks']);
    h.tabs[0]!.emit(ObjectEvents.TabLocked, 'colgador');
    expect(h.bubbles).toHaveLength(1);
    expect(h.bubbles[0]!.text).toMatch(/colgador/i);
    run(album);
    expect(h.bubbles[0]!.destroyed).toBe(true);
  });

  it('init resets the state of a previous visit', () => {
    const album = open({ from: 'Showcase', tab: 'tintes' });
    run(album);
    button('Volver').emit(ObjectEvents.ButtonClick);
    album.init({ from: 'Title' });
    album.create();
    expect(album.getE2EUi().info).toMatchObject({ tab: 'prendas', from: 'Title', turns: 0 });
    expect(album.getE2EUi().ready).toBe(false);
  });

  it('adds what the page shows to the e2e info, when the page can say it', () => {
    const album = open();
    expect(album.getE2EUi().info.page).toBeNull();
    h.pages[0]!.info = () => ({ shown: [{ id: 'a', state: 'got' }] });
    expect(album.getE2EUi().info.page).toEqual({ shown: [{ id: 'a', state: 'got' }] });
  });

  it('reports the percent and the tally of the page for the e2e hook', () => {
    const album = open();
    const info = album.getE2EUi().info;
    expect(info.total).toBe(138);
    expect(typeof info.pct).toBe('number');
    expect(info.tabs).toEqual(['prendas', 'gatos', 'looks', 'tintes', 'colgador']);
    expect(Object.keys(album.getE2EUi().buttons)).toEqual(expect.arrayContaining(['back', 'prev', 'next']));
  });

  it('cleans everything on shutdown: objects, tweens, input listeners and timers', () => {
    const album = open();
    expect(album.input.count('pointerdown')).toBe(1);
    expect(album.input.keyboard.count('keydown-LEFT')).toBe(1);
    album.events.emit('shutdown');
    expect(h.buttons.every((b) => b.destroyed)).toBe(true);
    expect(h.tabs.every((t) => t.destroyed)).toBe(true);
    expect(h.pages.every((p) => p.destroyed)).toBe(true);
    expect(album.activeTweens).toHaveLength(0);
    expect(album.input.count('pointerdown')).toBe(0);
    expect(album.input.count('pointerup')).toBe(0);
    expect(album.input.keyboard.count('keydown-LEFT')).toBe(0);
    expect(album.time.delayed).toHaveLength(0);
  });
});
