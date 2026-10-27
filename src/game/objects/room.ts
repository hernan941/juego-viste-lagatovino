import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, Ink, colorToNumber } from '../constants';

const ink = (token: keyof typeof Ink) => colorToNumber(Ink[token]);

/** A four-point sparkle drawn in pencil (the same ✦ the rest of the notebook uses). */
function pencilStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
  g.lineStyle(3, ink('lineaLapiz'), 0.9);
  g.lineBetween(x - r, y, x + r, y).lineBetween(x, y - r, x, y + r);
  g.lineStyle(2, ink('lineaLapiz'), 0.7);
  const d = r * 0.55;
  g.lineBetween(x - d, y - d, x + d, y + d).lineBetween(x - d, y + d, x + d, y - d);
}

/** A strip of washi tape across a corner of the mirror. */
function tape(g: Phaser.GameObjects.Graphics, cx: number, cy: number, sign: 1 | -1) {
  const w = 84;
  const h = 28;
  const s = Math.sin((sign * 32 * Math.PI) / 180);
  const c = Math.cos((sign * 32 * Math.PI) / 180);
  const corner = (px: number, py: number) => ({ x: cx + px * c - py * s, y: cy + px * s + py * c });
  const pts = [corner(-w / 2, -h / 2), corner(w / 2, -h / 2), corner(w / 2, h / 2), corner(-w / 2, h / 2)];
  g.fillStyle(ink('sol'), 0.7).lineStyle(2, ink('borde'), 1);
  g.beginPath().moveTo(pts[0]!.x, pts[0]!.y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath().fillPath().strokePath();
}

/**
 * The fitting room as a page of the notebook (art-direction v2, section 7): over the paper there is a mirror with an ink frame
 * (a card with a flat shadow, a pale sky glass, white glints and a washi strip on its two bottom corners), a rug of `rosa` with an ink
 * edge and a pencil dashed ring under the cat, and a few pencil sparkles in the margins. Static, so it is baked once into a
 * transparent texture (Graphics replays every shape each frame) per cat position.
 */
export function drawRoom(scene: Phaser.Scene, catX: number, feetY: number): Phaser.GameObjects.Image {
  const key = `room-bg-v2-${catX}-${feetY}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    // Mirror: flat card shadow, white frame with an ink edge, and the glass inside.
    const mx = catX - 236;
    const my = 56;
    g.fillStyle(ink('sombraTarjeta'), 1).fillRoundedRect(mx + 6, my + 6, 472, 600, 40);
    g.fillStyle(ink('tarjeta'), 1).fillRoundedRect(mx, my, 472, 600, 40);
    g.lineStyle(4, ink('tinta'), 1).strokeRoundedRect(mx, my, 472, 600, 40);
    g.fillStyle(ink('cielo'), 0.45).fillRoundedRect(mx + 22, my + 22, 428, 556, 26);
    g.lineStyle(3, ink('tinta'), 1).strokeRoundedRect(mx + 22, my + 22, 428, 556, 26);
    g.fillStyle(0xffffff, 0.7).fillRoundedRect(mx + 56, my + 56, 24, 190, 12).fillRoundedRect(mx + 94, my + 56, 11, 90, 5.5);
    tape(g, mx + 40, my + 590, 1);
    tape(g, mx + 472 - 40, my + 590, -1);
    // Rug under the cat: rosa with an ink edge and a pencil dashed ring.
    g.fillStyle(ink('sombraTarjeta'), 1).fillEllipse(catX + 3, feetY + 11, 360, 70);
    g.fillStyle(ink('rosa'), 1).fillEllipse(catX, feetY + 6, 360, 70);
    g.lineStyle(4, ink('tinta'), 1).strokeEllipse(catX, feetY + 6, 360, 70);
    g.lineStyle(2, ink('lineaLapiz'), 0.8);
    for (let a = 0; a < Math.PI * 2; a += 0.34) {
      const rx = 138;
      const ry = 22;
      g.lineBetween(catX + Math.cos(a) * rx, feetY + 6 + Math.sin(a) * ry, catX + Math.cos(a + 0.17) * rx, feetY + 6 + Math.sin(a + 0.17) * ry);
    }
    // Pencil sparkles in the margins, clear of the two cards and the mirror.
    for (const [x, y, r] of [[mx - 14, 520, 11], [mx + 486, 150, 12], [mx + 482, 600, 9], [mx - 10, 90, 9]] as const) pencilStar(g, x, y, r);
    g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(0);
}
