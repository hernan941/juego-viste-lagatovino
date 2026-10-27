import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { SfxKeys } from '../../src/game/constants';
import { ceremonyPlan, type CeremonyProfile, type CeremonyStep } from '../../src/game/domain/ceremony';
import type { ProgressEvent, RatingResult } from '../../src/game/domain/types';
import { Ceremony, type CeremonyTargets } from '../../src/game/objects/showcase/Ceremony';
import { makeCeremonyScene } from './helpers/ceremonyScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const result = (stars: 1 | 2 | 3 | 4 | 5): RatingResult => ({
  points: 12, stars,
  breakdown: [
    { kind: 'style', points: 2, ref: 'clasico' }, { kind: 'love', points: 2, ref: 'invierno' },
    { kind: 'dislike', points: -3, ref: 'gala' }, { kind: 'complete', points: 2 },
  ],
});
const events: ProgressEvent[] = [
  { type: 'coins', amount: 30 },
  { type: 'milestone', stars: 5, amount: 50 },
  { type: 'comboFirst', comboId: 'navidad', amount: 40 },
];

function setup(stars: 1 | 2 | 3 | 4 | 5 = 5, profile: CeremonyProfile = 'full', extra: Partial<CeremonyTargets> = {}) {
  const scene = makeCeremonyScene(profile === 'reduced');
  const cat = { hold: vi.fn(), release: vi.fn(), hop: vi.fn(), heartbeat: vi.fn() };
  const credits: number[] = [];
  const steps: CeremonyStep[] = [];
  const plan = ceremonyPlan(result(stars), events, profile);
  const targets: CeremonyTargets = {
    cat: cat as never, catName: 'Mau', judge: { name: 'Kofi', texture: 'char-judge' },
    onCredit: (c) => credits.push(c), onStep: (s) => steps.push(s), ...extra,
  };
  const ceremony = new Ceremony(scene as never, plan, targets);
  return { scene, cat, credits, steps, plan, ceremony };
}

const settled = (p: Promise<void>) => {
  let done = false;
  void p.then(() => { done = true; });
  return () => done;
};

