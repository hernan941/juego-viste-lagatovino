import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { Ink, ObjectEvents } from '../../src/game/constants';
import { Button } from '../../src/game/objects/Button';
import { CheckoutSheet, type CheckoutSheetOptions } from '../../src/game/objects/CheckoutSheet';
import { makeFakeScene, phaserMock, type FakeScene, type TweenRecord } from './helpers/kitScene';

type Fake = InstanceType<(typeof phaserMock)['default']['GameObjects']['Container']>;

const lines = [
  { label: 'Gorro de chef', price: 40, icon: 'icon-a', ref: { kind: 'item', id: 'chef' } },
  { label: 'Bufanda larga', price: 40, icon: 'icon-b', ref: { kind: 'item', id: 'scarf' } },
  { label: 'Tinte Cielo', price: 50, swatch: '#CFE0F3', ref: { kind: 'dye', id: 'cielo' } },
] as const;
const base: CheckoutSheetOptions = { lines: [...lines], total: 130, missing: 0, sellerLine: 'Son 130 botones. Si te tinca, te lo llevas', sellerTexture: 'char-seller' };

function finishTweens(scene: FakeScene): void {
  const done = new Set<TweenRecord>();
  for (let guard = 0; guard < 80; guard++) {
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

function make(options: Partial<CheckoutSheetOptions> = {}, reduced = false) {
  const scene = makeFakeScene(reduced);
  const sheet = new CheckoutSheet(scene as never, { ...base, ...options });
  const buttons = (sheet as unknown as Fake).list.filter((c): c is Button => c instanceof Button);
  const events: string[] = [];
  for (const e of [ObjectEvents.SheetConfirm, ObjectEvents.SheetShort, ObjectEvents.SheetLeaveOut, ObjectEvents.SheetCancel]) sheet.on(e, () => events.push(e));
  return { scene, sheet, buttons, events };
}

describe('CheckoutSheet (F13.6)', () => {
  it('has three pill buttons, each with a touch area of at least 88 high', () => {
    const { buttons } = make();
    expect(buttons).toHaveLength(3);
    for (const b of buttons) {
      const hit = (b as unknown as { interactive: { hitArea: { height: number } } }).interactive.hitArea;
      expect(hit.height).toBeGreaterThanOrEqual(88);
    }
  });

  it('writes the title, every line with its price, the total and the seller line', () => {
    const { scene } = make();
    const texts = scene.made.texts.map((t) => String(t.text));
    expect(texts).toContain('La caja');
    for (const l of lines) {
      expect(texts).toContain(l.label);
      expect(texts).toContain(String(l.price));
    }
    expect(texts.some((t) => t.includes('130'))).toBe(true);
    expect(texts).toContain(base.sellerLine);
  });

  it('gives the seller line room for two lines, not three (F20.R M4)', () => {
    const { scene } = make();
    const say = scene.made.texts.find((t) => String(t.text) === base.sellerLine);
    expect((say?.style as { wordWrap: { width: number } }).wordWrap.width).toBeGreaterThanOrEqual(280);
  });

  it('[Llevar todo] confirms when the wallet reaches', () => {
    const { buttons, events } = make();
    buttons[0].emit(ObjectEvents.ButtonClick);
    expect(events).toEqual([ObjectEvents.SheetConfirm]);
  });

  it('[Llevar todo] answers "short" when the wallet does not reach, and the sheet says how much is lacking', () => {
    const { scene, buttons, events } = make({ missing: 30 });
    buttons[0].emit(ObjectEvents.ButtonClick);
    expect(events).toEqual([ObjectEvents.SheetShort]);
    expect(scene.made.texts.map((t) => String(t.text)).some((t) => t.includes('30'))).toBe(true);
  });

  it('"te faltan" is written in the muted ink, never in alarm red (M3)', () => {
    const { scene } = make({ missing: 30 });
    const text = scene.made.texts.find((t) => String(t.text).includes('Te faltan 30'));
    expect((text?.style as { color: string }).color).toBe(Ink.mutedTexto);
  });

  it('[Sacarme lo que no tengo] and [Seguir probando] each have their own answer', () => {
    const { buttons, events } = make();
    buttons[1].emit(ObjectEvents.ButtonClick);
    buttons[2].emit(ObjectEvents.ButtonClick);
    expect(events).toEqual([ObjectEvents.SheetLeaveOut, ObjectEvents.SheetCancel]);
  });

  it('the lines pop in one after another, 80 ms apart', () => {
    const { scene } = make();
    const delays = scene.tweens.records.map((r) => r.config.delay).filter((d): d is number => typeof d === 'number' && d > 0);
    expect(delays.length).toBeGreaterThanOrEqual(lines.length);
    const steps = delays.slice(1, lines.length).map((d, i) => d - delays[i]);
    for (const s of steps) expect(s).toBe(80);
  });

  it('with reduced motion the lines only fade (no scale)', () => {
    const { scene } = make({}, true);
    expect(scene.tweens.records.some((r) => 'scale' in r.config)).toBe(false);
  });

  it('close fades it out and destroys it; destroy leaves no tween running', () => {
    const { scene, sheet } = make();
    sheet.close();
    expect(sheet.isClosing).toBe(true);
    finishTweens(scene);
    expect((sheet as unknown as { destroyed: boolean }).destroyed).toBe(true);
    expect(scene.activeTweens()).toHaveLength(0);
  });

  it('destroy is safe when the scene already let go of it (the scene shuts down with the till open)', () => {
    const { sheet } = make();
    (sheet as unknown as { scene: unknown }).scene = undefined;
    expect(() => sheet.destroy(true)).not.toThrow();
  });

  it('nudge shakes the card a little and comes back to rest; with reduced motion it only blinks', () => {
    const { scene, sheet } = make({ missing: 30 });
    const before = scene.tweens.records.length;
    sheet.nudge();
    const added = scene.tweens.records.slice(before);
    expect(added.some((r) => 'x' in r.config)).toBe(true);
    const calm = make({ missing: 30 }, true);
    const first = calm.scene.tweens.records.length;
    calm.sheet.nudge();
    const blink = calm.scene.tweens.records.slice(first);
    expect(blink.length).toBeGreaterThan(0);
    expect(blink.some((r) => 'x' in r.config)).toBe(false);
  });

  describe('taking one piece off (A6)', () => {
    /** The zones of the crosses: the interactive containers that are not buttons. */
    const crosses = (sheet: unknown) => {
      const rows = ((sheet as Fake).list as Fake[]).filter((c) => 'list' in c && !c.destroyed).flatMap((c) => (c as Fake).list as Fake[]);
      return rows.flatMap((r) => ((r as Fake).list ?? []) as Fake[]).filter((z) => z.interactive?.useHandCursor);
    };

    it('every line has a cross with a touch area of 80 wide, that asks for that line to go', () => {
      const { sheet } = make();
      const asked: unknown[] = [];
      sheet.on(ObjectEvents.SheetRemoveLine, (ref: unknown) => asked.push(ref));
      const zones = crosses(sheet);
      expect(zones).toHaveLength(3);
      for (const z of zones) expect(z.width).toBeGreaterThanOrEqual(80);
      zones[1].emit('pointerdown');
      zones[2].emit('pointerdown');
      expect(asked).toEqual([{ kind: 'item', id: 'scarf' }, { kind: 'dye', id: 'cielo' }]);
    });

    it('a line with no ref has no cross', () => {
      const { sheet } = make({ lines: [{ label: 'x', price: 1 }] });
      expect(crosses(sheet)).toHaveLength(0);
    });

    it('update() shows the new list and total, drops the old rows and keeps asking for the new ones', () => {
      const { scene, sheet } = make({ missing: 30 });
      const asked: unknown[] = [];
      sheet.on(ObjectEvents.SheetRemoveLine, (ref: unknown) => asked.push(ref));
      sheet.update({ lines: [lines[0], lines[1]], total: 80, missing: 0, sellerLine: 'Son 80' });
      const texts = scene.made.texts.map((t) => String(t.text));
      expect(texts.some((t) => t.includes('Total') && t.includes('80'))).toBe(true);
      const zones = crosses(sheet);
      expect(zones).toHaveLength(2);
      zones[0].emit('pointerdown');
      expect(asked).toEqual([{ kind: 'item', id: 'chef' }]);
    });

    it('update() makes [Llevar todo] answer "confirm" once the wallet reaches, and the other way round', () => {
      const { sheet, buttons, events } = make({ missing: 30 });
      buttons[0].emit(ObjectEvents.ButtonClick);
      sheet.update({ lines: [lines[0]], total: 40, missing: 0, sellerLine: '' });
      buttons[0].emit(ObjectEvents.ButtonClick);
      sheet.update({ lines: [lines[0], lines[1]], total: 80, missing: 10, sellerLine: '' });
      buttons[0].emit(ObjectEvents.ButtonClick);
      expect(events).toEqual([ObjectEvents.SheetShort, ObjectEvents.SheetConfirm, ObjectEvents.SheetShort]);
    });

    it('update() pops the total, and with reduced motion it does not scale', () => {
      const a = make();
      const before = a.scene.tweens.records.length;
      a.sheet.update({ lines: [lines[0]], total: 40, missing: 0, sellerLine: '' });
      expect(a.scene.tweens.records.slice(before).some((r) => 'scale' in r.config)).toBe(true);
      const b = make({}, true);
      const first = b.scene.tweens.records.length;
      b.sheet.update({ lines: [lines[0]], total: 40, missing: 0, sellerLine: '' });
      expect(b.scene.tweens.records.slice(first).some((r) => 'scale' in r.config)).toBe(false);
    });

    it('reports where the crosses are for the e2e hook', () => {
      const { sheet } = make();
      expect(sheet.getRemovePoints()).toHaveLength(3);
      sheet.update({ lines: [lines[0]], total: 40, missing: 0, sellerLine: '' });
      expect(sheet.getRemovePoints()).toHaveLength(1);
    });
  });

  it('gives the e2e hook the points of the three buttons', () => {
    const { sheet } = make();
    const points = sheet.getButtonPoints();
    expect(Object.keys(points).sort()).toEqual(['keepTrying', 'leaveOut', 'takeAll']);
  });
});
