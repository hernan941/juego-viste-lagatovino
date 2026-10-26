import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { ObjectEvents } from '../../src/game/constants';
import { TAB_RISE } from '../../src/game/systems/kit';
import { Tabs, type TabDef } from '../../src/game/objects/Tabs';
import { makeFakeScene } from './helpers/kitScene';

const defs: TabDef[] = [
  { id: 'a', label: 'A', icon: 'i-a', color: 'cielo' },
  { id: 'b', label: 'B', icon: 'i-b', color: 'rosa' },
  { id: 'c', label: 'C', icon: 'i-c' },
];

type FakeTab = { emit(ev: string, ...a: unknown[]): void; interactive: { hitArea: { width: number; height: number } }; list: { y: number }[] };

function make(reduced = false) {
  const scene = makeFakeScene(reduced);
  const tabs = new Tabs(scene as never, 0, 0, defs, { style: 'index' });
  const items = (tabs as unknown as { list: unknown[] }).list.slice(0, 3) as FakeTab[];
  return { scene, tabs, items };
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('Tabs index style (F12.2)', () => {
  it('every tab has a touch area of at least 80', () => {
    const { items } = make();
    for (const t of items) {
      expect(t.interactive.hitArea.width).toBeGreaterThanOrEqual(80);
      expect(t.interactive.hitArea.height).toBeGreaterThanOrEqual(80);
    }
  });

  it('the selected tab rises TAB_RISE px, with Back.easeOut', () => {
    const { scene, tabs } = make();
    const picks = vi.fn();
    tabs.on(ObjectEvents.TabSelect, picks);
    tabs.select('b');
    expect(picks).toHaveBeenCalledWith('b');
    const rise = scene.tweens.records.filter((r) => r.config.y === -TAB_RISE);
    expect(rise).toHaveLength(1);
    expect(rise[0]!.config.ease).toBe('Back.easeOut');
  });

  it('the previous tab sinks back when another is selected', () => {
    const { scene, tabs } = make();
    tabs.select('a', true);
    tabs.select('b');
    expect(scene.tweens.records.some((r) => r.config.y === 0)).toBe(true);
  });

  it('hover rotates 1 degree, but not with reduced motion', () => {
    const normal = make();
    normal.items[0]!.emit('pointerover', { wasTouch: false });
    expect(normal.scene.tweens.records.some((r) => r.config.angle === 1)).toBe(true);
    const reduced = make(true);
    reduced.items[0]!.emit('pointerover', { wasTouch: false });
    expect(reduced.scene.tweens.records.some((r) => r.config.angle === 1)).toBe(false);
  });

  it('selects silently at its rest position without a tween when asked', () => {
    const { scene, tabs } = make();
    tabs.select('c', true);
    expect(scene.tweens.records.filter((r) => r.config.y === -TAB_RISE)).toHaveLength(0);
    expect(tabs.selectedId).toBe('c');
  });
});
