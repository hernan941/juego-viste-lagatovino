import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Scene: class {}, GameObjects: { Container: class {} }, Plugins: { BasePlugin: class {} } } }));

import { DressUp } from '../../src/game/scenes/DressUp';
import { RegistryKeys } from '../../src/game/constants';

type Leaky = { leaveData: Record<string, unknown>; init(data?: unknown): void };

/** A DressUp with just what init() reads. */
function sceneWith(cat: string): Leaky {
  const scene = Object.create(DressUp.prototype) as Leaky;
  const store = new Map<string, unknown>([
    [RegistryKeys.Catalog, { cats: [{ id: cat, name: cat }], clothes: [], combos: [] }],
    [RegistryKeys.Anchors, {}],
    [RegistryKeys.CatId, cat],
  ]);
  Object.assign(scene, { registry: { get: (k: string) => store.get(k) }, leaveData: {} });
  return scene;
}

describe('DressUp.init', () => {
  it('forgets what a controller wrote for the previous visit (leaveData)', () => {
    const scene = sceneWith('luna');
    scene.init();
    scene.leaveData.gifted = ['x'];
    scene.init();
    expect(scene.leaveData).toEqual({});
  });
});
