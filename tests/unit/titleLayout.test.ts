import { describe, expect, it } from 'vitest';
import { ALBUM_BUTTON, START_BUTTON, haloBottom, haloToAlbumGap } from '../../src/game/domain/titleLayout';

describe('titleLayout: "Iniciar" and "Mi álbum" (Title)', () => {
  it('the halo of Iniciar, at its largest pulse, stays 16 px or more from the album button', () => {
    expect(haloBottom()).toBeGreaterThan(START_BUTTON.y + START_BUTTON.height / 2);
    expect(haloToAlbumGap()).toBeGreaterThanOrEqual(16);
  });

  it('the album button stays above the hill where the kittens peek', () => {
    expect(ALBUM_BUTTON.y + ALBUM_BUTTON.height / 2).toBeLessThan(600);
  });
});
