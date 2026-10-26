import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import clothes from '../../src/game/data/clothes.json';
import { ObjectEvents, SfxKeys } from '../../src/game/constants';
import type { ClothingDef } from '../../src/game/domain/types';
import { Button } from '../../src/game/objects/Button';
import { PurchaseSheet } from '../../src/game/objects/PurchaseSheet';
import { TagCut } from '../../src/game/objects/TagCut';
import { makeFakeScene, phaserMock, type FakeScene, type TweenRecord } from './helpers/kitScene';

const item = (clothes as unknown as ClothingDef[]).find((c) => c.tier === 'linda')!;
type Fake = InstanceType<(typeof phaserMock)['default']['GameObjects']['Container']>;

/** The kit fake has no rectangle or zone: they are containers that remember their handlers. */
function sceneWithShapes(reduced = false): FakeScene {
  const scene = makeFakeScene(reduced);
  const Container = phaserMock.default.GameObjects.Container;
  (scene.add as Record<string, unknown>).rectangle = () => new Container(scene);
  (scene.add as Record<string, unknown>).zone = () => new Container(scene);
  return scene;
}

/** Runs every tween that was added, in order, as if it had finished (and the ones they add, too). */
function finishTweens(scene: FakeScene): void {
  const done = new Set<TweenRecord>();
  for (let guard = 0; guard < 50; guard++) {
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

describe('PurchaseSheet (F13.5)', () => {
  function make() {
    const scene = sceneWithShapes();
    const sheet = new PurchaseSheet(scene as never, item, 70);
    const buttons = (sheet as unknown as Fake).list.filter((c): c is Button => c instanceof Button);
    const events: string[] = [];
    sheet.on(ObjectEvents.SheetConfirm, () => events.push('confirm'));
    sheet.on(ObjectEvents.SheetCancel, () => events.push('cancel'));
    return { scene, sheet, buttons, events };
  }

  it('has [Llevar] and [Todavía no], both with a touch area of at least 88 high', () => {
    const { buttons } = make();
    expect(buttons).toHaveLength(2);
    for (const b of buttons) {
      const hit = (b as unknown as { interactive: { hitArea: { height: number } } }).interactive.hitArea;
      expect(hit.height).toBeGreaterThanOrEqual(88);
    }
  });

  it('writes the name and the price of the item', () => {
    const { scene } = make();
    const texts = scene.made.texts.map((t) => String(t.text));
    expect(texts.some((t) => t.includes(item.name) && t.includes('70'))).toBe(true);
    expect(texts).toContain('¿Te lo llevas?');
  });

  it('[Llevar] confirms and [Todavía no] cancels', () => {
    const { buttons, events } = make();
    buttons[0].emit(ObjectEvents.ButtonClick);
    buttons[1].emit(ObjectEvents.ButtonClick);
    expect(events).toEqual(['confirm', 'cancel']);
  });

  it('close fades it out and destroys it; closing twice is harmless', () => {
    const { scene, sheet } = make();
    sheet.close();
    sheet.close();
    expect(sheet.isClosing).toBe(true);
    finishTweens(scene);
    expect((sheet as unknown as { destroyed: boolean }).destroyed).toBe(true);
  });

  it('destroy leaves no tween running', () => {
    const { scene, sheet } = make();
    sheet.destroy();
    expect(scene.activeTweens()).toHaveLength(0);
  });
});

describe('TagCut (F13.5)', () => {
  function make(reduced = false) {
    const scene = sceneWithShapes(reduced);
    const log: string[] = [];
    const cut = new TagCut(scene as never, { x: 300, y: 200, price: 70, scale: 0.6, onSnip: () => log.push('snip'), onDone: () => log.push('done') });
    return { scene, cut, log };
  }

  it('snips once, then the tag falls and it ends by itself', () => {
    const { scene, cut, log } = make();
    expect(cut.active).toBe(true);
    finishTweens(scene);
    expect(log).toEqual(['snip', 'done']);
    expect(scene.played.filter((k) => k === SfxKeys.Snip)).toHaveLength(1);
    expect(cut.active).toBe(false);
  });

  it('the scissors travel in and the tag spins down (normal motion)', () => {
    const { scene } = make(false);
    finishTweens(scene);
    expect(scene.tweens.records.some((r) => 'x' in r.config && 'angle' in r.config)).toBe(true);
    expect(scene.tweens.records.some((r) => r.config.angle === 200)).toBe(true);
  });

  it('with reduced motion nothing travels or spins: it only fades', () => {
    const { scene, log } = make(true);
    finishTweens(scene);
    expect(log).toEqual(['snip', 'done']);
    expect(scene.tweens.records.some((r) => 'x' in r.config || r.config.angle === 200)).toBe(false);
  });

  it('cancel stops it without calling onDone', () => {
    const { scene, cut, log } = make();
    cut.cancel();
    expect(cut.active).toBe(false);
    finishTweens(scene);
    expect(log).not.toContain('done');
  });
});
