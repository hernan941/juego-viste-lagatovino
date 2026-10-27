import Phaser from 'phaser';
import { Fonts, Ink } from '../../constants';
import { albumLines } from '../../domain/copy/album';
import { Card } from '../kit/Card';
import { fitImage, silhouetteImage, sketchImage } from './pencil';

export interface EntryCardSpec {
  title: string;
  /** The art on top: its key and how it is drawn (the entry is yours, a pencil sketch or a faint silhouette). */
  art?: { key: string; look: 'color' | 'sketch' | 'silhouette'; size?: number; /** Art cut out for the sketch and the silhouette (a garment's worn texture). */ shape?: string };
  /** Lines of Gaegu under the title; `pencil` ones are written in pencil blue (what is missing). */
  lines: { text: string; pencil?: boolean }[];
  width?: number;
}

const PAD = 26;

/**
 * The card of an entry (S5): a loose card with its art, its name and what the notebook knows about it. Tapping an entry opens it
 * and tapping it closes it; the card pops in like every card of the kit.
 */
export function createEntryCard(scene: Phaser.Scene, spec: EntryCardSpec): Card {
  const width = spec.width ?? 380;
  const parts: Phaser.GameObjects.GameObject[] = [];
  let y = PAD;
  const artSize = spec.art?.size ?? 110;
  if (spec.art) {
    const alpha = spec.art.look === 'sketch' ? 0.55 : 0.35;
    const image: Phaser.GameObjects.Image | Phaser.GameObjects.Container =
      spec.art.look === 'color'
        ? fitImage(scene.add.image(0, 0, spec.art.key), artSize)
        : spec.art.shape
          ? silhouetteImage(scene, spec.art.shape, artSize, alpha)
          : sketchImage(scene, spec.art.key, artSize, alpha);
    image.setY(y + artSize / 2);
    parts.push(image);
    y += artSize + 12;
  }
  const title = scene.add.text(0, y, spec.title, { fontFamily: Fonts.Title, fontSize: '38px', color: Ink.tinta, align: 'center', wordWrap: { width: width - PAD * 2 }, padding: { x: 2, y: 6 } }).setOrigin(0.5, 0);
  parts.push(title);
  y += title.height + 8;
  for (const line of spec.lines) {
    const text = scene.add
      .text(0, y, line.text, { fontFamily: Fonts.Voice, fontSize: '26px', color: line.pencil ? Ink.lineaLapiz : Ink.tinta, align: 'center', wordWrap: { width: width - PAD * 2 }, padding: { x: 2, y: 4 } })
      .setOrigin(0.5, 0);
    parts.push(text);
    y += text.height + 2;
  }
  const close = scene.add.text(0, y + 12, albumLines.close, { fontFamily: Fonts.Voice, fontSize: '22px', color: Ink.mutedTexto, padding: { x: 2, y: 4 } }).setOrigin(0.5, 0);
  parts.push(close);
  const height = y + 12 + close.height + PAD;
  const card = new Card(scene, 0, 0, { width, height });
  // The parts were laid out from the top edge; the card is centered on its origin.
  for (const part of parts) (part as unknown as Phaser.GameObjects.Components.Transform).y -= height / 2;
  card.add(parts);
  card.setInteractive({ hitArea: new Phaser.Geom.Rectangle(0, 0, width, height), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  return card;
}
