import type Phaser from 'phaser';
import { SfxKeys } from '../constants';
import { getAudio } from '../plugins/AudioPlugin';

/** The soft hover tick, only for a mouse: a finger has no hover, its press already makes the sound. */
export function hoverSfx(scene: Phaser.Scene, pointer: Phaser.Input.Pointer | undefined, volume: number): void {
  if (pointer?.wasTouch) return;
  getAudio(scene).play(SfxKeys.Hover, { volume });
}
