import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/sceneFake')).phaserSceneMock);

const h = vi.hoisted(() => ({
  go: vi.fn(),
  transitionIn: vi.fn(),
  buttons: [] as { label: string; emit(ev: string): void; destroyed: boolean }[],
  tabs: [] as { selectedId: string | null; emit(ev: string, ...a: unknown[]): void; destroyed: boolean; selected: string[] }[],
  pages: [] as { tab: string; destroyed: boolean; revealed: number; ctx: { hang?: string | null }; info?: () => unknown }[],
  bubbles: [] as { text: string; destroyed: boolean }[],
  covers: [] as { options: { pct: number; setsDone: number; setsTotal: number }; opened: boolean; destroyed: boolean; openUp(cb: () => void): void; finish(): void }[],
  stamps: [] as { pct: number; destroyed: boolean; dismissed: boolean; dismiss(): void; callbacks: { onLand?: () => void; onDone?: () => void } }[],
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
vi.mock('../../src/game/objects/album/Cover', () => ({
  Cover: class {
    opened = false; destroyed = false; shownPct = 0; private done: (() => void) | null = null;
    constructor(_s: unknown, _x: number, _y: number, public options: { pct: number; setsDone: number; setsTotal: number }) { h.covers.push(this as never); }
    setDepth() { return this; }
    setAngle() { return this; }
    setAlpha() { return this; }
    setY() { return this; }
    openUp(cb: () => void) { this.opened = true; this.done = cb; }
    finish() { this.done?.(); }
    destroy() { this.destroyed = true; }
  },
}));
vi.mock('../../src/game/objects/album/MilestoneStamp', () => ({
  MilestoneStamp: class {
    destroyed = false; dismissed = false;
    constructor(_s: unknown, _x: number, _y: number, public pct: number, public callbacks: { onLand?: () => void; onDone?: () => void }) { h.stamps.push(this as never); }
    setDepth() { return this; }
    dismiss() { this.dismissed = true; this.callbacks.onDone?.(); }
    get isGone() { return this.dismissed || this.destroyed; }
    destroy() { this.destroyed = true; }
  },
}));
vi.mock('../../src/game/objects/album/pages', () => ({
  createPage: (_scene: unknown, tab: string, ctx: { hang?: string | null }) => {
    const page = { tab, ctx, destroyed: false, revealed: 0, view: {}, destroy() { page.destroyed = true; }, reveal() { page.revealed++; } };
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
import tags from '../../src/game/data/tags.json';
import type { FakeScene } from './helpers/sceneFake';

const catalog = assertGameData({ cats, clothes, combos, economy, dyes, sets, photo, brand, tags });

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
/** Lets the intro pass: the timers fire and the cover is lifted away. */
const run = (scene: FakeScene) => {
  for (const d of [...scene.time.delayed]) d.fn();
  for (const c of h.covers) c.finish();
};

beforeEach(() => {
  h.go.mockClear();
  h.transitionIn.mockClear();
  for (const list of [h.buttons, h.tabs, h.pages, h.bubbles, h.covers, h.stamps]) list.length = 0;
});

describe('Album scene (F17.2)', () => {
  it('opens on the first tab with its page, or on the tab it was asked for', () => {
    open();
    expect(h.pages.map((p) => p.tab)).toEqual(['prendas']);
    h.pages.length = 0;
    open({ from: 'DressUp', tab: 'tintes' });
    expect(h.pages.map((p) => p.tab)).toEqual(['tintes']);
  });

  it('opens on the hanger when asked, handing the page the cat that was just hung', () => {
    const album = open({ from: 'DressUp', tab: 'colgador', hang: 'gato-01' });
    expect(h.pages.map((p) => p.tab)).toEqual(['colgador']);
    expect(h.pages[0]!.ctx.hang).toBe('gato-01');
    expect(album.getE2EUi().info.hang).toBe('gato-01');
  });

  it('tells the page to reveal itself only once the cover is up (the keychain flies when you can see it)', () => {
    const album = open({ from: 'DressUp', tab: 'colgador', hang: 'gato-01' });
    expect(h.pages[0]!.revealed).toBe(0);
    run(album);
    expect(h.pages[0]!.revealed).toBe(1);
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

  describe('the cover, the percentage and the milestones (F17.5)', () => {
    const progressOf = (extra: Partial<ReturnType<typeof emptyProgress>>) => ({ ...emptyProgress(0), ...extra });
    const withProgress = (progress: ReturnType<typeof emptyProgress>, data?: unknown) => {
      const album = new Album() as unknown as FakeScene & { init(d?: unknown): void; create(): void; getE2EUi(): { ready: boolean; info: Record<string, unknown> } };
      album.registry.set(RegistryKeys.Catalog, catalog);
      album.registry.set(RegistryKeys.Progress, progress);
      album.init(data);
      album.create();
      return album;
    };
    /** The opening of the book is a tween: it is over when its callback has run. */
    const openBook = (album: FakeScene) => { for (const r of album.tweens.records) (r.config.onComplete as (() => void) | undefined)?.(); };
    const seenNow = (album: FakeScene) => (album.registry.get(RegistryKeys.Progress) as ReturnType<typeof emptyProgress>).albumSeen;
    const everything = () => progressOf({
      owned: catalog.clothes.filter((c) => !c.starter && !c.secret).map((c) => c.id),
      dyesOwned: catalog.dyes.map((d) => d.id),
      secrets: catalog.combos.map((c) => c.id),
      tastesFound: Object.fromEntries(catalog.cats.map((c) => [c.id, ['favorite', 'color', ...(c.prefs?.loves ?? []).map((t) => `love:${t}`), ...(c.prefs?.dislikes ?? []).map((t) => `dislike:${t}`)]])),
    });

    it('shows the cover with the percentage and the sets, and the book is not ready until it opens', () => {
      const album = withProgress(progressOf({ dyesOwned: ['cielo'] }));
      expect(h.covers).toHaveLength(1);
      expect(h.covers[0]!.options).toMatchObject({ setsDone: 0, setsTotal: 7 });
      expect(h.covers[0]!.options.pct).toBe((album.getE2EUi().info.pct as number));
      expect(album.getE2EUi().ready).toBe(false);
      expect(album.getE2EUi().info.cover).toBe(true);
      run(album);
      expect(album.getE2EUi().info.cover).toBe(false);
      openBook(album);
      expect(album.getE2EUi().ready).toBe(true);
    });

    it('reports ready only once the book has finished opening: while it unfolds (scaleX from 0) every tab sits on the same point (bug: getTabPositions)', () => {
      const album = withProgress(emptyProgress(0));
      run(album);
      expect(album.getE2EUi().info.cover).toBe(false);
      expect(album.getE2EUi().ready).toBe(false);
      openBook(album);
      expect(album.getE2EUi().ready).toBe(true);
    });

    it('a tap on the cover opens it at once, and only once', () => {
      const album = withProgress(emptyProgress(0));
      album.input.emit('pointerdown', { x: 600, y: 300 });
      album.input.emit('pointerup', { x: 600, y: 300 });
      expect(h.covers[0]!.opened).toBe(true);
      run(album);
      expect(h.covers).toHaveLength(1);
      openBook(album);
      expect(album.getE2EUi().ready).toBe(true);
    });

    it('marks as seen what the page showed when the player turns away, and the new entries keep their sparkle meanwhile', () => {
      const album = withProgress(progressOf({ dyesOwned: ['cielo'] }), { tab: 'tintes' });
      run(album);
      expect(seenNow(album)).toEqual([]);
      button('‹').emit(ObjectEvents.ButtonClick);
      expect(seenNow(album)).toContain('dye:cielo');
      expect(seenNow(album).every((id) => id.startsWith('dye:'))).toBe(true);
    });

    it('marks the page it was on when it closes, but not when it was left over the cover', () => {
      const first = withProgress(progressOf({ owned: [catalog.clothes.find((c) => !c.starter && !c.secret)!.id] }));
      run(first);
      first.events.emit('shutdown');
      expect(seenNow(first).some((id) => id.startsWith('item:'))).toBe(true);
      const second = withProgress(progressOf({ owned: [catalog.clothes.find((c) => !c.starter && !c.secret)!.id] }));
      second.events.emit('shutdown');
      expect(seenNow(second)).toEqual([]);
    });

    it('stamps each milestone reached, one after another, and writes them down so they are not repeated', () => {
      const album = withProgress(everything());
      expect(h.stamps).toHaveLength(0);
      run(album);
      expect(h.stamps.map((s) => s.pct)).toEqual([25]);
      expect(seenNow(album)).toEqual(expect.arrayContaining(['milestone:25', 'milestone:50', 'milestone:75']));
      h.stamps[0]!.callbacks.onLand?.();
      expect(album.played).toEqual(expect.arrayContaining(['sfx-stamp']));
      h.stamps[0]!.dismiss();
      for (const d of [...album.time.delayed]) d.fn();
      expect(h.stamps.map((s) => s.pct)).toEqual([25, 50]);
      expect(album.getE2EUi().info.stamp).toBe(50);
    });

    it('does not stamp what was celebrated before', () => {
      const album = withProgress({ ...everything(), albumSeen: ['milestone:25', 'milestone:50', 'milestone:75', 'milestone:100'] });
      run(album);
      expect(h.stamps).toHaveLength(0);
    });

    it('a tap while a stamp is on sends it off', () => {
      const album = withProgress(everything());
      run(album);
      album.input.emit('pointerdown', { x: 600, y: 300 });
      album.input.emit('pointerup', { x: 600, y: 300 });
      expect(h.stamps[0]!.dismissed).toBe(true);
    });

    it('cleans the stamp and the cover on shutdown', () => {
      const album = withProgress(everything());
      album.events.emit('shutdown');
      expect(h.covers.every((c) => c.destroyed)).toBe(true);
      const second = withProgress(everything());
      run(second);
      second.events.emit('shutdown');
      expect(h.stamps.every((s) => s.destroyed)).toBe(true);
    });
  });
});
