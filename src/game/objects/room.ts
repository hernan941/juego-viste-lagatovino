import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { hex } from './ui';

/**
 * The fitting room (art-direction section 7): paw print wallpaper, a big mirror with a soft golden frame and a round rug.
 * It is static, so it is drawn once into a texture (Graphics replays every shape each frame) per cat position.
 */
export function drawRoom(scene: Phaser.Scene, catX: number, feetY: number): Phaser.GameObjects.Image {
  const key = `room-bg-${catX}-${feetY}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(hex('rosa50'), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Paw print wallpaper: tiny lavender huellitas on a grid.
    g.fillStyle(hex('lavanda'), 0.45);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 17; col++) {
        const x = col * 80 + (row % 2 === 0 ? 20 : 60);
        const y = row * 84 + 30;
        g.fillEllipse(x, y + 4, 11, 9).fillCircle(x - 7, y - 4, 3).fillCircle(x - 2.5, y - 8, 3).fillCircle(x + 2.5, y - 8, 3).fillCircle(x + 7, y - 4, 3);
      }
    }
    // Big mirror with a soft golden frame.
    const mx = catX - 236;
    const my = 56;
    g.fillStyle(hex('rosa600'), 0.15).fillRoundedRect(mx + 4, my + 14, 472, 600, 52);
    g.fillStyle(hex('mantequilla'), 1).fillRoundedRect(mx, my, 472, 600, 52);
    g.lineStyle(6, 0xf5d86a, 1).strokeRoundedRect(mx, my, 472, 600, 52);
    g.fillStyle(hex('crema'), 1).fillRoundedRect(mx + 22, my + 22, 428, 556, 36);
    g.fillStyle(hex('cielo'), 0.35).fillRoundedRect(mx + 22, my + 22, 428, 556, 36);
    g.fillStyle(0xffffff, 0.45).fillRoundedRect(mx + 56, my + 56, 26, 190, 13).fillRoundedRect(mx + 96, my + 56, 12, 90, 6);
    // Round rug under the cat.
    g.fillStyle(hex('rosa600'), 0.18).fillEllipse(catX, feetY + 14, 360, 70);
    g.fillStyle(hex('rosa200'), 1).fillEllipse(catX, feetY + 6, 360, 70);
    g.lineStyle(5, hex('rosa400'), 1).strokeEllipse(catX, feetY + 6, 360, 70).strokeEllipse(catX, feetY + 6, 280, 46);
    g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(0);
}
