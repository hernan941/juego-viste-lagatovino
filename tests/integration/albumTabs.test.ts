import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { ObjectEvents } from '../../src/game/constants';
import { ALBUM_TABS } from '../../src/game/domain/albumPages';
import { AlbumTabs } from '../../src/game/objects/album/AlbumTabs';
import { TAB_RISE } from '../../src/game/systems/kit';
import { makeFakeScene } from './helpers/kitScene';

type FakeTab = { emit(ev: string, ...a: unknown[]): void; interactive: { hitArea: { width: number; height: number } }; alpha: number };

function make(reduced = false) {
  const scene = makeFakeScene(reduced);
  const tabs = new AlbumTabs(scene as never, 640, 0, ALBUM_TABS);
  const items = (tabs as unknown as { list: unknown[] }).list as FakeTab[];
  return { scene, tabs, items };
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('AlbumTabs (F17.2)', () => {
  it('has one tab per definition, each with a touch area of at least 80', () => {
    const { items } = make();
    expect(items).toHaveLength(5);
    for (const t of items) {
      expect(t.interactive.hitArea.width).toBeGreaterThanOrEqual(80);
      expect(t.interactive.hitArea.height).toBeGreaterThanOrEqual(80);
    }
  });

  it('picking an enabled tab selects it, rises it TAB_RISE px and says its id', () => {
    const { scene, tabs, items } = make();
    const picks = vi.fn();
    tabs.on(ObjectEvents.TabSelect, picks);
    items[1]!.emit('pointerdown');
    expect(picks).toHaveBeenCalledWith('gatos');
    expect(tabs.selectedId).toBe('gatos');
    expect(scene.tweens.records.some((r) => r.config.y === -TAB_RISE && r.config.ease === 'Back.easeOut')).toBe(true);
  });

  it('a disabled tab never gets selected: it only says it is locked, and looks faded', () => {
    const { tabs, items } = make();
    const picks = vi.fn();
    const locked = vi.fn();
    tabs.select('prendas', true);
    tabs.on(ObjectEvents.TabSelect, picks);
    tabs.on(ObjectEvents.TabLocked, locked);
    items[4]!.emit('pointerdown');
    expect(locked).toHaveBeenCalledWith('colgador');
    expect(picks).not.toHaveBeenCalled();
    expect(tabs.selectedId).toBe('prendas');
    expect(items[4]!.alpha).toBeLessThan(1);
  });

  it('selecting silently puts the tab at its place without a tween', () => {
    const { scene, tabs } = make();
    tabs.select('looks', true);
    expect(scene.tweens.records.filter((r) => r.config.y === -TAB_RISE)).toHaveLength(0);
    expect(tabs.selectedId).toBe('looks');
  });

  it('reports the center of each tab, and leaves no tween when destroyed', () => {
    const { scene, tabs } = make();
    expect(Object.keys(tabs.getTabPositions())).toEqual(ALBUM_TABS.map((t) => t.id));
    tabs.select('tintes');
    tabs.destroy();
    expect(scene.activeTweens()).toHaveLength(0);
  });
});
