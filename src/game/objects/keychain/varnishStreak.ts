// The streak of varnish that crosses the keychain when it is "baked" (S8, ADR 0021). A filter or a mask cannot move inside a clip, so the
// streak is a flipbook: a few textures (the streak at N places along its path), each one clipped to the silhouette of the porcelain
// with the ERASE method (the mask filter does not clip with `render.maxTextures: 1`). They are half the size of the keychain: the
// streak is soft, nobody sees the difference, and seven of them cost about the same as one big texture. They live for ~1 s.
import Phaser from 'phaser';
import { KeychainTextures } from '../../constants';

const HALF = 0.5;
/** The streak art is 220 x 512; it is stretched to the height of the keychain. */
const ART_HEIGHT = 512;

function dynamic(scene: Phaser.Scene, key: string, width: number, height: number): Phaser.Textures.DynamicTexture {
  const texture = scene.textures.addDynamicTexture(key, width, height);
  if (!texture) throw new Error(`Could not create the texture "${key}"`);
  return texture;
}

/**
 * Bakes one frame per entry of `stops` (the x of the center of the streak, in px of the keychain texture) clipped to the silhouette
 * of `silhouetteKey` (`width` x `height`). Returns the keys, in order; `removeStreakFrames` frees them. The outside of the silhouette
 * (`inv`) is made once and shared by all the frames.
 */
export function bakeStreakFrames(scene: Phaser.Scene, silhouetteKey: string, width: number, height: number, stops: readonly number[]): string[] {
  const w = Math.ceil(width * HALF);
  const h = Math.ceil(height * HALF);
  const invKey = `${silhouetteKey}~streak-inv`;
  const keys: string[] = [];
  const objects: Phaser.GameObjects.Image[] = [];
  const image = (key: string, x: number, y: number) => {
    const img = new Phaser.GameObjects.Image(scene, x, y, key);
    objects.push(img);
    return img;
  };
  try {
    const inv = dynamic(scene, invKey, w, h);
    inv.fill(0xffffff);
    inv.erase(image(silhouetteKey, 0, 0).setOrigin(0, 0).setScale(HALF));
    inv.render();
    const invImg = image(invKey, 0, 0).setOrigin(0, 0);
    stops.forEach((x, i) => {
      const key = `${silhouetteKey}~streak~${i}`;
      keys.push(key);
      const out = dynamic(scene, key, w, h);
      out.draw(image(KeychainTextures.VarnishStreak, x * HALF, h / 2).setScale((height * HALF) / ART_HEIGHT));
      out.erase(invImg);
      out.render();
    });
    return keys;
  } catch (error) {
    removeStreakFrames(scene, keys);
    throw error;
  } finally {
    for (const o of objects) o.destroy();
    if (scene.textures.exists(invKey)) scene.textures.remove(invKey);
  }
}

export function removeStreakFrames(scene: Phaser.Scene, keys: readonly string[]): void {
  for (const key of keys) if (scene.textures.exists(key)) scene.textures.remove(key);
}
