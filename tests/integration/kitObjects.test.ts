import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { Fonts, TextureKeys } from '../../src/game/constants';
import { stableTilt } from '../../src/game/domain/stableTilt';
import { Card } from '../../src/game/objects/kit/Card';
import { PaperBackground } from '../../src/game/objects/kit/PaperBackground';
import { Polaroid } from '../../src/game/objects/kit/Polaroid';
import { SpeechBubble } from '../../src/game/objects/kit/SpeechBubble';
import { createParticleTextures } from '../../src/game/objects/particleTextures';
import { makeFakeScene } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

type Obj = { scale: number; angle: number; alpha: number; destroyed: boolean; destroy(): void };

const makers: Record<string, (s: ReturnType<typeof makeFakeScene>, animate?: boolean) => Obj> = {
  Card: (s, animate = true) => new Card(s as never, 10, 20, { width: 200, height: 120, animate }) as unknown as Obj,
  Polaroid: (s, animate = true) => new Polaroid(s as never, 10, 20, { id: 'gato-01', caption: 'Mau', animate }) as unknown as Obj,
  SpeechBubble: (s, animate = true) => new SpeechBubble(s as never, 10, 20, '¡Pasa nomás!', { animate }) as unknown as Obj,
  PaperBackground: (s, animate = true) => new PaperBackground(s as never, { animate }) as unknown as Obj,
};

describe.each(Object.keys(makers))('%s', (name) => {
  const make = makers[name]!;

  it('appears with a tween, not all at once', () => {
    const scene = makeFakeScene();
    const obj = make(scene);
    expect(scene.activeTweens().length).toBeGreaterThan(0);
    expect(obj.alpha).toBe(0);
  });

  it('is already shown when animation is off', () => {
    const scene = makeFakeScene();
    const obj = make(scene, false);
    expect(scene.activeTweens()).toHaveLength(0);
    expect(obj.alpha).toBe(1);
  });

  it('leaves no tweens running when destroyed', () => {
    const scene = makeFakeScene();
    const obj = make(scene);
    obj.destroy();
    expect(obj.destroyed).toBe(true);
    expect(scene.activeTweens()).toHaveLength(0);
  });

  it('reduced motion only fades: no scale, angle or position tweens', () => {
    const scene = makeFakeScene(true);
    make(scene);
    const moving = scene.tweens.records.filter((r) => 'scale' in r.config || 'angle' in r.config || 'y' in r.config);
    expect(moving).toHaveLength(0);
    expect(scene.tweens.records.some((r) => 'alpha' in r.config)).toBe(true);
  });
});

describe('Card', () => {
  it('pops from 0.8 with Back.easeOut', () => {
    const scene = makeFakeScene();
    const card = new Card(scene as never, 0, 0, { width: 100, height: 80 }) as unknown as Obj;
    expect(card.scale).toBe(0.8);
    expect(scene.tweens.records.some((r) => r.config.scale === 1 && r.config.ease === 'Back.easeOut')).toBe(true);
  });

  it('keeps the tilt it was given', () => {
    const card = new Card(makeFakeScene() as never, 0, 0, { width: 100, height: 80, tilt: 3, animate: false }) as unknown as Obj;
    expect(card.angle).toBe(3);
  });
});

describe('Polaroid', () => {
  it('rests at the stable angle of its id', () => {
    const scene = makeFakeScene();
    new Polaroid(scene as never, 0, 0, { id: 'gato-07' });
    const fall = scene.tweens.records.find((r) => 'angle' in r.config)!;
    expect(fall.config.angle).toBe(stableTilt('gato-07'));
  });

  it('falls with 6 degrees extra that get corrected', () => {
    const scene = makeFakeScene();
    const p = new Polaroid(scene as never, 0, 0, { id: 'gato-07' }) as unknown as Obj;
    expect(p.angle).toBeCloseTo(stableTilt('gato-07') + 6 * Math.sign(stableTilt('gato-07')));
  });

  it('is already tilted at rest without animation', () => {
    const p = new Polaroid(makeFakeScene() as never, 0, 0, { id: 'gato-07', animate: false }) as unknown as Obj;
    expect(p.angle).toBe(stableTilt('gato-07'));
  });

  it('writes the caption in Gaegu', () => {
    const scene = makeFakeScene();
    new Polaroid(scene as never, 0, 0, { id: 'a', caption: 'Mau', animate: false });
    const t = scene.made.texts.find((x) => x.text === 'Mau')!;
    expect((t.style as { fontFamily: string }).fontFamily).toBe(Fonts.Voice);
  });

  it('shows a photo when given a texture', () => {
    const scene = makeFakeScene();
    new Polaroid(scene as never, 0, 0, { id: 'a', texture: 'cat-x', animate: false });
    expect(scene.made.images).toHaveLength(1);
  });
});

describe('SpeechBubble', () => {
  it('speaks in Gaegu between 26 and 30 px, tilted 2 degrees', () => {
    const scene = makeFakeScene();
    const b = new SpeechBubble(scene as never, 0, 0, 'Hola', { animate: false }) as unknown as Obj;
    const style = scene.made.texts[0]!.style as { fontFamily: string; fontSize: string };
    expect(style.fontFamily).toBe(Fonts.Voice);
    const px = parseInt(style.fontSize, 10);
    expect(px).toBeGreaterThanOrEqual(26);
    expect(px).toBeLessThanOrEqual(30);
    expect(b.angle).toBe(2);
  });

  it('can change its text', () => {
    const scene = makeFakeScene();
    const b = new SpeechBubble(scene as never, 0, 0, 'Hola', { animate: false });
    b.setText('Chao');
    expect(scene.made.texts[0]!.text).toBe('Chao');
  });
});

describe('PaperBackground', () => {
  it('draws the grid lines', () => {
    const scene = makeFakeScene();
    new PaperBackground(scene as never, { animate: false });
    const calls = (scene.made.graphics[0] as unknown as { calls: string[] }).calls;
    expect(calls.filter((c) => c === 'lineBetween')).toHaveLength(54 + 31);
  });
});

describe('ink sparkle particle texture', () => {
  it('is generated with its own key', () => {
    const generated: string[] = [];
    const gfx: unknown = new Proxy({}, {
      get: (_t, p: string) => (p === 'generateTexture' ? (key: string) => { generated.push(key); } : () => gfx),
    });
    const scene = { textures: { exists: () => false }, make: { graphics: () => gfx } };
    createParticleTextures(scene as never);
    expect(generated).toContain(TextureKeys.InkSparkle);
  });
});
