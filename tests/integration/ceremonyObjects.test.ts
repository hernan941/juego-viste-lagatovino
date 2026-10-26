import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { Ink, SfxKeys, TextureKeys } from '../../src/game/constants';
import { ButtonFlight } from '../../src/game/objects/showcase/ButtonFlight';
import { EventNotes } from '../../src/game/objects/showcase/EventNotes';
import { JudgeCharacter } from '../../src/game/objects/showcase/JudgeCharacter';
import { RatingCard } from '../../src/game/objects/showcase/RatingCard';
import { StarStamps } from '../../src/game/objects/showcase/StarStamps';
import { makeCeremonyScene, type CeremonyScene } from './helpers/ceremonyScene';
import type { TweenRecord } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const last = (s: CeremonyScene): TweenRecord => s.tweens.records[s.tweens.records.length - 1]!;
const speedOf = (r: TweenRecord) => (r as unknown as { timeScale?: number }).timeScale;

describe('JudgeCharacter', () => {
  it('slides in from the right with Back.easeOut', () => {
    const s = makeCeremonyScene();
    const judge = new JudgeCharacter(s as never, 1000, 600, { texture: 'char-judge' });
    judge.enter(420, true);
    expect(judge.x).toBe(1300);
    expect(judge.alpha).toBe(0);
    expect(last(s).config).toMatchObject({ x: 1000, alpha: 1, duration: 420, ease: 'Back.easeOut' });
  });

  it('only fades in with reduced motion', () => {
    const s = makeCeremonyScene(true);
    const judge = new JudgeCharacter(s as never, 1000, 600, { texture: 'char-judge' });
    judge.enter(420, false);
    expect(judge.x).toBe(1000);
    expect(last(s).config.x).toBeUndefined();
    expect(last(s).config).toMatchObject({ alpha: 1 });
  });

  it('says a line in a speech bubble and swaps it when he speaks again', () => {
    const s = makeCeremonyScene();
    const judge = new JudgeCharacter(s as never, 1000, 600, { texture: 'char-judge' });
    judge.say('A ver, a ver...');
    judge.say('Bien ahí');
    expect(s.made.texts.some((t) => t.text === 'Bien ahí')).toBe(true);
    const bubbles = judge.list.filter((o) => (o as { constructor: { name: string } }).constructor.name === 'SpeechBubble') as unknown as { destroyed: boolean }[];
    expect(bubbles.filter((b) => !b.destroyed)).toHaveLength(1);
  });

  it('can be sped up and leaves no tweens when destroyed', () => {
    const s = makeCeremonyScene();
    const judge = new JudgeCharacter(s as never, 1000, 600, { texture: 'char-judge' });
    judge.enter(420, true);
    judge.speedUp(3);
    expect(speedOf(last(s))).toBe(3);
    judge.hop();
    judge.destroy();
    expect(s.activeTweens()).toHaveLength(0);
  });
});

