import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);
vi.mock('../../src/game/objects/Cat', () => ({ Cat: class { x = 0; y = 0; destroy() {} } }));

import type { CatDef } from '../../src/game/domain/types';
import { CatCard } from '../../src/game/objects/CatCard';
import { makeFakeScene } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const def = { id: 'gato-01', name: 'Mau' } as unknown as CatDef;

function makeCard(reduced = false) {
  const scene = makeFakeScene(reduced);
  scene.add.particles = () => ({ explode() {} });
  const card = new CatCard(scene as never, 0, 0, def, {} as never);
  return { scene, card };
}

const labelOf = (card: CatCard) => (card as unknown as { tallyLabel: { alpha: number; scale: number } }).tallyLabel;

describe('CatCard.setTally', () => {
  it('adds the new label to the card, not to the tilted polaroid', () => {
    const { card } = makeCard();
    const polaroid = (card as unknown as { polaroid: { list: unknown[] } }).polaroid;
    const polaroidBefore = polaroid.list.length;
    card.setTally({ stars: 3, tastes: { found: 1, total: 5, label: '♥ 1/5' } } as never);
    expect(card.list).toContain(labelOf(card));
    expect(polaroid.list).toHaveLength(polaroidBefore);
  });

  it('pops the new label in instead of showing it at once', () => {
    const { card, scene } = makeCard();
    card.setTally({ stars: 3, tastes: null } as never);
    const label = labelOf(card);
    expect(label.alpha).toBe(0);
    expect(label.scale).toBeCloseTo(0.8);
    expect(scene.activeTweens().some((t) => t.targets === label)).toBe(true);
  });

  it('only fades with reduced motion', () => {
    const { card } = makeCard(true);
    card.setTally({ stars: 3, tastes: null } as never);
    expect(labelOf(card).scale).toBe(1);
  });
});
