import { describe, expect, it, vi } from 'vitest';
import {
  TRANSITION_MS, enterKind, fadeAlpha, irisMaxRadius, irisRadius, irisRing, transitionIn, transitionTo,
} from '../../src/game/systems/transitions';

describe('fadeAlpha', () => {
  it('closes from 0 to 1 and opens from 1 to 0', () => {
    expect(fadeAlpha(0, 'close')).toBe(0);
    expect(fadeAlpha(1, 'close')).toBe(1);
    expect(fadeAlpha(0, 'open')).toBe(1);
    expect(fadeAlpha(1, 'open')).toBe(0);
    expect(fadeAlpha(2, 'close')).toBe(1);
    expect(fadeAlpha(-1, 'close')).toBe(0);
  });
});

describe('iris math', () => {
  it('max radius reaches the farthest corner', () => {
    expect(irisMaxRadius(1280, 720, 640, 360)).toBeCloseTo(Math.hypot(640, 360));
    expect(irisMaxRadius(1280, 720, 0, 0)).toBeCloseTo(Math.hypot(1280, 720));
  });

  it('radius shrinks when closing and grows when opening', () => {
    expect(irisRadius(0, 'close', 100)).toBe(100);
    expect(irisRadius(1, 'close', 100)).toBe(0);
    expect(irisRadius(0.25, 'open', 100)).toBe(25);
    expect(irisRadius(5, 'open', 100)).toBe(100);
  });

  it('ring is a thick circle stroke that covers everything outside the radius', () => {
    const ring = irisRing(100, 500);
    expect(ring.width).toBe(400);
    expect(ring.radius - ring.width / 2).toBe(100);
    expect(ring.radius + ring.width / 2).toBe(500);
  });
});

describe('enterKind', () => {
  it('reads the transition from scene data and falls back to none', () => {
    expect(enterKind({ transition: 'iris' })).toBe('iris');
    expect(enterKind({ transition: 'fade' })).toBe('fade');
    expect(enterKind({ transition: 'heart' })).toBe('heart');
    expect(enterKind({ transition: 'paw' })).toBe('paw');
    expect(enterKind({ transition: 'zzz' })).toBeNull();
    expect(enterKind(undefined)).toBeNull();
  });
});

function fakeScene(reduced = false) {
  const gfx = {
    clear: vi.fn(), fillStyle: vi.fn(), fillRect: vi.fn(), lineStyle: vi.fn(), strokeCircle: vi.fn(),
    setDepth: vi.fn(), setScrollFactor: vi.fn(), destroy: vi.fn(),
  };
  gfx.setDepth.mockReturnValue(gfx);
  gfx.setScrollFactor.mockReturnValue(gfx);
  const ctx = {
    fillStyle: '', globalCompositeOperation: '', fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    closePath: vi.fn(), fill: vi.fn(), ellipse: vi.fn(),
  };
  const created = new Set<string>();
  const textures = {
    exists: vi.fn((k: string) => created.has(k)),
    createCanvas: vi.fn((k: string) => {
      created.add(k);
      return { getContext: () => ctx, refresh: vi.fn() };
    }),
  };
  const img = { setDepth: vi.fn(), setScrollFactor: vi.fn(), setScale: vi.fn(), setVisible: vi.fn(), destroy: vi.fn() };
  img.setDepth.mockReturnValue(img);
  img.setScrollFactor.mockReturnValue(img);
  img.setScale.mockReturnValue(img);
  img.setVisible.mockReturnValue(img);
  const tweens: { duration: number; run: (v: number) => void; done: () => void }[] = [];
  const scene = {
    add: { graphics: vi.fn(() => gfx), image: vi.fn(() => img) },
    tweens: {
      addCounter: vi.fn((cfg: { from: number; to: number; duration: number; onUpdate: (t: { getValue: () => number }) => void; onComplete: () => void }) => {
        tweens.push({
          duration: cfg.duration,
          run: (v) => cfg.onUpdate({ getValue: () => cfg.from + (cfg.to - cfg.from) * v }),
          done: cfg.onComplete,
        });
      }),
    },
    scale: { width: 1280, height: 720 },
    textures,
    input: { enabled: true },
    scene: { start: vi.fn() },
    events: { once: vi.fn() },
    registry: { get: vi.fn((k: string) => (k === 'reducedMotion' ? reduced : undefined)) },
  };
  return { scene, gfx, tweens, img, ctx, textures };
}

