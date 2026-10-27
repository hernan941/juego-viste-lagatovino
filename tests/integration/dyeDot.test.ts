import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { ObjectEvents } from '../../src/game/constants';
import type { ClothingDef } from '../../src/game/domain/types';
import { DyeDot } from '../../src/game/objects/DyeDot';
import { LayersPanel } from '../../src/game/objects/LayersPanel';
import { makeFakeScene } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('DyeDot (F16.4)', () => {
  it('starts hidden and without a color', () => {
    const dot = new DyeDot(makeFakeScene() as never, 0, 0, 10);
    expect(dot.hex).toBeNull();
    expect(dot.alpha).toBe(0);
  });

  it('a color pops in with a tween, never all at once', () => {
    const scene = makeFakeScene();
    const dot = new DyeDot(scene as never, 0, 0, 10);
    dot.setDye('#F6BFD0');
    expect(dot.hex).toBe('#F6BFD0');
    expect(dot.alpha).toBe(1);
    expect(scene.activeTweens().length).toBeGreaterThan(0);
  });

  it('with reduced motion it just appears, with no tween', () => {
    const scene = makeFakeScene(true);
    const dot = new DyeDot(scene as never, 0, 0, 10);
    dot.setDye('#F6BFD0');
    expect(dot.alpha).toBe(1);
    expect(scene.activeTweens()).toHaveLength(0);
  });

  it('the same color again does nothing, and null hides it', () => {
    const scene = makeFakeScene();
    const dot = new DyeDot(scene as never, 0, 0, 10);
    dot.setDye('#F6BFD0');
    const n = scene.tweens.records.length;
    dot.setDye('#F6BFD0');
    expect(scene.tweens.records.length).toBe(n);
    dot.setDye(null);
    expect(dot.hex).toBeNull();
    expect(dot.alpha).toBe(0);
  });
});

const item = (id: string): ClothingDef => ({ id, name: id, slot: 'sweater', category: 'sweater', texture: id, icon: 'i', tags: [] }) as never;

describe('LayersPanel.addRowDecorator (F16.4)', () => {
  function panel() {
    const scene = makeFakeScene() as ReturnType<typeof makeFakeScene> & { add: Record<string, unknown> };
    scene.add.existing = (o: unknown) => o;
    return { scene, panel: new LayersPanel(scene as never, 0, 0) };
  }

  it('runs on the rows that appear later and on the ones already there', () => {
    const { panel: p } = panel();
    const seen: string[] = [];
    p.setLayers([item('a')]);
    p.addRowDecorator((_row, it) => seen.push(it.id));
    p.setLayers([item('a'), item('b')]);
    expect(seen).toEqual(['a', 'b']);
  });

  it('the remover stops it for the new rows', () => {
    const { panel: p } = panel();
    const seen: string[] = [];
    const remove = p.addRowDecorator((_row, it) => seen.push(it.id));
    remove();
    p.setLayers([item('a')]);
    expect(seen).toEqual([]);
  });

  it('keeps the LayerRemove event working', () => {
    const { panel: p } = panel();
    expect(ObjectEvents.LayerRemove).toBeDefined();
    expect(() => p.setLayers([item('a')])).not.toThrow();
  });
});
