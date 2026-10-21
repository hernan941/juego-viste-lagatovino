// Silhouette icons of the wardrobe tabs (art-direction section 6: simple silhouette of the category,
// same outline as everything else). Drawn once into textures, like the particles.
import Phaser from 'phaser';
import { colorToNumber, Palette } from '../constants';
import type { Category } from '../domain/types';
import { hex } from './ui';

export const TAB_ICON_SIZE = 64;
export const tabIconKey = (category: Category | string): string => `tab-icon-${category}`;

const LINE = colorToNumber(Palette.contorno);

type Draw = (g: Phaser.GameObjects.Graphics) => void;

/** Fill + outline helpers: every shape gets the 4 px outline of the icons. */
const rr = (g: Phaser.GameObjects.Graphics, fill: number, x: number, y: number, w: number, h: number, r: number | Phaser.Types.GameObjects.Graphics.RoundedRectRadius) => {
  g.fillStyle(fill, 1).fillRoundedRect(x, y, w, h, r);
  g.lineStyle(4, LINE, 1).strokeRoundedRect(x, y, w, h, r);
};
const circle = (g: Phaser.GameObjects.Graphics, fill: number, x: number, y: number, r: number) => {
  g.fillStyle(fill, 1).fillCircle(x, y, r);
  g.lineStyle(4, LINE, 1).strokeCircle(x, y, r);
};
const ellipse = (g: Phaser.GameObjects.Graphics, fill: number, x: number, y: number, w: number, h: number) => {
  g.fillStyle(fill, 1).fillEllipse(x, y, w, h);
  g.lineStyle(4, LINE, 1).strokeEllipse(x, y, w, h);
};

/** An ellipse tilted by `rot` radians (Phaser's Graphics has no rotated ellipse): drawn as a polygon with the outline. */
const tiltedEllipse = (g: Phaser.GameObjects.Graphics, fill: number, cx: number, cy: number, rx: number, ry: number, rot: number) => {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return new Phaser.Math.Vector2(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot));
  });
  g.fillStyle(fill, 1).fillPoints(pts, true);
  g.lineStyle(4, LINE, 1).strokePoints(pts, true);
};

const ICONS: Record<string, Draw> = {
  // Sweater: long sleeves that hang down to ribbed cuffs, a round neck and a stripe (so it does not read as a T-shirt).
  sweater: (g) => {
    const pts = [[24, 8], [28, 12], [36, 12], [40, 8], [56, 14], [61, 46], [50, 48], [47, 30], [47, 56], [17, 56], [17, 30], [14, 48], [3, 46], [8, 14]]
      .map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillStyle(hex('mantequilla'), 1).fillPoints(pts, true);
    g.lineStyle(4, LINE, 1).strokePoints(pts, true);
    g.fillStyle(hex('crema'), 1).fillEllipse(32, 12, 14, 8);
    g.lineStyle(3, LINE, 1).strokeEllipse(32, 12, 14, 8);
    rr(g, hex('crema'), 49, 43, 14, 8, 3);
    rr(g, hex('crema'), 1, 43, 14, 8, 3);
    g.lineStyle(3, 0xf2c94c, 1).lineBetween(19, 44, 45, 44);
    g.lineStyle(3, 0xffffff, 0.9).lineBetween(24, 22, 24, 34);
  },
  // Beanie: dome, folded brim and pompon.
  head: (g) => {
    circle(g, hex('crema'), 32, 15, 7);
    rr(g, 0xf0707a, 14, 20, 36, 26, { tl: 18, tr: 18, bl: 4, br: 4 });
    rr(g, hex('crema'), 10, 40, 44, 12, 6);
    g.lineStyle(3, 0xffffff, 0.8).lineBetween(21, 28, 24, 24);
  },
  // Scarf: a U that wraps the neck, with a hanging end and fringe.
  neck: (g) => {
    rr(g, hex('menta'), 38, 28, 15, 26, 6);
    g.lineStyle(3, 0x6cc59a, 1).lineBetween(41, 56, 41, 61).lineBetween(45.5, 56, 45.5, 61).lineBetween(50, 56, 50, 61);
    g.lineStyle(3, 0x6cc59a, 1).lineBetween(38, 38, 53, 38);
    // The wrap: a thick U (outline first, then the color on top).
    g.lineStyle(17, LINE, 1).beginPath().arc(32, 20, 19, 0.15, Math.PI - 0.15).strokePath();
    g.lineStyle(10, hex('menta'), 1).beginPath().arc(32, 20, 19, 0.15, Math.PI - 0.15).strokePath();
    g.lineStyle(3, 0x6cc59a, 1).lineBetween(17, 30, 21, 26).lineBetween(26, 38, 28, 33).lineBetween(37, 38, 36, 33);
  },
  // Glasses: two round lenses with a bridge.
  face: (g) => {
    g.lineStyle(4, LINE, 1).lineBetween(26, 30, 38, 30).lineBetween(4, 28, 12, 30).lineBetween(60, 28, 52, 30);
    circle(g, hex('cielo'), 19, 33, 12);
    circle(g, hex('cielo'), 45, 33, 12);
    g.fillStyle(0xffffff, 0.9).fillCircle(15, 29, 3).fillCircle(41, 29, 3);
  },
  // Mitten: a ribbed cuff, a thumb that points up on a diagonal and a little heart.
  paws: (g) => {
    tiltedEllipse(g, hex('lavanda'), 13, 30, 7.5, 12, -0.6);
    rr(g, hex('lavanda'), 17, 12, 31, 36, { tl: 15, tr: 15, bl: 9, br: 9 });
    rr(g, hex('crema'), 16, 44, 33, 14, 5);
    g.lineStyle(3, 0xb7a5f2, 1).lineBetween(23, 46, 23, 56).lineBetween(32, 46, 32, 56).lineBetween(41, 46, 41, 56);
    g.fillStyle(hex('rosa400'), 1).fillCircle(29, 26, 4).fillCircle(37, 26, 4).fillTriangle(25, 28, 41, 28, 33, 38);
    g.fillStyle(0xffffff, 0.8).fillCircle(28, 24, 1.5);
  },
  // Balloon with its string.
  accessory: (g) => {
    g.lineStyle(3, LINE, 1).beginPath().moveTo(32, 46).lineTo(28, 54).lineTo(34, 60).strokePath();
    ellipse(g, 0xffc27d, 32, 25, 32, 38);
    g.fillStyle(0xffc27d, 1).fillTriangle(27, 49, 37, 49, 32, 44);
    g.lineStyle(4, LINE, 1).strokeTriangle(27, 49, 37, 49, 32, 44);
    g.fillStyle(0xffffff, 0.85).fillEllipse(24, 17, 6, 11);
  },
};

/** Generates one `tab-icon-<category>` texture per category (once per game). */
export function createTabIconTextures(scene: Phaser.Scene): void {
  for (const [category, draw] of Object.entries(ICONS)) {
    const key = tabIconKey(category);
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, TAB_ICON_SIZE, TAB_ICON_SIZE);
    g.destroy();
  }
}