describe('RatingCard', () => {
  const line = { kind: 'love' as const, points: 2, ref: 'invierno' };
  const bad = { kind: 'dislike' as const, points: -3, ref: 'invierno' };

  it('writes the line and its points, and the line comes in with a tween', () => {
    const s = makeCeremonyScene();
    const card = new RatingCard(s as never, 800, 250, {});
    const before = s.tweens.records.length;
    card.showLine(0, line, 200);
    expect(s.made.texts.some((t) => String(t.text).includes('invierno'))).toBe(true);
    expect(s.made.texts.some((t) => t.text === '+2')).toBe(true);
    expect(s.tweens.records.length).toBeGreaterThan(before);
  });

  it('ticks, and each tic is higher than the last', () => {
    const s = makeCeremonyScene();
    const card = new RatingCard(s as never, 800, 250, {});
    card.showLine(0, line, 200);
    card.showLine(1, line, 200);
    card.showLine(2, line, 200);
    const rates = s.sounds.filter((x) => x.key === SfxKeys.Click).map((x) => x.options?.rate ?? 1);
    expect(rates).toHaveLength(3);
    expect(rates[1]!).toBeGreaterThan(rates[0]!);
    expect(rates[2]!).toBeGreaterThan(rates[1]!);
  });

  it('writes a negative line in muted ink with a pencil mark, never in alarm red', () => {
    const s = makeCeremonyScene();
    const card = new RatingCard(s as never, 800, 250, {});
    card.showLine(0, bad, 200);
    const pts = s.made.texts.find((t) => t.text === '−3') as { style: { color: string } };
    expect(pts.style.color).toBe(Ink.mutedTexto);
    expect(s.made.images.some((i) => (i as { key: string }).key === TextureKeys.PencilMark)).toBe(true);
    const texts = s.made.texts.map((t) => (t.style as { color: string }).color);
    expect(texts).not.toContain(Ink.tomate);
  });

  it('uses the ink color and no pencil mark for a good line', () => {
    const s = makeCeremonyScene();
    const card = new RatingCard(s as never, 800, 250, {});
    card.showLine(0, line, 200);
    expect(s.made.images.some((i) => (i as { key: string }).key === TextureKeys.PencilMark)).toBe(false);
  });

  it('with reduced motion the line only fades', () => {
    const s = makeCeremonyScene(true);
    const card = new RatingCard(s as never, 800, 250, {});
    card.showLine(0, line, 200);
    expect(last(s).config.x).toBeUndefined();
    expect(last(s).config.alpha).toBe(1);
  });

  it('speeds up and cleans its tweens', () => {
    const s = makeCeremonyScene();
    const card = new RatingCard(s as never, 800, 250, {});
    card.showLine(0, line, 200);
    card.speedUp(3);
    expect(speedOf(last(s))).toBe(3);
    card.destroy();
    expect(s.activeTweens()).toHaveLength(0);
  });
});

describe('StarStamps', () => {
  it('stamps from scale 1.6 to 1 with Back.easeOut and thumps on impact', () => {
    const s = makeCeremonyScene();
    const stamps = new StarStamps(s as never, 800, 400, { total: 3 });
    stamps.stamp(0, { ms: 180, shake: true, golden: false });
    const tween = last(s);
    expect(tween.config).toMatchObject({ scale: 1, duration: 180, ease: 'Back.easeOut' });
    expect(s.played).not.toContain(SfxKeys.Stamp);
    (tween.config.onComplete as () => void)();
    expect(s.played).toContain(SfxKeys.Stamp);
  });

  it('shakes the camera 2 px on impact', () => {
    const s = makeCeremonyScene();
    const stamps = new StarStamps(s as never, 800, 400, { total: 3 });
    stamps.stamp(0, { ms: 180, shake: true, golden: false });
    (last(s).config.onComplete as () => void)();
    expect(s.shakes).toHaveLength(1);
    expect(s.shakes[0]!.intensity).toBeCloseTo(2 / 1280, 5);
  });

  it('does not shake nor scale with reduced motion, it fades', () => {
    const s = makeCeremonyScene(true);
    const stamps = new StarStamps(s as never, 800, 400, { total: 3 });
    stamps.stamp(0, { ms: 180, shake: false, golden: false });
    expect(last(s).config.scale).toBeUndefined();
    (last(s).config.onComplete as () => void)();
    expect(s.shakes).toHaveLength(0);
    expect(s.played).toContain(SfxKeys.Stamp);
  });

  it('the golden one is a sol stamp and bursts with sparkles', () => {
    const s = makeCeremonyScene();
    const stamps = new StarStamps(s as never, 800, 400, { total: 5 });
    stamps.stamp(4, { ms: 180, shake: true, golden: true });
    expect(s.made.images.some((i) => (i as { key: string }).key === TextureKeys.StampSol)).toBe(true);
    (last(s).config.onComplete as () => void)();
    expect(s.bursts.length).toBeGreaterThan(0);
  });

  it('a plain stamp does not burst', () => {
    const s = makeCeremonyScene();
    const stamps = new StarStamps(s as never, 800, 400, { total: 5 });
    stamps.stamp(0, { ms: 180, shake: true, golden: false });
    (last(s).config.onComplete as () => void)();
    expect(s.bursts).toHaveLength(0);
  });

  it('shows the empty slots as ghosts and cleans up', () => {
    const s = makeCeremonyScene();
    const stamps = new StarStamps(s as never, 800, 400, { total: 5 });
    expect(s.made.images.filter((i) => (i as { key: string }).key === TextureKeys.Stamp)).toHaveLength(5);
    stamps.stamp(0, { ms: 180, shake: true, golden: false });
    stamps.speedUp(3);
    expect(speedOf(last(s))).toBe(3);
    stamps.destroy();
    expect(s.activeTweens()).toHaveLength(0);
  });
});

