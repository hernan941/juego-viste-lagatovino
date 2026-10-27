// The closed notebook and the milestone stamp (F17.5): what they write, how they move and that they clean up after themselves.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', async () => (await import('./helpers/kitScene')).phaserMock);

import { Cover } from '../../src/game/objects/album/Cover';
import { MilestoneStamp } from '../../src/game/objects/album/MilestoneStamp';
import { makeFakeScene, type FakeScene } from './helpers/kitScene';

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: false }) });
});
afterEach(() => vi.unstubAllGlobals());

const texts = (scene: FakeScene) => scene.made.texts.map((t) => t.text);
const finish = (scene: FakeScene, match: (c: Record<string, unknown>) => boolean) => {
  for (const r of scene.tweens.records.filter((x) => match(x.config))) (r.config.onComplete as (() => void) | undefined)?.();
};

describe('Cover', () => {
  const make = (scene: FakeScene, pct = 42) => new Cover(scene as never, 640, 366, { pct, setsDone: 2, setsTotal: 7 });

  it('shows the cover art with the title, the percentage written by hand and the sets', () => {
    const scene = makeFakeScene();
    make(scene);
    expect((scene.made.images as { key: string }[]).map((i) => i.key)).toEqual(['ui-notebook']);
    expect(texts(scene)).toEqual(expect.arrayContaining(['Mi álbum', 'Sets: 2 de 7']));
    expect(texts(scene).some((t) => String(t).startsWith('Llevas el'))).toBe(true);
  });

  it('counts the number up to the real percentage and then pops it', () => {
    const scene = makeFakeScene();
    const cover = make(scene);
    const count = scene.tweens.records.find((r) => 'value' in r.config)!;
    expect(count.config.value).toBe(42);
    finish(scene, (c) => 'value' in c);
    expect(texts(scene)).toContain('Llevas el 42 %');
    expect(cover.shownPct).toBe(0);
    expect(scene.tweens.records.some((r) => r.config.yoyo === true)).toBe(true);
  });

  it('writes the number at once with reduced motion', () => {
    const scene = makeFakeScene(true);
    make(scene);
    expect(scene.tweens.records.some((r) => 'value' in r.config)).toBe(false);
    expect(texts(scene)).toContain('Llevas el 42 %');
  });

  it('is lifted away (scaleX to 0), calls back once and is destroyed', () => {
    const scene = makeFakeScene();
    const cover = make(scene);
    const done = vi.fn();
    cover.openUp(done);
    cover.openUp(done);
    const lift = scene.tweens.records.filter((r) => r.config.scaleX === 0);
    expect(lift).toHaveLength(1);
    finish(scene, (c) => c.scaleX === 0);
    expect(done).toHaveBeenCalledTimes(1);
    expect((cover as unknown as { destroyed: boolean }).destroyed).toBe(true);
  });

  it('only fades with reduced motion', () => {
    const scene = makeFakeScene(true);
    const cover = make(scene);
    cover.openUp(() => undefined);
    expect(scene.tweens.records.some((r) => r.config.scaleX === 0)).toBe(false);
    expect(scene.tweens.records.some((r) => r.config.alpha === 0)).toBe(true);
  });
});

describe('MilestoneStamp', () => {
  const make = (scene: FakeScene, pct = 25) => {
    const calls = { land: 0, done: 0 };
    const stamp = new MilestoneStamp(scene as never, 640, 330, pct, { onLand: () => calls.land++, onDone: () => calls.done++ });
    return { stamp, calls };
  };

  it('writes the percentage and what it gives', () => {
    const scene = makeFakeScene();
    make(scene, 50);
    expect(texts(scene)).toEqual(expect.arrayContaining(['¡50 %!', 'Un fondo rayado para tus fotos']));
  });

  it('slams in big and tilted, and says so when it lands', () => {
    const scene = makeFakeScene();
    const { stamp, calls } = make(scene);
    expect(stamp.scale).toBe(2.6);
    expect(stamp.alpha).toBe(0);
    const slam = scene.tweens.records.find((r) => r.config.scale === 1)!;
    expect(slam.config.ease).toBe('Back.easeOut');
    expect(calls.land).toBe(0);
    finish(scene, (c) => c.scale === 1);
    expect(calls.land).toBe(1);
  });

  it('only fades in with reduced motion', () => {
    const scene = makeFakeScene(true);
    const { stamp } = make(scene);
    expect(stamp.scale).toBe(1);
    expect(scene.tweens.records.some((r) => r.config.scale === 1)).toBe(false);
    expect(scene.tweens.records.some((r) => r.config.alpha === 1)).toBe(true);
  });

  it('floats away when dismissed, tells it once and is destroyed', () => {
    const scene = makeFakeScene();
    const { stamp, calls } = make(scene);
    stamp.dismiss();
    stamp.dismiss();
    expect(stamp.isGone).toBe(true);
    finish(scene, (c) => c.alpha === 0);
    expect(calls.done).toBe(1);
    expect((stamp as unknown as { destroyed: boolean }).destroyed).toBe(true);
  });

  it('does not land after it was dismissed in the middle of the slam', () => {
    const scene = makeFakeScene();
    const { stamp, calls } = make(scene);
    stamp.dismiss();
    finish(scene, (c) => c.scale === 1);
    expect(calls.land).toBe(0);
  });
});
