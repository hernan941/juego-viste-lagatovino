import Phaser from 'phaser';
import { SfxKeys } from '../../constants';
import { getAudio } from '../../plugins/AudioPlugin';
import { hoverSfx } from '../hoverSfx';
import { addKitFeedback, kitHitRect } from '../ui';

/**
 * Makes an entry of the notebook answer to a tap (S5: no tooltip by hover, a finger has none). Pressing it shrinks `face`, hovering
 * grows the cell, and pressing and releasing on it calls `onTap` with a soft click. The touch area is at least 80 game px.
 */
export function makeTappable(cell: Phaser.GameObjects.Container, face: Phaser.GameObjects.Container, width: number, height: number, onTap: () => void): void {
  cell.setSize(width, height);
  cell.setInteractive({ hitArea: kitHitRect(width, height), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  addKitFeedback(cell, face);
  let pressed = false;
  cell.on('pointerover', (p: Phaser.Input.Pointer) => hoverSfx(cell.scene, p, 0.35));
  cell.on('pointerdown', () => { pressed = true; });
  cell.on('pointerout', () => { pressed = false; });
  cell.on('pointerup', () => {
    if (!pressed) return;
    pressed = false;
    getAudio(cell.scene).play(SfxKeys.Click);
    onTap();
  });
}
