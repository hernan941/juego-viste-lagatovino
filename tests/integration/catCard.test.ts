import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);
vi.mock('../../src/game/objects/Cat', () => ({ Cat: class { x = 0; y = 0; destroy() {} } }));

import type { CatDef } from '../../src/game/domain/types';
import { stableTilt } from '../../src/game/domain/stableTilt';
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

const polaroidOf = (card: CatCard) => (card as unknown as { polaroid: { angle: number; y: number } }).polaroid;

describe('CatCard lean and selection (F12.R M3, M5)', () => {
  it('leans at most 4 degrees, the same way every time', () => {
    const { card } = makeCard();
    expect(polaroidOf(card).angle).toBe(stableTilt('gato-01', 4));
    expect(Math.abs(polaroidOf(card).angle)).toBeLessThanOrEqual(4);
  });

  it('when picked the polaroid straightens to 0 degrees and rises 6 px', () => {
    const { card, scene } = makeCard();
    card.setSelected(true);
    const tween = scene.activeTweens().find((t) => t.targets === polaroidOf(card) || (Array.isArray(t.targets) && t.targets.includes(polaroidOf(card))));
    expect(tween?.config).toMatchObject({ angle: 0, y: -6, duration: 180, ease: 'Back.easeOut' });
  });

  it('when dropped it leans back and comes down', () => {
    const { card, scene } = makeCard();
    card.setSelected(true);
    card.setSelected(false);
    const last = scene.tweens.records.filter((t) => t.targets === polaroidOf(card) || (Array.isArray(t.targets) && t.targets.includes(polaroidOf(card)))).at(-1);
    expect(last?.config).toMatchObject({ angle: stableTilt('gato-01', 4), y: 0 });
  });

  it('a sol sparkle beats over the washi while picked (not with reduced motion)', () => {
    const { card, scene } = makeCard();
    card.setSelected(true);
    const spark = (card as unknown as { mark: unknown }).mark;
    expect(scene.activeTweens().some((t) => t.targets === spark && t.config.repeat === -1)).toBe(true);
    const reduced = makeCard(true);
    reduced.card.setSelected(true);
    const rspark = (reduced.card as unknown as { mark: unknown }).mark;
    expect(reduced.scene.activeTweens().some((t) => t.targets === rspark && t.config.repeat === -1)).toBe(false);
  });
});
