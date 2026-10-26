import Phaser from 'phaser';
import { Fonts, Ink, colorToNumber } from '../../constants';

const INK = colorToNumber(Ink.tinta);

/**
 * Quiet hint label (art-direction section 6): a `tarjeta` pill with a 3 px ink border and Gaegu text, with the "skip" icon
 * (two triangles) drawn in code when asked. It only reads; it has no input. Centered on (x, y).
 */
export function makeHintPill(scene: Phaser.Scene, x: number, y: number, text: string, { skipIcon = false }: { skipIcon?: boolean } = {}): Phaser.GameObjects.Container {
  const label = scene.add.text(skipIcon ? 20 : 0, -1, text, { fontFamily: Fonts.Voice, fontSize: '28px', color: Ink.tinta, padding: { x: 2, y: 6 } }).setOrigin(0.5);
  const w = label.width + 48 + (skipIcon ? 40 : 0);
  const h = 52;
  const g = scene.add.graphics();
  g.fillStyle(colorToNumber(Ink.sombraTarjeta), 1).fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, h / 2);
  g.fillStyle(colorToNumber(Ink.tarjeta), 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(3, INK, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  const parts: Phaser.GameObjects.GameObject[] = [g, label];
  if (skipIcon) {
    const icon = scene.add.graphics();
    const cx = -w / 2 + 36;
    icon.fillStyle(INK, 1).fillTriangle(cx - 11, -9, cx - 11, 9, cx, 0).fillTriangle(cx, -9, cx, 9, cx + 11, 0);
    parts.push(icon);
  }
  return scene.add.container(x, y, parts);
}