describe('Ceremony', () => {
  it('plays every step of the plan in order and resolves at the end', async () => {
    const { scene, steps, plan, ceremony } = setup();
    const done = settled(ceremony.play());
    scene.advance(plan.totalMs - 1);
    await Promise.resolve();
    expect(done()).toBe(false);
    scene.advance(100);
    await Promise.resolve();
    expect(done()).toBe(true);
    expect(steps.map((s) => s.kind)).toEqual(plan.steps.map((s) => s.kind));
    expect(ceremony.finished).toBe(true);
  });

  it('shows a step only when its time comes', () => {
    const { scene, steps, plan, ceremony } = setup();
    void ceremony.play();
    scene.advance(0);
    expect(steps.map((s) => s.kind)).toEqual(['judgeEnter']);
    const stamp = plan.steps.find((s) => s.kind === 'stamp')!;
    scene.advance(stamp.at - 1);
    expect(steps.some((s) => s.kind === 'stamp')).toBe(false);
    scene.advance(1);
    expect(steps.some((s) => s.kind === 'stamp')).toBe(true);
  });

  it('credits the buttons as they land: the sum is the whole payout', async () => {
    const { scene, credits, plan, ceremony } = setup();
    void ceremony.play();
    scene.advance(plan.totalMs);
    // The landing of each button is a tween completing: run them.
    for (const r of scene.tweens.records) (r.config.onComplete as (() => void) | undefined)?.();
    expect(credits.reduce((a, b) => a + b, 0)).toBe(plan.coins);
  });

  it('reacts with the face of the stars, the happy hop and the purr', () => {
    const { scene, cat, plan, ceremony } = setup(5);
    void ceremony.play();
    scene.advance(plan.totalMs);
    expect(cat.hold).toHaveBeenCalledWith('amor');
    expect(cat.hop).toHaveBeenCalled();
    expect(scene.played).toContain(SfxKeys.Purr);
    expect(scene.bursts.length).toBeGreaterThan(0);
  });

  it('a low score is comforted, not punished: blink, no hop, no confetti', () => {
    const { scene, cat, plan, ceremony } = setup(1);
    void ceremony.play();
    scene.advance(plan.totalMs);
    expect(cat.hold).toHaveBeenCalledWith('parpadeo');
    expect(cat.hop).not.toHaveBeenCalled();
    expect(scene.made.texts.some((t) => String(t.text).includes('adorable'))).toBe(true);
  });

  it('a cat with no clothes gets a card with "Al natural" and the judge asks for the clothes (A2)', () => {
    const scene = makeCeremonyScene(false);
    const bare: RatingResult = { points: 0, stars: 1, breakdown: [{ kind: 'bare', points: 0 }] };
    const cat = { hold: vi.fn(), release: vi.fn(), hop: vi.fn(), heartbeat: vi.fn() };
    const plan = ceremonyPlan(bare, [{ type: 'coins', amount: 3 }], 'full');
    const ceremony = new Ceremony(scene as never, plan, { cat: cat as never, catName: 'Mau', judge: { name: 'Kofi', texture: 'char-judge' } });
    void ceremony.play();
    scene.advance(plan.totalMs);
    const texts = scene.made.texts.map((t) => String(t.text));
    expect(texts).toContain('Al natural');
    expect(texts.some((t) => t.includes('Y la ropa?'))).toBe(true);
  });

  it('a repeated look pays a tip and says why: Kofi asks to be surprised and a "Propina +2" note rises (A3)', () => {
    const scene = makeCeremonyScene(false);
    const cat = { hold: vi.fn(), release: vi.fn(), hop: vi.fn(), heartbeat: vi.fn() };
    const plan = ceremonyPlan(result(4), [{ type: 'coins', amount: 2, novelty: 0 }], 'full');
    const ceremony = new Ceremony(scene as never, plan, { cat: cat as never, catName: 'Mau', judge: { name: 'Kofi', texture: 'char-judge' } });
    void ceremony.play();
    scene.advance(plan.totalMs);
    const texts = scene.made.texts.map((t) => String(t.text));
    expect(texts.some((t) => t.includes('a probar otro'))).toBe(true);
    expect(texts).toContain('Propina +2');
  });

  it('with 4 stars Kofi gives a clue to reach 5 (A4)', () => {
    const { scene, plan, ceremony } = setup(4, 'full', { hint: { missing: 2, love: 'estrellas' }, tags: { estrellas: { label: 'estrellas', love: 'las estrellas', style: '' } } });
    void ceremony.play();
    scene.advance(plan.totalMs);
    expect(scene.made.texts.some((t) => String(t.text).includes('Te faltaron 2 puntitos… prueba con las estrellas!'))).toBe(true);
  });

  it('a tap skips x3 and every button still counts', async () => {
    const { scene, credits, plan, ceremony } = setup();
    const done = settled(ceremony.play());
    scene.advance(1000);
    scene.emitInput('pointerdown');
    expect(ceremony.skipped).toBe(true);
    const left = plan.totalMs - 1000;
    scene.advance(left / 3 + 100);
    await Promise.resolve();
    expect(done()).toBe(true);
    for (const r of scene.tweens.records) (r.config.onComplete as (() => void) | undefined)?.();
    expect(credits.reduce((a, b) => a + b, 0)).toBe(plan.coins);
  });

  it('skipping twice does nothing more, and the tap listener is gone after it', () => {
    const { scene, ceremony } = setup();
    void ceremony.play();
    scene.advance(500);
    ceremony.skip();
    const timers = scene.timers.length;
    ceremony.skip();
    expect(scene.timers.length).toBe(timers);
    expect(scene.inputListeners('pointerdown')).toBe(0);
  });

  it('does not listen for a tap when told not to', () => {
    const { scene, ceremony } = setup(5, 'full', { skipOnTap: false });
    void ceremony.play();
    expect(scene.inputListeners('pointerdown')).toBe(0);
  });

  it('with reduced motion there is no shake and no travelling', () => {
    const { scene, plan, ceremony } = setup(5, 'reduced');
    void ceremony.play();
    scene.advance(plan.totalMs);
    for (const r of scene.tweens.records) (r.config.onComplete as (() => void) | undefined)?.();
    expect(scene.shakes).toHaveLength(0);
    expect(scene.tweens.records.every((r) => r.config.onUpdate === undefined)).toBe(true);
  });

  it('destroying it mid-way leaves no tweens, timers or listeners and the promise still resolves', async () => {
    const { scene, ceremony } = setup();
    const done = settled(ceremony.play());
    scene.advance(1200);
    ceremony.destroy();
    expect(scene.activeTweens()).toHaveLength(0);
    expect(scene.timers.filter((t) => !t.removed)).toHaveLength(0);
    expect(scene.inputListeners('pointerdown')).toBe(0);
    await Promise.resolve();
    expect(done()).toBe(true);
  });

  it('cleans up by itself when the scene shuts down', () => {
    const { scene, ceremony } = setup();
    void ceremony.play();
    scene.advance(800);
    scene.emitScene('shutdown');
    expect(scene.activeTweens()).toHaveLength(0);
    expect(ceremony.destroyed).toBe(true);
  });

  it('play() twice returns the same promise and does not restart', () => {
    const { scene, ceremony } = setup();
    const a = ceremony.play();
    const b = ceremony.play();
    expect(a).toBe(b);
    scene.advance(0);
    expect(scene.timers.length).toBeGreaterThan(0);
  });
});
