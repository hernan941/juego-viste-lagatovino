import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, Ink, colorToNumber } from '../../constants';

const DIM = 0.38;

/**
 * The dim sheet behind a modal card (a purchase sheet, the cat sheet). `parent` must sit at the center of the screen. It swallows
 * every touch (nothing under it can be dragged or pressed) and calls `onTap` when the player taps outside the card. It fades in
 * by itself; a card that sits over it must catch its own touches (an interactive zone), so tapping the card does not close it.
 */
export function addBackdrop(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, onTap: () => void): Phaser.GameObjects.Rectangle {
  const dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, colorToNumber(Ink.tinta), 0).setInteractive();
  dim.on('pointerup', onTap);
  parent.add(dim);
  scene.tweens.add({ targets: dim, fillAlpha: DIM, duration: 200, ease: 'Sine.easeOut' });
  return dim;
}
