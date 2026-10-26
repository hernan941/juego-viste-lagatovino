import { beforeEach, describe, expect, it, vi } from 'vitest';

const transitionTo = vi.fn();
vi.mock('../../src/game/systems/transitions', () => ({ transitionTo: (...a: unknown[]) => transitionTo(...a) }));

import { go } from '../../src/game/systems/navigate';

const sceneOf = (key: string) => ({ scene: { key } }) as never;

describe('go', () => {
  beforeEach(() => transitionTo.mockClear());

  it('moves along the flow with the transition of the table', () => {
    const scene = sceneOf('Title');
    go(scene, 'start');
    expect(transitionTo).toHaveBeenCalledWith(scene, 'CatSelect', {}, 'paw');
  });

  it('passes the data to the next scene', () => {
    const scene = sceneOf('ShopEntrance');
    go(scene, 'enter', { skipped: true });
    expect(transitionTo).toHaveBeenCalledWith(scene, 'DressUp', { skipped: true }, 'heart');
  });

  it('refuses an action that the scene does not have, and changes nothing', () => {
    expect(() => go(sceneOf('Title'), 'finish')).toThrow(/Title/);
    expect(transitionTo).not.toHaveBeenCalled();
  });

  it('goes back to the origin of the album with its state, through a fade', () => {
    const scene = sceneOf('Album');
    go(scene, 'back', { from: 'DressUp', fromData: { tab: 'hats', scroll: 90 } });
    expect(transitionTo).toHaveBeenCalledWith(scene, 'DressUp', { tab: 'hats', scroll: 90 }, 'fade');
  });

  it('goes back to Title when the album has no valid origin', () => {
    const scene = sceneOf('Album');
    go(scene, 'back', { from: 'Nope' });
    expect(transitionTo).toHaveBeenCalledWith(scene, 'Title', {}, 'fade');
  });
});
