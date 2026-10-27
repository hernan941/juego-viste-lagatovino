import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';
import type { SetEntry } from '../../domain/albumEntries';
import { albumLines } from '../../domain/copy/album';
import type { EntryCardSpec } from './EntryCard';
import { fitImage, silhouetteImage } from './pencil';

/** A card of the sets sheet: a loose card on the half of the sheet (cell and box, game px). */
export const SET_CELL = { w: 380, h: 104 };
const BOX = { w: 366, h: 92 };
const MINI = 36;
const DOT = 10;
const PRIZE = 46;
const PIECES_Y = 24;

/** The washi of a card: a translucent `sol` strip on its top edge. */
function washi(scene: Phaser.Scene, x: number, angle: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(colorToNumber(Ink.sol), 0.7).fillRect(-30, -9, 60, 18);
  return g.setPosition(x, -BOX.h / 2).setAngle(angle);
}

/** What a piece looks like in the little row: yours in color, the rest as a pencil sketch (a dye is a dot of paint). */
function pieceView(scene: Phaser.Scene, piece: SetEntry['pieces'][number], x: number): Phaser.GameObjects.GameObject {
  if (piece.hex) {
    const dot = scene.add.graphics();
    if (piece.got) dot.fillStyle(colorToNumber(piece.hex), 1).fillCircle(0, 0, DOT).lineStyle(2.5, colorToNumber(Ink.borde), 1).strokeCircle(0, 0, DOT);
    else dot.lineStyle(2.5, colorToNumber(Ink.lineaLapiz), 0.7).strokeCircle(0, 0, DOT);
    return dot.setPosition(x, PIECES_Y);
  }
  if (piece.got) return fitImage(scene.add.image(0, 0, piece.icon ?? ''), MINI).setPosition(x, PIECES_Y);
  // Missing: the pencil shape of the garment (the icon has a card behind it and would fill as a square).
  return silhouetteImage(scene, piece.texture ?? piece.icon ?? '', MINI, 0.5).setPosition(x, PIECES_Y);
}

/**
 * The card of a set (L1): its name and "3 de 5", the pieces in a row (in color if they are yours, in pencil if they are missing),
 * and the prize of the photo mode on the right. A complete set carries a seal (a star) on its corner.
 */
export function buildSetCard(scene: Phaser.Scene, entry: SetEntry): Phaser.GameObjects.Container {
  const frame = scene.add.graphics();
  frame.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-BOX.w / 2 + 4, -BOX.h / 2 + 4, BOX.w, BOX.h, 16);
  frame.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-BOX.w / 2, -BOX.h / 2, BOX.w, BOX.h, 16);
  frame.lineStyle(3, colorToNumber(Ink.borde), 1).strokeRoundedRect(-BOX.w / 2, -BOX.h / 2, BOX.w, BOX.h, 16);
  const parts: Phaser.GameObjects.GameObject[] = [frame];
  const left = -BOX.w / 2 + 16;
  const pad = { padding: { x: 2, y: 6 } };
  const name = scene.add.text(left, -18, entry.name, { fontFamily: Fonts.Title, fontSize: '24px', color: Ink.tinta, ...pad }).setOrigin(0, 0.5);
  // The count follows the name, so a long name never runs into it.
  const count = scene.add.text(left + name.width + 8, -17, albumLines.setCount(entry.gotCount, entry.total), { fontFamily: Fonts.Voice, fontSize: '20px', color: entry.done ? Ink.tinta : Ink.lapiz, ...pad }).setOrigin(0, 0.5);
  parts.push(name, count);
  // The pieces: a row as long as the set asks (a dye is a small dot).
  const step = entry.pieces[0]?.hex ? DOT * 2 + 3 : MINI + 6;
  const first = entry.pieces[0]?.hex ? left + DOT : left + MINI / 2;
  entry.pieces.forEach((piece, i) => parts.push(pieceView(scene, piece, first + i * step)));
  // The prize, on the right: a little picture and its name (a set with no prize only says it is for showing off).
  const prize = entry.rewards[0];
  const prizeX = BOX.w / 2 - 66;
  const label = { fontFamily: Fonts.Voice, color: Ink.lapiz, align: 'center', wordWrap: { width: 108 }, padding: { x: 2, y: 2 } };
  if (prize) {
    parts.push(fitImage(scene.add.image(prizeX, -14, prize.texture), PRIZE));
    parts.push(scene.add.text(prizeX, 24, albumLines.setPrize(prize.kind, prize.name), { ...label, fontSize: '18px' }).setOrigin(0.5));
  } else {
    parts.push(scene.add.text(prizeX, 0, albumLines.setNoPrize, { ...label, fontSize: '20px' }).setOrigin(0.5));
  }
  if (entry.done) parts.push(scene.add.text(BOX.w / 2 - 16, -BOX.h / 2 + 16, '★', { fontFamily: Fonts.Title, fontSize: '30px', color: Ink.naranjo, ...pad }).setOrigin(0.5));
  parts.push(washi(scene, -BOX.w / 2 + 60, -3), washi(scene, BOX.w / 2 - 110, 2));
  return scene.add.container(0, 0, parts);
}

/** The card an entry of the sets sheet opens: how many pieces, what is missing and the prize. */
export function setCardSpec(entry: SetEntry): EntryCardSpec {
  const prize = entry.rewards[0];
  const missing = entry.pieces.filter((p) => !p.got).map((p) => p.label);
  const lines: EntryCardSpec['lines'] = [{ text: entry.done ? albumLines.setDone : albumLines.setCount(entry.gotCount, entry.total) }];
  if (!entry.done && missing.length > 0) lines.push({ text: albumLines.setMissing(missing), pencil: true });
  lines.push({ text: prize ? albumLines.setPrize(prize.kind, prize.name) : albumLines.setNoPrize });
  return { title: entry.name, art: prize ? { key: prize.texture, look: 'color', size: 96 } : undefined, lines };
}
