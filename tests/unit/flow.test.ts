import { describe, expect, it } from 'vitest';
import { SceneKeys } from '../../src/game/constants';
import { FLOW_ACTIONS, TRANSITION_KINDS, albumArgs, backStep, hangArgs, nextStep, type FlowAction } from '../../src/game/domain/flow';

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
        expect(TRANSITION_KINDS).toContain(step.transition);
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
    const expected = Object.values(SceneKeys);
    expect([...reachable].sort()).toEqual(expected.sort());
  });
});

describe('scene flow v2 (ADR 0019)', () => {
  it('opens the album from Title, DressUp and Showcase with the star iris', () => {
    for (const from of [SceneKeys.Title, SceneKeys.DressUp, SceneKeys.Showcase]) {
      expect(nextStep(from, 'album')).toEqual({ scene: SceneKeys.Album, transition: 'star' });
    }
    expect(nextStep(SceneKeys.CatSelect, 'album')).toBeNull();
  });

  it('goes from the Showcase to the photo mode with a flash, and from there back to dressing with a heart', () => {
    expect(nextStep(SceneKeys.Showcase, 'photo')).toEqual({ scene: SceneKeys.PhotoMode, transition: 'flash' });
    expect(nextStep(SceneKeys.PhotoMode, 'keepDressing')).toEqual({ scene: SceneKeys.DressUp, transition: 'heart' });
    expect(nextStep(SceneKeys.PhotoMode, 'hang')).toEqual({ scene: SceneKeys.Album, transition: 'star' });
    expect(nextStep(SceneKeys.DressUp, 'photo')).toBeNull();
  });

  it('knows the new transition kinds', () => {
    expect(TRANSITION_KINDS).toContain('star');
    expect(TRANSITION_KINDS).toContain('flash');
  });
});

describe('backStep', () => {
  it('returns to the allowed origin with a fade and gives its state back', () => {
    const step = backStep({ from: SceneKeys.DressUp, fromData: { tab: 'sweaters', scroll: 240 } });
    expect(step).toMatchObject({ scene: SceneKeys.DressUp, transition: 'fade', data: { tab: 'sweaters', scroll: 240 } });
  });

  it('does not replay the ceremony when going back to the Showcase', () => {
    expect(backStep({ from: SceneKeys.Showcase }).data).toEqual({ replay: false });
  });

  it('goes to Title when the origin is missing or not allowed', () => {
    for (const bad of [undefined, null, {}, { from: 'Nope' }, { from: SceneKeys.Album }, { from: SceneKeys.PhotoMode }, { from: 3 }]) {
      expect(backStep(bad).scene).toBe(SceneKeys.Title);
    }
  });

  it('ignores a fromData that is not an object', () => {
    expect(backStep({ from: SceneKeys.DressUp, fromData: 'x' }).data).toEqual({});
  });
});

describe('album arguments', () => {
  it('albumArgs carries the origin and its state', () => {
    expect(albumArgs(SceneKeys.DressUp, { tab: 'hats' })).toEqual({ from: SceneKeys.DressUp, fromData: { tab: 'hats' } });
    expect(albumArgs(SceneKeys.Title)).toEqual({ from: SceneKeys.Title, fromData: {} });
  });

  it('hangArgs opens the hanger tab and returns to DressUp', () => {
    expect(hangArgs('gato-03')).toEqual({ from: SceneKeys.DressUp, tab: 'colgador', hang: 'gato-03' });
  });
});
