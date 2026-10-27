import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, Ink, colorToNumber } from '../../constants';
import { runwayStage } from '../../systems/runwayLayout';

const ink = (token: keyof typeof Ink) => colorToNumber(Ink[token]);

type P = { x: number; y: number };

/** Fills a closed polygon with the current fill style, and edges it with the current line style when `edge`. */
function polygon(g: Phaser.GameObjects.Graphics, pts: P[], edge: boolean) {
  g.beginPath().moveTo(pts[0]!.x, pts[0]!.y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath().fillPath();
  if (edge) g.strokePath();
}

/** A four-point sparkle drawn in pencil (the same ✦ the rest of the notebook uses). */
function pencilStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
  g.lineStyle(3, ink('lineaLapiz'), 0.9);
  g.lineBetween(x - r, y, x + r, y).lineBetween(x, y - r, x, y + r);
  g.lineStyle(2, ink('lineaLapiz'), 0.7);
  const d = r * 0.55;
  g.lineBetween(x - d, y - d, x + d, y + d).lineBetween(x - d, y + d, x + d, y - d);
}

/** A strip of washi tape across a corner of the stage. */
function tape(g: Phaser.GameObjects.Graphics, cx: number, cy: number, sign: 1 | -1) {
  const w = 74;
  const h = 26;
  const s = Math.sin((sign * 28 * Math.PI) / 180);
  const c = Math.cos((sign * 28 * Math.PI) / 180);
  const corner = (px: number, py: number) => ({ x: cx + px * c - py * s, y: cy + px * s + py * c });
  const pts = [corner(-w / 2, -h / 2), corner(w / 2, -h / 2), corner(w / 2, h / 2), corner(-w / 2, h / 2)];
  g.fillStyle(ink('rosa'), 0.85).lineStyle(2, ink('borde'), 1);
  polygon(g, pts, true);
}

/**
 * The runway as a page of the notebook (art-direction v2, ADR 0016): over the paper there is a pencil-drawn spotlight cone,
 * a kraft strip of paper taped under the cat's feet (the pasarela) and a few pencil sparkles. Static, so it is baked once
 * into a texture (Graphics replays every shape each frame). It only draws away from the exits and the judge's card.
 */
export function drawRunwayBackdrop(scene: Phaser.Scene, catX: number, feetY: number): Phaser.GameObjects.Image {
  const key = `runway-bg-${catX}-${feetY}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const stage = runwayStage(catX, feetY);
    // Spotlight: a highlighter-yellow cone from the top edge down to the strip, edged in pencil.
    const top = { l: catX - 70, r: catX + 70 };
    const bottom = { l: stage.x + 40, r: stage.x + stage.width - 40 };
    const cone = [{ x: top.l, y: 0 }, { x: top.r, y: 0 }, { x: bottom.r, y: stage.y + 6 }, { x: bottom.l, y: stage.y + 6 }];
    g.fillStyle(ink('sol'), 0.14);
    polygon(g, cone, false);
    g.lineStyle(3, ink('lineaLapiz'), 0.45);
    g.lineBetween(top.l, 0, bottom.l, stage.y + 6).lineBetween(top.r, 0, bottom.r, stage.y + 6);
    // The strip: flat card shadow, kraft paper, border, and a dashed pencil line down the middle.
    g.fillStyle(ink('sombraTarjeta'), 1).fillRoundedRect(stage.x + 4, stage.y + 4, stage.width, stage.height, 14);
    g.fillStyle(ink('kraft'), 1).fillRoundedRect(stage.x, stage.y, stage.width, stage.height, 14);
    g.lineStyle(3, ink('tinta'), 1).strokeRoundedRect(stage.x, stage.y, stage.width, stage.height, 14);
    g.lineStyle(2, ink('lineaLapiz'), 0.7);
    for (let x = stage.x + 34; x < stage.x + stage.width - 40; x += 26) g.lineBetween(x, stage.y + stage.height / 2, x + 12, stage.y + stage.height / 2);
    tape(g, stage.x + 12, stage.y + 6, -1);
    tape(g, stage.x + stage.width - 12, stage.y + 6, 1);
    // Pencil sparkles in the margins, clear of the card on the right and of the exits below.
    for (const [x, y, r] of [[70, 220, 14], [100, 430, 10], [690, 300, 12], [720, 470, 16], [620, 150, 9]] as const) pencilStar(g, x, y, r);
    g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(0);
}
