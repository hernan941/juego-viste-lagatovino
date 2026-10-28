import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installE2EHook } from '../../src/game/e2eHook';

/** The hook with a fake game: the canvas sits under a 56 px header and is scaled to half (640 x 360). */
function installFake(state: Record<string, unknown>) {
  const scene = { scene: { key: 'DressUp' }, getE2EState: () => state, e2eWear: () => {} };
  const audio = { play: () => undefined, playRandom: () => undefined };
  const game = {
    canvas: { getBoundingClientRect: () => ({ left: 0, top: 56, width: 640, height: 360 }) },
    plugins: { get: () => audio },
    scene: { getScenes: () => [scene] },
    registry: { get: () => undefined },
  };
  installE2EHook(game as never, () => ({}) as never);
  return (window as unknown as { __VISTE__: { dressUp: Record<string, unknown> } }).__VISTE__;
}

describe('the test hook gives every point in page coordinates', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { search: '?e2e=1' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('also the points that the controllers report nested (purchase, checkout, catsheet, dyes, wallet)', () => {
    const at = { x: 400, y: 200 };
    const hook = installFake({
      cells: { a: at }, tabs: {}, slotAnchors: {}, layerGrab: {}, layerRows: [], gift: null,
      dropZone: { x: 0, y: 0, width: 100, height: 100 }, grid: { x: 0, y: 0, width: 100, height: 100, scroll: 0, targetScroll: 0, maxScroll: 0 },
      purchase: { open: true, buttons: { take: at, notYet: at } },
      checkout: { buttons: { takeAll: at }, removes: [at] },
      catsheet: { sign: at },
      dyes: { jars: { sky: at } },
      wallet: { wallet: { jar: at, shown: 3 } },
    });
    const page = { x: 200, y: 156 };
    const d = hook.dressUp as Record<string, never>;
    expect((d.cells as Record<string, unknown>).a).toEqual(page);
    expect(d.purchase).toEqual({ open: true, buttons: { take: page, notYet: page } });
    expect(d.checkout).toEqual({ buttons: { takeAll: page }, removes: [page] });
    expect(d.catsheet).toEqual({ sign: page });
    expect(d.dyes).toEqual({ jars: { sky: page } });
    expect(d.wallet).toEqual({ wallet: { jar: page, shown: 3 } });
  });
});
