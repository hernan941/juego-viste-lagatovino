import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../constants';
import type { CatTally } from '../domain/catProgress';

const STAR_R = 11;

/** Five-pointed star (outer radius `r`) as points around (cx, cy). */
function starPoints(cx: number, cy: number, r: number): Phaser.Math.Vector2[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return new Phaser.Math.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  });
}

/**
 * What goes under a cat of the gallery (art-direction section 7): its best star with the number, and "♥ found/total" in Gaegu.
 * Centered on (x, y); with nothing to show (no progress yet) the container is empty.
 */
export function createTallyLabel(scene: Phaser.Scene, x: number, y: number, tally: CatTally): Phaser.GameObjects.Container {
  const parts: Phaser.GameObjects.GameObject[] = [];
  const style = { fontFamily: Fonts.Voice, fontSize: '22px', color: Ink.mutedTexto, padding: { x: 2, y: 4 } };
  const hearts = tally.tastes ? scene.add.text(0, 0, tally.tastes.label, style).setOrigin(0.5) : null;
  const starW = tally.stars ? STAR_R * 2 + 20 : 0;
  const heartsW = hearts ? hearts.width : 0;
  const total = starW + (starW && heartsW ? 10 : 0) + heartsW;
  let left = -total / 2;
  if (tally.stars) {
    const star = scene.add.graphics();
    const pts = starPoints(left + STAR_R, 0, STAR_R);
    star.fillStyle(colorToNumber(Ink.sol), 1).fillPoints(pts, true);
    star.lineStyle(2.5, colorToNumber(Ink.tinta), 1).strokePoints(pts, true);
    const n = scene.add
      .text(left + STAR_R * 2 + 4, 0, String(tally.stars), { fontFamily: Fonts.Title, fontSize: '22px', color: Ink.tinta, padding: { x: 2, y: 4 } })
      .setOrigin(0, 0.5);
    parts.push(star, n);
    left += starW + 10;
  }
  if (hearts) {
    hearts.setX(left + heartsW / 2);
    parts.push(hearts);
  }
  return scene.add.container(x, y, parts);
}
