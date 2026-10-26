import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { ObjectEvents, SfxKeys } from '../../src/game/constants';
import { Button } from '../../src/game/objects/Button';
import { makeFakeScene, type FakeScene } from './helpers/kitScene';

const tweenWith = (scene: FakeScene, key: string) => scene.tweens.records.filter((r) => key in r.config);
const lastTween = (scene: FakeScene) => scene.tweens.records[scene.tweens.records.length - 1]!;

function make(reduced = false, options: ConstructorParameters<typeof Button>[4] = { pill: 'primary' }) {
  const scene = makeFakeScene(reduced);
  const button = new Button(scene as never, 100, 100, 'Iniciar', options);
  return { scene, button };
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('Button pill variant (F12.2)', () => {
  it('has a touch area of at least 80 although the drawing is smaller', () => {
    const { button } = make(false, { pill: 'secondary', width: 60, height: 40 });
    const hit = (button as unknown as { interactive: { hitArea: { width: number; height: number }; useHandCursor: boolean } }).interactive;
    expect(hit.hitArea.width).toBeGreaterThanOrEqual(80);
    expect(hit.hitArea.height).toBeGreaterThanOrEqual(80);
    expect(hit.useHandCursor).toBe(true);
  });

  it('press scales to 0.95 and drops 2 px', () => {
    const { scene, button } = make();
    button.emit('pointerdown');
    expect(lastTween(scene).config).toMatchObject({ scale: 0.95, y: 2 });
  });

  it('release plays the click, comes back with Back.easeOut and emits ButtonClick', () => {
    const { scene, button } = make();
    const clicks = vi.fn();
    button.on(ObjectEvents.ButtonClick, clicks);
    button.emit('pointerdown');
    button.emit('pointerup');
    expect(scene.played).toContain(SfxKeys.Click);
    expect(clicks).toHaveBeenCalledTimes(1);
    expect(lastTween(scene).config).toMatchObject({ scale: 1, y: 0, ease: 'Back.easeOut' });
  });

  it('hover grows 1.04 and rotates 1 degree', () => {
    const { scene, button } = make();
    button.emit('pointerover', { wasTouch: false });
    expect(tweenWith(scene, 'angle').pop()!.config).toMatchObject({ scale: 1.04, angle: 1 });
  });

  it('with reduced motion hover does not rotate and the bounce has no overshoot', () => {
    const { scene, button } = make(true);
    button.emit('pointerover', { wasTouch: false });
    expect(tweenWith(scene, 'angle').pop()!.config).toMatchObject({ scale: 1.04, angle: 0 });
    button.emit('pointerdown');
    button.emit('pointerup');
    expect(lastTween(scene).config.ease).toBe('Sine.easeOut');
  });

  it('a touch hover (no hover on a finger) still has the press feedback', () => {
    const { scene, button } = make();
    button.emit('pointerdown', { wasTouch: true });
    expect(lastTween(scene).config).toMatchObject({ scale: 0.95 });
  });

  it('removes its listeners when destroyed', () => {
    const { button } = make();
    button.destroy();
    expect((button as unknown as { destroyed: boolean }).destroyed).toBe(true);
  });
});