describe('EventNotes', () => {
  const note = { type: 'comboFirst' as const, comboId: 'navidad', amount: 40 };

  it('drops a polaroid note in with its caption and reward, and rustles the paper', () => {
    const s = makeCeremonyScene();
    const notes = new EventNotes(s as never, 640, 600, { count: 3 });
    notes.addNote(0, note, 500);
    expect(s.made.images.some((i) => (i as { key: string }).key === TextureKeys.NotePolaroid)).toBe(true);
    expect(s.made.texts.some((t) => t.text === '+40')).toBe(true);
    expect(s.made.texts.some((t) => String(t.text).includes('combo'))).toBe(true);
    expect(s.played).toContain(SfxKeys.Paper);
    expect(last(s).config).toMatchObject({ duration: 500, ease: 'Back.easeOut' });
  });

  it('lines the notes up in a row centered on x', () => {
    const s = makeCeremonyScene();
    const notes = new EventNotes(s as never, 640, 600, { count: 3 });
    const xs = [0, 1, 2].map((i) => notes.slotX(i));
    expect(xs[1]).toBeCloseTo(640);
    expect(xs[0]! + xs[2]!).toBeCloseTo(1280);
    expect(xs[0]!).toBeLessThan(xs[1]!);
  });

  it('only fades with reduced motion, and cleans up', () => {
    const s = makeCeremonyScene(true);
    const notes = new EventNotes(s as never, 640, 600, { count: 2 });
    notes.addNote(0, note, 500);
    expect(last(s).config.y).toBeUndefined();
    notes.speedUp(3);
    expect(speedOf(last(s))).toBe(3);
    notes.destroy();
    expect(s.activeTweens()).toHaveLength(0);
  });
});

describe('ButtonFlight', () => {
  const from = { x: 800, y: 300 };
  const to = { x: 1200, y: 50 };

  it('flies a button along an arc and credits it on landing, with a clink', () => {
    const s = makeCeremonyScene();
    const flight = new ButtonFlight(s as never);
    const landed = vi.fn();
    flight.fly({ index: 0, from, to, ms: 500, credit: 5, fly: true }, landed);
    const tween = last(s);
    expect(tween.config.duration).toBe(500);
    expect(landed).not.toHaveBeenCalled();
    (tween.config.onComplete as () => void)();
    expect(landed).toHaveBeenCalledWith(5);
    expect(s.played).toContain(SfxKeys.Clink);
  });

  it('with reduced motion nothing travels, but the credit still counts', () => {
    const s = makeCeremonyScene(true);
    const flight = new ButtonFlight(s as never);
    const landed = vi.fn();
    flight.fly({ index: 0, from, to, ms: 500, credit: 5, fly: false }, landed);
    expect(last(s).config.x).toBeUndefined();
    expect(last(s).config.onUpdate).toBeUndefined();
    (last(s).config.onComplete as () => void)();
    expect(landed).toHaveBeenCalledWith(5);
  });

  it('the clink rises with every landing', () => {
    const s = makeCeremonyScene();
    const flight = new ButtonFlight(s as never);
    for (let i = 0; i < 3; i++) {
      flight.fly({ index: i, from, to, ms: 500, credit: 1, fly: true }, () => {});
      (last(s).config.onComplete as () => void)();
    }
    const rates = s.sounds.filter((x) => x.key === SfxKeys.Clink).map((x) => x.options?.rate ?? 1);
    expect(rates[2]!).toBeGreaterThan(rates[0]!);
  });

  it('speeds up and leaves nothing running when destroyed', () => {
    const s = makeCeremonyScene();
    const flight = new ButtonFlight(s as never);
    flight.fly({ index: 0, from, to, ms: 500, credit: 5, fly: true }, () => {});
    flight.speedUp(3);
    expect(speedOf(last(s))).toBe(3);
    flight.destroy();
    expect(s.activeTweens()).toHaveLength(0);
  });
});