describe('transitionTo', () => {
  it('fades out and then starts the next scene with the transition kind', () => {
    const { scene, gfx, tweens } = fakeScene();
    transitionTo(scene as never, 'DressUp', { catId: 'x' }, 'fade');
    expect(scene.input.enabled).toBe(false);
    expect(tweens[0].duration).toBe(TRANSITION_MS);
    expect(scene.scene.start).not.toHaveBeenCalled();
    tweens[0].run(0.5);
    expect(gfx.fillRect).toHaveBeenCalled();
    tweens[0].done();
    expect(scene.scene.start).toHaveBeenCalledWith('DressUp', { catId: 'x', transition: 'fade' });
  });

  it('draws an iris ring while closing and a full cover at the end', () => {
    const { scene, gfx, tweens } = fakeScene();
    transitionTo(scene as never, 'DressUp', undefined, 'iris');
    tweens[0].run(0.5);
    expect(gfx.strokeCircle).toHaveBeenCalled();
    gfx.fillRect.mockClear();
    tweens[0].run(1);
    expect(gfx.fillRect).toHaveBeenCalled();
    tweens[0].done();
    expect(scene.scene.start).toHaveBeenCalledWith('DressUp', { transition: 'iris' });
  });

  it.each(['heart', 'paw'] as const)('closes with a %s shaped hole: a scaled image plus rects around it, then a full cover', (kind) => {
    const { scene, gfx, tweens, img, ctx } = fakeScene();
    transitionTo(scene as never, 'DressUp', {}, kind);
    expect(ctx.fill).toHaveBeenCalled();
    tweens[0].run(0.5);
    expect(img.setScale).toHaveBeenLastCalledWith(expect.any(Number));
    expect(img.setScale.mock.calls.at(-1)![0]).toBeGreaterThan(0);
    expect(gfx.strokeCircle).not.toHaveBeenCalled();
    tweens[0].run(1);
    expect(img.setVisible).toHaveBeenLastCalledWith(false);
    expect(gfx.fillRect).toHaveBeenLastCalledWith(0, 0, 1280, 720);
    tweens[0].done();
    expect(scene.scene.start).toHaveBeenCalledWith('DressUp', { transition: kind });
  });

  it('paints the texture of a shape only once', () => {
    const { scene, textures } = fakeScene();
    transitionIn(scene as never, 'heart');
    transitionIn(scene as never, 'heart');
    transitionIn(scene as never, 'paw');
    expect(textures.createCanvas).toHaveBeenCalledTimes(2);
  });

  it('opens a heart iris and removes the image and the rects when done', () => {
    const { scene, gfx, tweens, img } = fakeScene();
    transitionIn(scene as never, 'heart');
    tweens[0].done();
    expect(img.destroy).toHaveBeenCalled();
    expect(gfx.destroy).toHaveBeenCalled();
  });

  it('ignores a second call while one is running', () => {
    const { scene, tweens } = fakeScene();
    transitionTo(scene as never, 'A', {}, 'fade');
    transitionTo(scene as never, 'B', {}, 'fade');
    expect(tweens).toHaveLength(1);
  });
});

describe('transitionIn', () => {
  it('opens the overlay and destroys it when done', () => {
    const { scene, gfx, tweens } = fakeScene();
    transitionIn(scene as never, 'iris');
    tweens[0].run(0.5);
    expect(gfx.strokeCircle).toHaveBeenCalled();
    tweens[0].done();
    expect(gfx.destroy).toHaveBeenCalled();
  });

  it('calls onDone once the screen is open', () => {
    const { scene, tweens } = fakeScene();
    const onDone = vi.fn();
    transitionIn(scene as never, 'fade', onDone);
    expect(onDone).not.toHaveBeenCalled();
    tweens[0].done();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('calls onDone right away without a kind', () => {
    const { scene } = fakeScene();
    const onDone = vi.fn();
    transitionIn(scene as never, null, onDone);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('does nothing without a kind', () => {
    const { scene, tweens } = fakeScene();
    transitionIn(scene as never, null);
    expect(tweens).toHaveLength(0);
  });
});

describe('reduced motion (ADR 0013): every iris becomes a plain fade of the same length', () => {
  it.each(['iris', 'heart', 'paw'] as const)('closing with %s fades instead, and the next scene is told it was a fade', (kind) => {
    const { scene, gfx, tweens, img, textures } = fakeScene(true);
    transitionTo(scene as never, 'DressUp', { catId: 'x' }, kind);
    expect(tweens[0].duration).toBe(TRANSITION_MS);
    tweens[0].run(0.5);
    expect(gfx.fillRect).toHaveBeenCalled();
    expect(gfx.strokeCircle).not.toHaveBeenCalled();
    expect(img.setScale).not.toHaveBeenCalled();
    expect(textures.createCanvas).not.toHaveBeenCalled();
    tweens[0].done();
    expect(scene.scene.start).toHaveBeenCalledWith('DressUp', { catId: 'x', transition: 'fade' });
  });

  it.each(['iris', 'heart', 'paw'] as const)('opening a scene that was left with %s also fades', (kind) => {
    const { scene, gfx, tweens, textures } = fakeScene(true);
    transitionIn(scene as never, kind);
    tweens[0].run(0.5);
    expect(gfx.strokeCircle).not.toHaveBeenCalled();
    expect(textures.createCanvas).not.toHaveBeenCalled();
    tweens[0].done();
    expect(gfx.destroy).toHaveBeenCalled();
  });

  it('still does nothing without a kind, and still fades when asked for a fade', () => {
    const { scene, tweens } = fakeScene(true);
    transitionIn(scene as never, null);
    expect(tweens).toHaveLength(0);
    transitionIn(scene as never, 'fade');
    expect(tweens).toHaveLength(1);
  });

  it('with motion on, the iris is still an iris', () => {
    const { scene, gfx, tweens } = fakeScene(false);
    transitionTo(scene as never, 'DressUp', {}, 'iris');
    tweens[0].run(0.5);
    expect(gfx.strokeCircle).toHaveBeenCalled();
  });
});
