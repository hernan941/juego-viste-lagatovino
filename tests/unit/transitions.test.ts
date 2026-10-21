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
    expect(enterKind({ transition: 'zzz' })).toBeNull();
    expect(enterKind(undefined)).toBeNull();
  });
});

function fakeScene() {
  const gfx = {
    clear: vi.fn(), fillStyle: vi.fn(), fillRect: vi.fn(), lineStyle: vi.fn(), strokeCircle: vi.fn(),
    setDepth: vi.fn(), setScrollFactor: vi.fn(), destroy: vi.fn(),
  };
  gfx.setDepth.mockReturnValue(gfx);
  gfx.setScrollFactor.mockReturnValue(gfx);
  const tweens: { duration: number; run: (v: number) => void; done: () => void }[] = [];
  const scene = {
    add: { graphics: vi.fn(() => gfx) },
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
    input: { enabled: true },
    scene: { start: vi.fn() },
    events: { once: vi.fn() },
  };
  return { scene, gfx, tweens };
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
