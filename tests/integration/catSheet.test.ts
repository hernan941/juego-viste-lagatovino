import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import cats from '../../src/game/data/cats.json';
import clothes from '../../src/game/data/clothes.json';
import dyes from '../../src/game/data/dyes.json';
import { ObjectEvents } from '../../src/game/constants';
import { catSheetEntries, type NameLookup } from '../../src/game/domain/catSheet';
import { tasteKeys } from '../../src/game/domain/tastes';
import type { CatDef, ClothingDef, DyeDef } from '../../src/game/domain/types';
import { CatSheet } from '../../src/game/objects/CatSheet';
import { TasteChip } from '../../src/game/objects/TasteChip';
import { makeFakeScene, phaserMock, type FakeScene, type TweenRecord } from './helpers/kitScene';

const cat = (cats as unknown as CatDef[]).find((c) => c.id === 'naranja')!;
const names: NameLookup = {
  tag: (id) => id,
  item: (id) => (clothes as unknown as ClothingDef[]).find((c) => c.id === id)?.name ?? id,
  dye: (id) => (dyes as unknown as DyeDef[]).find((d) => d.id === id)?.name ?? id,
};
type Fake = InstanceType<(typeof phaserMock)['default']['GameObjects']['Container']>;

function make(found: string[] = [], reduced = false) {
  const scene = makeFakeScene(reduced);
  const entries = catSheetEntries(cat, found, names);
  const sheet = new CatSheet(scene as never, { catName: 'Naranjito', entries, hint: cat.prefs!.hint });
  const chips = (sheet as unknown as Fake).list.filter((c): c is TasteChip => c instanceof TasteChip);
  return { scene, sheet, chips, entries };
}

function finish(scene: FakeScene): void {
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

describe('CatSheet (F14.4)', () => {
  it('shows one chip per taste, the five of the cat, each at least 80 high', () => {
    const { chips } = make();
    expect(chips).toHaveLength(5);
    for (const chip of chips) expect(chip.height).toBeGreaterThanOrEqual(80);
  });

  it('the found tastes are shown and the hidden ones are "???"', () => {
    const keys = tasteKeys(cat);
    const { chips, scene } = make([keys[0], 'favorite']);
    expect(chips.filter((c) => c.found)).toHaveLength(2);
    expect(scene.made.texts.filter((t) => t.text === '???')).toHaveLength(3);
  });

  it('the kinds are in order: two loves, a dislike, the favorite and the color', () => {
    const { chips } = make();
    expect(chips.map((c) => c.kind)).toEqual(['love', 'love', 'dislike', 'favorite', 'color']);
  });

  it('writes the title, the count and the hint of the cat', () => {
    const { scene } = make([tasteKeys(cat)[0]]);
    const texts = scene.made.texts.map((t) => String(t.text));
    expect(texts.some((t) => t.includes('Naranjito'))).toBe(true);
    expect(texts.some((t) => t.includes('1') && t.includes('5'))).toBe(true);
    expect(texts.some((t) => t.includes(cat.prefs!.hint))).toBe(true);
  });

  it('the chips pop in one after another (stagger)', () => {
    const { scene } = make();
    const delays = scene.tweens.records.filter((r) => 'delay' in r.config && 'scale' in r.config).map((r) => r.config.delay as number);
    expect(delays.length).toBe(5);
    expect([...delays].sort((a, b) => a - b)).toEqual(delays);
    expect(new Set(delays).size).toBe(5);
  });

  it('reduced motion: the chips only fade in', () => {
    const { scene } = make([], true);
    expect(scene.tweens.records.some((r) => 'delay' in r.config && 'scale' in r.config)).toBe(false);
    expect(scene.tweens.records.some((r) => 'delay' in r.config && r.config.alpha === 1)).toBe(true);
  });

  it('a tap outside emits SheetCancel', () => {
    const { sheet } = make();
    const events: string[] = [];
    sheet.on(ObjectEvents.SheetCancel, () => events.push('cancel'));
    const backdrop = (sheet as unknown as Fake).list[0] as Fake;
    backdrop.emit('pointerup');
    expect(events).toEqual(['cancel']);
  });

  it('close fades it out and destroys it, and leaves no tween running', () => {
    const { scene, sheet } = make();
    sheet.close();
    expect(sheet.isClosing).toBe(true);
    finish(scene);
    expect((sheet as unknown as { destroyed: boolean }).destroyed).toBe(true);
    expect(scene.activeTweens()).toHaveLength(0);
  });

  it('destroy in the middle of the entrance leaves no tween running', () => {
    const { scene, sheet } = make();
    sheet.destroy();
    expect(scene.activeTweens()).toHaveLength(0);
  });
});
