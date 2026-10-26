import Phaser from 'phaser';
import { Ink, TextureKeys, colorToNumber } from '../constants';

/** Draws the two particle textures (a heart and a sparkle) once, so no extra files are needed. */
export function createParticleTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TextureKeys.Heart)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xff8fb8, 1).lineStyle(3, 0x4a3036, 1);
    g.fillCircle(11, 11, 9).fillCircle(25, 11, 9).fillTriangle(3, 15, 33, 15, 18, 33);
    g.fillStyle(0xff8fb8, 1).fillCircle(11, 11, 8).fillCircle(25, 11, 8).fillTriangle(4, 15, 32, 15, 18, 31);
    g.fillStyle(0xffffff, 0.6).fillCircle(9, 8, 2.5);
    g.generateTexture(TextureKeys.Heart, 36, 36);
    g.destroy();
  }
  if (!scene.textures.exists(TextureKeys.Sparkle)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xfff0a8, 1).lineStyle(2, 0xf5d86a, 1);
    const points = [[18, 2], [22, 14], [34, 18], [22, 22], [18, 34], [14, 22], [2, 18], [14, 14]].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillPoints(points, true).strokePoints(points, true);
    g.generateTexture(TextureKeys.Sparkle, 36, 36);
    g.destroy();
  }
  if (!scene.textures.exists(TextureKeys.Snow)) {
    const g = scene.make.graphics({}, false);
    // A soft round flake (no cross: it must not look like a "+" button): a white dot with a halo and a thin lavender edge.
    g.fillStyle(0xffffff, 0.35).fillCircle(11, 11, 10);
    g.fillStyle(0xffffff, 1).fillCircle(11, 11, 7);
    g.lineStyle(2, 0xd8ccff, 1).strokeCircle(11, 11, 7);
    g.generateTexture(TextureKeys.Snow, 22, 22);
    g.destroy();
  }
  if (!scene.textures.exists(TextureKeys.Petal)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillEllipse(12, 8, 22, 13);
    g.lineStyle(2, 0xffffff, 0.6).strokeEllipse(12, 8, 22, 13);
    g.generateTexture(TextureKeys.Petal, 24, 16);
    g.destroy();
  }
  if (!scene.textures.exists(TextureKeys.Confetti)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, 14, 8, 2);
    g.generateTexture(TextureKeys.Confetti, 14, 8);
    g.destroy();
  }
  if (!scene.textures.exists(TextureKeys.InkSparkle)) {
    const g = scene.make.graphics({}, false);
    // A concave four-point star: sol fill with a 2 px ink outline.
    const points = [[20, 2], [23, 17], [38, 20], [23, 23], [20, 38], [17, 23], [2, 20], [17, 17]].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillStyle(colorToNumber(Ink.sol), 1).lineStyle(2, colorToNumber(Ink.tinta), 1);
    g.fillPoints(points, true).strokePoints(points, true);
    g.generateTexture(TextureKeys.InkSparkle, 40, 40);
    g.destroy();
  }
  if (!scene.textures.exists(TextureKeys.Scribble)) {
    const g = scene.make.graphics({}, false);
    // A tangled loop of ink: three overlapping rings that drift upward, like a scribbled-out thought.
    g.lineStyle(4, colorToNumber(Ink.tinta), 1);
    for (const [cx, cy, rx, ry] of [[28, 38, 20, 12], [40, 30, 18, 14], [32, 34, 26, 8]] as const) g.strokeEllipse(cx, cy, rx * 2, ry * 2);
    g.generateTexture(TextureKeys.Scribble, 68, 68);
    g.destroy();
  }
}
