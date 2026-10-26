// Where the top of the head of a dressed cat is, to screw the eyelet of the keychain in (ADR 0021).
import { topOfColumns } from '../../domain/imageBounds';
import type { CatDef, ClothingDef, Point } from '../../domain/types';
import { alphaMapOf } from '../alphaMap';
import type Phaser from 'phaser';

/** Columns around the middle of the canvas where the eyelet goes: wide enough to skip a thin pompom, narrow enough to skip the ears. */
const BAND = { from: 0.44, to: 0.56 };
/** Where the head is when nothing can be measured (px of the 512 canvas). */
const FALLBACK_Y = 70;
const CANVAS = 512;

/** The highest visible pixel, in the 512 canvas, of the cat and its worn items in the middle band (a tall hat raises it). */
export function headTop(scene: Phaser.Scene, cat: Pick<CatDef, 'texture'>, items: readonly Pick<ClothingDef, 'texture'>[]): Point {
  const tops = [cat.texture, ...items.map((i) => i.texture)]
    .map((key) => topOfColumns(alphaMapOf(scene, key), BAND.from, BAND.to))
    .filter((t): t is number => t !== null);
  return { x: CANVAS / 2, y: tops.length > 0 ? Math.min(...tops) * CANVAS : FALLBACK_Y };
}
