import Phaser from 'phaser';
import { Ink, colorToNumber } from '../../constants';
import { opaqueBounds } from '../alphaMap';

const PENCIL = colorToNumber(Ink.lineaLapiz);

/** Scales an image so its longest side measures `size` px. */
export function fitImage<T extends Phaser.GameObjects.Image>(image: T, size: number): T {
  image.setScale(size / Math.max(image.width, image.height));
  return image;
}

/**
 * What the album has not got yet, drawn as a pencil sketch (art-direction v2, S5): the same art as a flat `lineaLapiz` shape at half
 * opacity. A secret that is not won is the same shape, fainter.
 */
export function sketchImage(scene: Phaser.Scene, key: string, size: number, alpha = 0.5): Phaser.GameObjects.Image {
  const image = fitImage(scene.add.image(0, 0, key), size);
  image.setTint(PENCIL).setTintMode(Phaser.TintModes.FILL).setAlpha(alpha);
  return image;
}

/** A dashed pencil rectangle centered on (0, 0): the hole of something that is not in the notebook yet. */
export function dashedRect(g: Phaser.GameObjects.Graphics, width: number, height: number, dash = 10, gap = 7, alpha = 0.7): void {
  g.lineStyle(2.5, PENCIL, alpha);
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / length;
    const uy = (y2 - y1) / length;
    for (let at = 0; at < length; at += dash + gap) {
      const end = Math.min(at + dash, length);
      g.lineBetween(x1 + ux * at, y1 + uy * at, x1 + ux * end, y1 + uy * end);
    }
  };
  const x = width / 2;
  const y = height / 2;
  line(-x, -y, x, -y);
  line(x, -y, x, y);
  line(x, y, -x, y);
  line(-x, y, -x, -y);
}

/**
 * A pencil silhouette of a garment: the art worn on the cat (512 canvas, mostly empty), cropped to what is drawn and filled with the
 * pencil blue. A container, centered on its own (0, 0), so the caller can place it. Icons have a card behind them and would fill as a square.
 */
export function silhouetteImage(scene: Phaser.Scene, key: string, size: number, alpha = 0.5): Phaser.GameObjects.Container {
  const image = scene.add.image(0, 0, key);
  const b = opaqueBounds(scene, key);
  let scale = size / Math.max(image.width, image.height);
  if (b) {
    const w = b.width * image.width;
    const h = b.height * image.height;
    scale = size / Math.max(w, h);
    image.setCrop(b.x * image.width, b.y * image.height, w, h);
    // The crop keeps the frame's center: move the image so the middle of the crop lands on (0, 0).
    image.setPosition(-((b.x + b.width / 2) * image.width - image.width / 2) * scale, -((b.y + b.height / 2) * image.height - image.height / 2) * scale);
  }
  image.setScale(scale).setTint(PENCIL).setTintMode(Phaser.TintModes.FILL).setAlpha(alpha);
  return scene.add.container(0, 0, [image]);
}
