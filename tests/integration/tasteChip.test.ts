import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { SfxKeys } from '../../src/game/constants';
import { TasteChip } from '../../src/game/objects/TasteChip';
import { makeFakeScene, type FakeScene, type TweenRecord } from './helpers/kitScene';

const chipText = { kind: 'love', glyph: '♥', label: 'estrellas' } as const;

function make(reduced = false, options: ConstructorParameters<typeof TasteChip>[4] = {}) {
  const scene = makeFakeScene(reduced);
  const counters: TweenRecord[] = [];
  (scene.tweens as unknown as Record<string, unknown>).addCounter = (config: Record<string, unknown>) => {
    const rec = scene.tweens.add({ ...config, targets: config });
    counters.push(rec);
    return rec;
  };
  const chip = new TasteChip(scene as never, 100, 100, chipText, options);
  return { scene, chip, counters };
}

/** Finishes the tweens in order, also the ones that finishing one adds. */
function finish(scene: FakeScene): void {
  const done = new Set<TweenRecord>();
  for (let guard = 0; guard < 30; guard++) {
    const next = scene.tweens.records.find((r) => !done.has(r) && !r.removed);
    if (!next) return;
    done.add(next);
    (next.config.onComplete as (() => void) | undefined)?.();
  }
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('TasteChip (F14.3)', () => {
  it('writes the name of the taste; a hidden one writes "???"', () => {
    const found = make();
    expect(found.scene.made.texts.map((t) => t.text)).toContain('estrellas');
    const hidden = make(false, { found: false });
    expect(hidden.scene.made.texts.map((t) => t.text)).toContain('???');
    expect(hidden.chip.found).toBe(false);
  });

  it('draws every kind and its hidden version without trouble', () => {
    for (const kind of ['love', 'dislike', 'favorite', 'color'] as const) {
      for (const found of [true, false]) {
        const scene = makeFakeScene();
        expect(() => new TasteChip(scene as never, 0, 0, { kind, glyph: '·', label: 'x' }, { found })).not.toThrow();
      }
    }
  });

  it('keeps the size it was given (the sheet needs 80 high)', () => {
    const { chip } = make(false, { width: 210, height: 84 });
    expect(chip.width).toBe(210);
    expect(chip.height).toBe(84);
  });

  it('pops in when created', () => {
    const { scene } = make();
    expect(scene.tweens.records.some((r) => r.config.scale === 1 && r.config.alpha === 1)).toBe(true);
  });

  it('flies to the target along an arc, lands with a paper pop, calls onLand once and destroys itself', () => {
    const { scene, chip, counters } = make();
    const onLand = vi.fn();
    chip.flyTo({ x: 700, y: 100 }, onLand);
    expect(counters).toHaveLength(1);
    // Half way it is higher than the straight line (the arc) and smaller.
    const update = counters[0].config.onUpdate as (t: { getValue(): number }) => void;
    update({ getValue: () => 0.5 });
    expect(chip.y).toBeLessThan(100);
    expect(chip.scale).toBeLessThan(1);
    update({ getValue: () => 1 });
    expect(chip.x).toBe(700);
    finish(scene);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(scene.played).toContain(SfxKeys.Paper);
    expect((chip as unknown as { destroyed: boolean }).destroyed).toBe(true);
  });

  it('reduced motion: it does not travel, it fades in place and still lands', () => {
    const { scene, chip, counters } = make(true);
    const onLand = vi.fn();
    chip.flyTo({ x: 700, y: 100 }, onLand);
    expect(counters).toHaveLength(0);
    finish(scene);
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(chip.x).toBe(100);
  });

  it('destroy in the air stops the flight and never lands', () => {
    const { scene, chip } = make();
    const onLand = vi.fn();
    chip.flyTo({ x: 700, y: 100 }, onLand);
    chip.destroy();
    finish(scene);
    expect(onLand).not.toHaveBeenCalled();
    expect(scene.activeTweens()).toHaveLength(0);
  });
});
