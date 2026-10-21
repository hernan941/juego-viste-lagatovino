import { describe, expect, it } from 'vitest';
import { SceneKeys } from '../../src/game/constants';
import { FLOW_ACTIONS, nextStep, type FlowAction } from '../../src/game/domain/flow';

describe('scene flow (ADR 0007)', () => {
  it('goes from start to admire without skipping steps', () => {
    const path: [string, FlowAction, string][] = [
      [SceneKeys.Boot, 'boot', SceneKeys.Preloader],
      [SceneKeys.Preloader, 'loaded', SceneKeys.Title],
      [SceneKeys.Title, 'start', SceneKeys.CatSelect],
      [SceneKeys.CatSelect, 'choose', SceneKeys.ShopEntrance],
      [SceneKeys.ShopEntrance, 'enter', SceneKeys.DressUp],
      [SceneKeys.DressUp, 'finish', SceneKeys.Showcase],
    ];
    for (const [from, action, to] of path) expect(nextStep(from, action)?.scene).toBe(to);
  });

  it('lets the player go back to dress or change cat', () => {
    expect(nextStep(SceneKeys.Showcase, 'keepDressing')?.scene).toBe(SceneKeys.DressUp);
    expect(nextStep(SceneKeys.Showcase, 'change')?.scene).toBe(SceneKeys.CatSelect);
    expect(nextStep(SceneKeys.DressUp, 'change')?.scene).toBe(SceneKeys.CatSelect);
  });

  it('rejects an action that does not belong to the scene', () => {
    expect(nextStep(SceneKeys.Title, 'finish')).toBeNull();
    expect(nextStep(SceneKeys.CatSelect, 'enter')).toBeNull();
    expect(nextStep('Nope', 'start')).toBeNull();
  });

  it('never changes scene without a transition, and the iris ones use a heart or a paw', () => {
    for (const scene of Object.values(SceneKeys)) {
      for (const action of FLOW_ACTIONS) {
        const step = nextStep(scene, action);
        if (!step) continue;
        expect(['fade', 'iris', 'heart', 'paw']).toContain(step.transition);
      }
    }
    expect(nextStep(SceneKeys.Title, 'start')?.transition).toBe('paw');
    expect(nextStep(SceneKeys.DressUp, 'finish')?.transition).toBe('heart');
  });

  it('every scene but the last ones has a way out and every scene is reachable', () => {
    const reachable = new Set<string>([SceneKeys.Boot]);
    for (let i = 0; i < 10; i++) {
      for (const from of [...reachable]) for (const a of FLOW_ACTIONS) {
        const step = nextStep(from, a);
        if (step) reachable.add(step.scene);
      }
    }
    expect([...reachable].sort()).toEqual(Object.values(SceneKeys).sort());
  });
});
