import { describe, expect, it, vi } from 'vitest';

// Phaser needs a browser to import; the photo only needs a few color helpers from it.
vi.mock('phaser', () => ({
  default: {
    Display: {
      Color: {
        Interpolate: { ColorWithColor: () => ({ r: 0, g: 0, b: 0 }) },
        ValueToColor: () => ({}),
        GetColor: () => 0,
      },
    },
  },
}));

import anchors from '../../src/game/data/anchors.json';
import { takePhoto } from '../../src/game/objects/photo';

/** An object that accepts any call (chained) and remembers nothing: graphics and texts of the photo. */
function anything(extra: Record<string, unknown> = {}) {
  const target: Record<string, unknown> = { width: 100, ...extra };
  return new Proxy(target, {
    get: (t, p, r) => (p in t ? Reflect.get(t, p, r) : () => r),
  });
}

function setup() {
  const log: string[] = [];
  const rt = anything({
    capture: () => log.push('capture'),
    render: () => log.push('render'),
    snapshot: (cb: (image: { src: string }) => void) => cb({ src: 'data:image/png;base64,AAAA' }),
    destroy: () => log.push('destroy'),
  });
  const scene = { make: { renderTexture: () => rt, graphics: () => anything(), text: () => anything() } };
  const cat = {
    freezeForPhoto: (pose: string) => {
      log.push(`freeze:${pose}`);
      return () => log.push('restore');
    },
  };
  return { log, scene, cat };
}

describe('takePhoto: the picture shows the pose the player sees (F7 bug: the PNG came out with the happy face, not the love eyes)', () => {
  it('freezes the cat in the pose before the capture and lets it go after the drawing', async () => {
    const { log, scene, cat } = setup();
    const url = await takePhoto(scene as never, cat as never, anchors as never, 'Luna', 'amor');
    expect(url).toBe('data:image/png;base64,AAAA');
    expect(log.indexOf('freeze:amor')).toBeGreaterThanOrEqual(0);
    expect(log.indexOf('freeze:amor')).toBeLessThan(log.indexOf('capture'));
    expect(log.indexOf('capture')).toBeLessThan(log.indexOf('render'));
    expect(log.indexOf('render')).toBeLessThan(log.indexOf('restore'));
  });

  it('uses the pose that it is given', async () => {
    const { log, scene, cat } = setup();
    await takePhoto(scene as never, cat as never, anchors as never, 'Luna', 'feliz');
    expect(log).toContain('freeze:feliz');
    expect(log).not.toContain('freeze:amor');
  });

  it('defaults to the love eyes of the photo pose', async () => {
    const { log, scene, cat } = setup();
    await takePhoto(scene as never, cat as never, anchors as never, 'Luna');
    expect(log).toContain('freeze:amor');
  });
});
