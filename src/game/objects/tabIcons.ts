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

const ICONS: Record<string, Draw> = {
  // Sweater: a T shape with sleeves and a round neck.
  sweater: (g) => {
    const pts = [[22, 9], [28, 13], [36, 13], [42, 9], [59, 24], [52, 34], [46, 29], [46, 55], [18, 55], [18, 29], [12, 34], [5, 24]]
      .map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillStyle(hex('mantequilla'), 1).fillPoints(pts, true);
    g.lineStyle(4, LINE, 1).strokePoints(pts, true);
    g.fillStyle(hex('crema'), 1).fillEllipse(32, 12, 14, 8);
    g.lineStyle(3, LINE, 1).strokeEllipse(32, 12, 14, 8);
    g.lineStyle(3, 0xf2c94c, 1).lineBetween(18, 46, 46, 46);
    g.lineStyle(3, 0xffffff, 0.9).lineBetween(24, 24, 24, 36);
  },
  // Beanie: dome, folded brim and pompon.
  head: (g) => {
    circle(g, hex('crema'), 32, 15, 7);
    rr(g, 0xf0707a, 14, 20, 36, 26, { tl: 18, tr: 18, bl: 4, br: 4 });
    rr(g, hex('crema'), 10, 40, 44, 12, 6);
    g.lineStyle(3, 0xffffff, 0.8).lineBetween(21, 28, 24, 24);
  },
  // Scarf: wrapped band with a hanging end.
  neck: (g) => {
    rr(g, hex('menta'), 36, 30, 14, 26, 6);
    rr(g, hex('menta'), 8, 18, 48, 18, 9);
    g.lineStyle(3, 0x6cc59a, 1).lineBetween(14, 22, 14, 32).lineBetween(24, 24, 24, 34).lineBetween(34, 24, 34, 34);
  },
  // Glasses: two round lenses with a bridge.
  face: (g) => {
    g.lineStyle(4, LINE, 1).lineBetween(26, 30, 38, 30).lineBetween(4, 28, 12, 30).lineBetween(60, 28, 52, 30);
    circle(g, hex('cielo'), 19, 33, 12);
    circle(g, hex('cielo'), 45, 33, 12);
    g.fillStyle(0xffffff, 0.9).fillCircle(15, 29, 3).fillCircle(41, 29, 3);
  },
  // Mitten: rounded body, thumb and cuff.
  paws: (g) => {
    ellipse(g, hex('lavanda'), 14, 36, 14, 20);
    rr(g, hex('lavanda'), 16, 18, 30, 36, { tl: 15, tr: 15, bl: 10, br: 10 });
    rr(g, hex('crema'), 15, 10, 32, 12, 5);
    g.lineStyle(3, 0xffffff, 0.8).lineBetween(24, 28, 24, 40);
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
